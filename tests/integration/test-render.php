<?php
/**
 * Integration checks — run inside a real WordPress.
 *
 * WHY THESE ARE NOT PHPUNIT.
 *
 * They need a booted WordPress with the plugin active: a block registry, the
 * block parser, `do_blocks()`, and the real `esc_url()` / `wp_kses()` /
 * `get_block_wrapper_attributes()`. Stubbing those in a unit test would mean
 * asserting against our own assumptions rather than against WordPress.
 *
 * The standard answer is wp-env, which needs Docker. This runs against ANY
 * WordPress via wp-cli, including a Local site, so it works without Docker and
 * on CI. See tests/integration/README.md.
 *
 *   wp eval-file tests/integration/test-render.php
 *
 * Exits non-zero on the first failure, so it is usable as a gate.
 *
 * @package Zealblocks
 */

// Every notice, warning and deprecation counts as a failure — but only ours.
// A third-party plugin's deprecations are not this suite's business.
error_reporting( E_ALL );

$GLOBALS['plugin_notices'] = array();

set_error_handler(
	static function ( $errno, $message, $file, $line ) {
		if ( false !== strpos( $file, 'plugins/zealblocks' ) ) {
			$GLOBALS['plugin_notices'][] = sprintf( '%s in %s:%d', $message, basename( $file ), $line );
		}
		return false;
	},
	E_ALL
);

/*
 * A CLOSURE, not a global function, and counters captured by reference rather
 * than parked in $GLOBALS.
 *
 * Both of those were workarounds for the same thing: `wp eval-file` includes
 * this file from INSIDE a function, so a top-level assignment is a LOCAL
 * variable. A global function plus $GLOBALS sidestepped that — but a global
 * function in a file that runs inside WordPress is a name that can collide, and
 * naming it after the slug broke bin/rename.sh outright once the slug contained
 * a hyphen (`my-plugin_check` is not a valid function name).
 *
 * A closure defined and called in the same local scope needs neither hack.
 */
$passed = 0;
$failed = 0;

$check = static function ( $label, $condition ) use ( &$passed, &$failed ) {
	if ( $condition ) {
		++$passed;
		printf( "  \033[32mPASS\033[0m  %s\n", $label );
		return;
	}

	++$failed;
	printf( "  \033[31mFAIL\033[0m  %s\n", $label );
};

// ---------------------------------------------------------------------
echo "\nRegistration\n";
// ---------------------------------------------------------------------
$registry = WP_Block_Type_Registry::get_instance();

$check( 'zealblocks/buttons registered', $registry->is_registered( 'zealblocks/buttons' ) );
$check( 'zealblocks/button registered', $registry->is_registered( 'zealblocks/button' ) );

$button = $registry->get_registered( 'zealblocks/button' );

$check( 'button render callback is callable', $button && is_callable( $button->render_callback ) );
$check(
	'editor script handle resolved (script translations wired)',
	$button && ! empty( $button->editor_script_handles )
);
$check( 'button declares buttons as parent', $button && in_array( 'zealblocks/buttons', (array) $button->parent, true ) );

// ---------------------------------------------------------------------
echo "\nAutoloading and module registry\n";
// ---------------------------------------------------------------------
$check( 'interface Zealblocks\\Module autoloads', interface_exists( 'Zealblocks\\Module' ) );
$check( 'Zealblocks\\Block\\Registrar implements Module', in_array( 'Zealblocks\\Module', (array) class_implements( 'Zealblocks\\Block\\Registrar' ), true ) );
$check( 'module reachable after boot', Zealblocks\Plugin::module( Zealblocks\Block\Registrar::class ) instanceof Zealblocks\Block\Registrar );
$check( 'no legacy global class names remain', ! class_exists( 'Zealblocks_Blocks' ) && ! class_exists( 'Zealblocks_Block_Render' ) );
$check( 'pre-move class names are gone too', ! class_exists( 'Zealblocks\\Blocks' ) && ! class_exists( 'Zealblocks\\Block_Render' ) );
$check( 'sub-namespace classes autoload from includes/block/', class_exists( 'Zealblocks\\Block\\Render' ) );

// ---------------------------------------------------------------------
echo "\nRendering — the happy path\n";
// ---------------------------------------------------------------------
$good = '<!-- wp:zealblocks/buttons -->'
	. '<!-- wp:zealblocks/button {"text":"Click me","url":"https://example.org/?a=1&b=2","icon":"arrow",'
	. '"iconPosition":"left","linkTarget":"_blank","style":{"zealblocks":{"width":"200px","iconSize":"1.5em"},'
	. '"@tablet":{"zealblocks":{"width":"150px"}},"@mobile":{"zealblocks":{"width":"100%","iconSize":"2em"}}}} /-->'
	. '<!-- /wp:zealblocks/buttons -->';

$out = do_blocks( $good );

/*
 * The per-viewport CSS is no longer in the block's own output. render.php hands
 * the rules to the style engine under the 'zealblocks' context, and core
 * prints that store through wp_add_inline_style(). So the block markup is
 * checked for the ABSENCE of a <style> element, and the CSS is read back from
 * the store — which is where a reviewer running Plugin Check will expect it.
 */
$css = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );

$check( 'no <style> element in the block output (Plugin Review: use enqueue APIs)', false === stripos( $out, '<style' ) );
$check( 'block carries the scoping class the rules target', 1 === preg_match( '/class="[^"]*\bzealblocks-btn-[0-9a-f]{8}\b/', $out ) );
$check( 'rules reached the style-engine store', '' !== $css );
$check( 'base width emitted unwrapped', 1 === preg_match( '/width:\s*200px/', $css ) );
$check( 'tablet band emitted', false !== strpos( $css, '150px' ) );
$check( 'mobile band emitted', false !== strpos( $css, '100%' ) );
$check( 'icon size emitted as a custom property', false !== strpos( $css, '--zealblocks-button-icon-size' ) );
$check(
	"core's mutually exclusive ranges, not stacked max-width",
	false !== strpos( $css, 'width <= 480px' ) && false !== strpos( $css, '480px < width' )
);

// The whole path, end to end: the store is flushed by core into a real
// enqueued style handle, exactly as wp_enqueue_stored_styles() does on a page.
wp_enqueue_stored_styles();
ob_start();
wp_print_styles();
$printed = (string) ob_get_clean();

$check( 'store flushed through wp_add_inline_style() as one tag', false !== strpos( $printed, 'id="wp-style-engine-zealblocks-inline-css"' ) );
$check( 'flushed tag carries the base width', 1 === preg_match( '/width:\s*200px/', $printed ) );
$check( 'icon is aria-hidden', false !== strpos( $out, 'aria-hidden="true"' ) );
$check( 'viewBox casing preserved (wp_kses would lowercase it)', false !== strpos( $out, 'viewBox="0 0 20 20"' ) );
$check( 'left icon position class applied', false !== strpos( $out, 'has-icon-left' ) );
$check( 'noopener added for target=_blank', false !== strpos( $out, 'noopener' ) );

/*
 * THE REGRESSION THIS PINS. The guard used to fire only when rel was EMPTY, so
 * an author who typed `nofollow` into "Link rel" got
 * `<a target="_blank" rel="nofollow">` with no opener guard at all — the exact
 * reverse-tabnabbing case the code claims to prevent. Both tokens must survive.
 */
$union = do_blocks(
	'<!-- wp:zealblocks/buttons -->'
	. '<!-- wp:zealblocks/button {"text":"U","url":"https://ex.org",'
	. '"linkTarget":"_blank","rel":"nofollow"} /-->'
	. '<!-- /wp:zealblocks/buttons -->'
);

$check( "author's own rel token survives", false !== strpos( $union, 'nofollow' ) );
$check( 'noopener still added alongside it', false !== strpos( $union, 'noopener' ) );
$check( 'noreferrer still added alongside it', false !== strpos( $union, 'noreferrer' ) );
$check( 'ampersand not double-encoded', false === strpos( $out, '&amp;#038;' ) );
$check( 'inner blocks survived the container save', false !== strpos( $out, 'Click me' ) );
$check( 'no diagnostics readout in output', false === strpos( $out, 'stylesProbe' ) );

// ---------------------------------------------------------------------
echo "\nRendering — hostile input\n";
// ---------------------------------------------------------------------
$hostile = '<!-- wp:zealblocks/buttons -->'
	. '<!-- wp:zealblocks/button {"text":"Hi <script>alert(1)</script><img src=x onerror=alert(1)><strong>bold</strong>",'
	. '"url":"https://ex.org","icon":"arrow","linkTarget":"evil\" onmouseover=\"alert(1)",'
	. '"rel":"noopener\"><script>alert(1)</script>","title":"<script>alert(1)</script>tip",'
	. '"style":{"zealblocks":{"width":"expression(alert(1))"},"@mobile":{"zealblocks":{"width":"-50px"}}}} /-->'
	. '<!-- wp:zealblocks/button {"text":"T2","url":"javascript:alert(1)"} /-->'
	. '<!-- wp:zealblocks/button {"text":"T3","url":"data:text/html,<script>alert(1)</script>"} /-->'
	. '<!-- wp:zealblocks/button {"text":"T4","url":"https://ex.org","icon":"../../etc/passwd"} /-->'
	. '<!-- /wp:zealblocks/buttons -->';

$out = do_blocks( $hostile );

$check( 'no <script> anywhere', false === stripos( $out, '<script' ) );
$check( 'no onerror handler', false === stripos( $out, 'onerror' ) );
$check( 'no onmouseover handler', false === stripos( $out, 'onmouseover' ) );
$check( 'no <img> smuggled through the label', false === stripos( $out, '<img' ) );
$check( '<strong> kept — the allow-list is not a blanket strip', false !== strpos( $out, '<strong>bold</strong>' ) );
$check( 'unrecognised target dropped', false === strpos( $out, 'evil' ) );
$check( 'garbage rel token dropped whole', false === strpos( $out, 'noopenerscript' ) );
$check( 'title tags stripped, text kept', false !== strpos( $out, 'title="tip"' ) );
$css = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );

$check( 'expression() rejected — not in markup', false === stripos( $out, 'expression(' ) );
$check( 'expression() rejected — not in the store either', false === stripos( $css, 'expression(' ) );
$check( 'negative width rejected — not in the store', false === strpos( $css, '-50px' ) );
$check( 'javascript: url -> <button>, never href=""', false === stripos( $out, 'javascript:' ) && false === strpos( $out, 'href=""' ) );
$check( 'data: url rejected', false === stripos( $out, 'data:text/html' ) );
$check( 'unknown icon key ignored', false === strpos( $out, 'passwd' ) );
$check( 'hostile block emitted no <style> element at all', false === stripos( $out, '<style' ) );

// ---------------------------------------------------------------------
echo "\nIcon — core's icon registry\n";
// ---------------------------------------------------------------------
$check( 'zealblocks/icon registered', $registry->is_registered( 'zealblocks/icon' ) );
$check( "core's wp_get_icon() is available", function_exists( 'wp_get_icon' ) );

$out = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled"} /-->' );

$check( 'renders an SVG from the registry', false !== strpos( $out, '<svg' ) );
$check( 'wrapped for block supports', false !== strpos( $out, 'wp-block-zealblocks-icon' ) );

/*
 * The accessibility branch is core's, and it is the reason for using
 * wp_get_icon() rather than emitting SVG by hand: an unlabelled icon is
 * decoration and must be hidden from assistive technology, a labelled one is
 * content and must be announced.
 */
$check(
    'no label -> aria-hidden + focusable=false',
    false !== strpos( $out, 'aria-hidden="true"' ) && false !== strpos( $out, 'focusable="false"' )
);

$labelled = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled","label":"Rating"} /-->' );

$check(
    'label -> role=img + aria-label',
    false !== strpos( $labelled, 'role="img"' ) && false !== strpos( $labelled, 'aria-label="Rating"' )
);
$check( 'a labelled icon is NOT aria-hidden', false === strpos( $labelled, 'aria-hidden' ) );

// Flip and rotation belong on the SVG, not the wrapper: a transform on the
// wrapper would rotate any background, border and padding with it.
$flipped = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/arrow-right","flipHorizontal":true,"flipVertical":true} /-->' );

$check( 'flip classes land on the svg', 1 === preg_match( '/<svg[^>]*is-flip-horizontal is-flip-vertical/', $flipped ) );
$check( 'flip classes are NOT on the wrapper', 1 !== preg_match( '/<div[^>]*is-flip-horizontal/', $flipped ) );

$rotated = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/arrow-right","rotation":90} /-->' );
$check( 'rotation emitted on the svg', 1 === preg_match( '/<svg[^>]*rotate:90deg/', $rotated ) );

// Normalisation: a stored value outside 0-359 must not emit a meaningless
// declaration, and a negative must resolve to its positive equivalent.
$check( '720 normalises to no rotation', false === strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/arrow-right","rotation":720} /-->' ), 'rotate:' ) );
$check( '-90 normalises to 270deg', false !== strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/arrow-right","rotation":-90} /-->' ), 'rotate:270deg' ) );

// ---------------------------------------------------------------------
echo "\nIcon — block by default, inline on request\n";
// ---------------------------------------------------------------------
/*
 * An icon is usually its own element, so block-level is the default and inline
 * is opt-in. Asserted because the class is what the CSS keys off — a silent
 * change here would alter every icon's layout on every site.
 */
$block_level = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled"} /-->' );
$inline      = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled","isInline":true} /-->' );

$check( 'default emits no is-inline class', false === strpos( $block_level, 'is-inline' ) );
$check( 'isInline true emits is-inline', false !== strpos( $inline, 'is-inline' ) );
$check(
    'isInline false is the same as omitting it',
    ( false === strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled","isInline":false} /-->' ), 'is-inline' ) )
);
$check(
    'is-inline composes with rotation and a width',
    1 === preg_match( '/<div[^>]*is-inline/', do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled","isInline":true,"rotation":90,"style":{"dimensions":{"width":"32px"}}} /-->' ) )
);

// ---------------------------------------------------------------------
echo "\nIcon — the icon name is resolved by core, which is the validation\n";
// ---------------------------------------------------------------------
/*
 * There is no allow-list in render.php on purpose. wp_get_icon() returns ''
 * for anything not in WP_Icons_Registry, so an unregistered or hostile name
 * cannot produce markup at all. This asserts that property rather than
 * assuming it.
 */
$hostile = array(
    'unregistered'     => 'core/does-not-exist',
    'unnamespaced'     => 'star-filled',
    'path traversal'   => '../../wp-config',
    'script injection' => 'core/x"><script>alert(1)</script>',
    'raw svg tag'      => '<svg onload=alert(1)>',
    'empty'            => '',
);
$all_empty = true;

foreach ( $hostile as $why => $name ) {
    $result = trim( do_blocks( '<!-- wp:zealblocks/icon ' . wp_json_encode( array( 'icon' => $name ) ) . ' /-->' ) );

    if ( '' !== $result ) {
        $all_empty = false;
        printf( "        leaked (%s): %s\n", $why, substr( $result, 0, 60 ) );
    }
}

$check( 'every unresolvable or hostile icon name renders nothing', $all_empty );

$escaped = do_blocks( '<!-- wp:zealblocks/icon {"icon":"core/star-filled","label":"\"><script>alert(1)</script>"} /-->' );
$check( 'a hostile label cannot break out of the attribute', false === stripos( $escaped, '<script' ) );

// ---------------------------------------------------------------------
echo "\nText — visual presets\n";
// ---------------------------------------------------------------------
$check( 'zealblocks/text registered', $registry->is_registered( 'zealblocks/text' ) );

$out = do_blocks( '<!-- wp:zealblocks/text {"styleAs":"caption","content":"Title"} /-->' );

$check( 'renders a paragraph', false !== strpos( $out, '<p' ) );
$check( 'visual preset applied as a class', false !== strpos( $out, 'has-style-caption' ) );
$check( 'preset is a CLASS, not an inline font-size', false === strpos( $out, 'font-size:' ) );

$check(
	'an unknown preset is dropped rather than emitted',
	false === strpos( do_blocks( '<!-- wp:zealblocks/text {"styleAs":"evil\" onmouseover=\"x","content":"X"} /-->' ), 'onmouseover' )
);
$check(
	'and leaves no orphan class behind',
	false === strpos( do_blocks( '<!-- wp:zealblocks/text {"styleAs":"nonsense","content":"X"} /-->' ), 'has-style-' )
);

/*
 * A configurable HTML tag is out of scope for now, so the element is fixed.
 * Asserted rather than assumed: if a tag attribute is ever reintroduced, it
 * lands in an ELEMENT POSITION and becomes an XSS boundary, and this check
 * failing is the reminder to validate it against an allow-list.
 */
$out = do_blocks( '<!-- wp:zealblocks/text {"tagName":"script","content":"X"} /-->' );

$check( 'a stray tagName attribute is ignored entirely', false === stripos( $out, '<script' ) && false !== strpos( $out, '<p' ) );

// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
echo "\nText — content survives a save/load round trip\n";
// ---------------------------------------------------------------------
/*
 * THE TEST THAT WAS MISSING.
 *
 * Every other check here hand-writes the block delimiter, which quietly
 * guarantees the attribute is present. That is not what the editor does, so it
 * could not catch the bug it was hiding: `content` was declared with
 * `"source": "rich-text"`, which tells core to parse the value back out of the
 * SAVED MARKUP — and with `save: () => null` there is no markup, so the text
 * was written nowhere and the block rendered empty on the front end.
 *
 * serialize_blocks() is the PHP mirror of the JS serializer, so going
 * attributes -> serialize -> parse -> render exercises the real path.
 */
$round_trip = serialize_blocks(
	array(
		array(
			'blockName'    => 'zealblocks/text',
			'attrs'        => array(
				'content' => 'Round trip text',
				'styleAs' => 'eyebrow',
			),
			'innerBlocks'  => array(),
			'innerHTML'    => '',
			'innerContent' => array(),
		),
	)
);

$check(
	'content is serialised into the block delimiter',
	false !== strpos( $round_trip, 'Round trip text' )
);

$out = do_blocks( $round_trip );

$check( 'content survives serialise -> parse -> render', false !== strpos( $out, 'Round trip text' ) );
$check( 'styleAs survives the round trip', false !== strpos( $out, 'has-style-eyebrow' ) );

/*
 * And the same thing through a real post and the_content, because that is the
 * path a visitor actually hits.
 */
$probe_id = wp_insert_post(
	array(
		'post_title'   => 'Zealblocks integration probe',
		'post_status'  => 'publish',
		'post_type'    => 'post',
		'post_content' => $round_trip,
	)
);

if ( $probe_id && ! is_wp_error( $probe_id ) ) {
	$probe_post = get_post( $probe_id );
	$front_end  = apply_filters( 'the_content', $probe_post->post_content );

	$check( 'content is visible through the_content on a real post', false !== strpos( $front_end, 'Round trip text' ) );

	wp_delete_post( $probe_id, true );
} else {
	$check( 'could create a probe post', false );
}

// ---------------------------------------------------------------------
echo "\nEdge cases\n";
// ---------------------------------------------------------------------
$check(
	'empty label renders nothing at all',
	'' === trim( do_blocks( '<!-- wp:zealblocks/button {"text":"  "} /-->' ) )
);
$check(
	'empty container renders nothing at all',
	'' === trim( do_blocks( '<!-- wp:zealblocks/buttons --><!-- /wp:zealblocks/buttons -->' ) )
);
$check(
	'empty text renders nothing at all',
	'' === trim( do_blocks( '<!-- wp:zealblocks/text {"content":"  "} /-->' ) )
);

// ---------------------------------------------------------------------
echo "\nIcon collection\n";
// ---------------------------------------------------------------------
$collections = wp_list_pluck( WP_Icon_Collections_Registry::get_instance()->get_all_registered(), 'label', 'slug' );

$check(
	'collection is registered under the plugin slug',
	isset( $collections[ ZEALBLOCKS_SLUG ] )
);
$check(
	'collection label is the display name, not the slug',
	'Zeal Icons' === ( $collections[ ZEALBLOCKS_SLUG ] ?? '' )
);

/*
 * THE CHECK THAT EARNS ITS KEEP.
 *
 * WP_Icons_Registry::sanitize_icon_content() is wp_kses with a three-tag
 * allow-list — svg, path, polygon — and it fails SILENTLY: an icon drawn with
 * <circle>, <rect> or strokes registers happily, appears in the library, and
 * renders as an empty box. Nothing in core reports it. So asserting "is
 * registered" proves nothing; the only meaningful assertion is that drawable
 * markup survives the sanitiser.
 */
foreach ( Zealblocks\Icons::ICONS as $icon_slug ) {
	$icon_name = ZEALBLOCKS_SLUG . '/' . $icon_slug;
	$markup    = wp_get_icon( $icon_name, array( 'size' => 24 ) );

	$check(
		sprintf( '%s survives the SVG sanitiser with a drawable path', $icon_name ),
		false !== strpos( $markup, '<path' ) && 1 === preg_match( '/width="24"/', $markup )
	);
}

/*
 * The editor reaches icons over REST, and that route is permission-gated on
 * `edit_posts` — with no current user the request 401s and proves nothing. So
 * borrow an administrator for the one call and put the global back, because
 * the checks after this one must not inherit a logged-in user.
 */
$previous_user = get_current_user_id();
$administrator = get_users(
	array(
		'role'   => 'administrator',
		'number' => 1,
		'fields' => 'ID',
	)
);

if ( empty( $administrator ) ) {
	$check( 'a user exists to exercise the REST route with', false );
} else {
	wp_set_current_user( (int) $administrator[0] );

	$icon_response = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/icons/' . ZEALBLOCKS_SLUG ) );

	$check(
		'REST serves the whole collection to the editor',
		200 === $icon_response->get_status()
			&& count( Zealblocks\Icons::ICONS ) === count( $icon_response->get_data() )
	);

	wp_set_current_user( $previous_user );
}

// ---------------------------------------------------------------------
echo "\nPHP notices from plugin files\n";
// ---------------------------------------------------------------------
$notices = array_unique( $GLOBALS['plugin_notices'] );

$check( 'no notices, warnings or deprecations', empty( $notices ) );

foreach ( $notices as $notice ) {
	printf( "        %s\n", $notice );
}

// ---------------------------------------------------------------------
printf( "\n%d passed, %d failed\n\n", $passed, $failed );

if ( $failed > 0 ) {
	exit( 1 );
}
