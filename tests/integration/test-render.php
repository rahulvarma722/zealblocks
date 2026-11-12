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
	. '<!-- wp:zealblocks/button {"text":"Click me","url":"https://example.org/?a=1&b=2","icon":"arrow-right",'
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
$check( 'viewBox casing preserved (wp_kses would lowercase it)', false !== strpos( $out, 'viewBox="0 0 512 512"' ) );
$check( 'left icon position class applied', false !== strpos( $out, 'has-icon-left' ) );
$check( 'noopener added for target=_blank', false !== strpos( $out, 'noopener' ) );
$check( 'no RTL flip class unless asked for', false === strpos( $out, 'has-rtl-flip' ) );

/*
 * RTL MIRRORING is opt-in, and only means anything when there is an icon to
 * mirror. The class is all the front end needs: style.scss gates the transform
 * on [dir=rtl], so this costs an LTR page nothing.
 */
$rtl_flipped = do_blocks( '<!-- wp:zealblocks/button {"text":"Back","url":"https://ex.org","icon":"arrow-right","flipForRTL":true} /-->' );
$rtl_no_icon = do_blocks( '<!-- wp:zealblocks/button {"text":"Back","url":"https://ex.org","flipForRTL":true} /-->' );

$check( 'flipForRTL adds the class', false !== strpos( $rtl_flipped, 'has-rtl-flip' ) );
$check( 'flipForRTL is inert without an icon', false === strpos( $rtl_no_icon, 'has-rtl-flip' ) );

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
	. '"url":"https://ex.org","icon":"arrow-right","linkTarget":"evil\" onmouseover=\"alert(1)",'
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
echo "\nIcon — the plugin's own icon library\n";
// ---------------------------------------------------------------------
$check( 'zealblocks/icon registered', $registry->is_registered( 'zealblocks/icon' ) );
$check( 'Icon_Library resolves a slug', null !== Zealblocks\Icon_Handler\Library::get( 'star' ) );

$out = do_blocks( '<!-- wp:zealblocks/icon {"icon":"star"} /-->' );

$check( 'renders an SVG from the library', false !== strpos( $out, '<svg' ) );
$check( 'wrapped for block supports', false !== strpos( $out, 'wp-block-zealblocks-icon' ) );

/*
 * The accessibility branch lives in Icon_Library::render(), and the editor's
 * <Icon> mirrors it: an unlabelled icon is decoration and must be hidden from
 * assistive technology, a labelled one is content and must be announced. Both
 * blocks get it from the same place, so neither can drift.
 */
$check(
    'no label -> aria-hidden + focusable=false',
    false !== strpos( $out, 'aria-hidden="true"' ) && false !== strpos( $out, 'focusable="false"' )
);

$labelled = do_blocks( '<!-- wp:zealblocks/icon {"icon":"star","label":"Rating"} /-->' );

$check(
    'label -> role=img + aria-label',
    false !== strpos( $labelled, 'role="img"' ) && false !== strpos( $labelled, 'aria-label="Rating"' )
);
$check( 'a labelled icon is NOT aria-hidden', false === strpos( $labelled, 'aria-hidden' ) );

// Flip and rotation belong on the SVG, not the wrapper: a transform on the
// wrapper would rotate any background, border and padding with it.
$flipped = do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","flipHorizontal":true,"flipVertical":true} /-->' );

$check( 'flip classes land on the svg', 1 === preg_match( '/<svg[^>]*is-flip-horizontal is-flip-vertical/', $flipped ) );
$check( 'flip classes are NOT on the wrapper', 1 !== preg_match( '/<div[^>]*is-flip-horizontal/', $flipped ) );

$rotated = do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","rotation":90} /-->' );
$check( 'rotation emitted on the svg', 1 === preg_match( '/<svg[^>]*rotate:90deg/', $rotated ) );

// Normalisation: a stored value outside 0-359 must not emit a meaningless
// declaration, and a negative must resolve to its positive equivalent.
$check( '720 normalises to no rotation', false === strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","rotation":720} /-->' ), 'rotate:' ) );
$check( '-90 normalises to 270deg', false !== strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","rotation":-90} /-->' ), 'rotate:270deg' ) );

// ---------------------------------------------------------------------
echo "\nIcon — block by default, inline on request\n";
// ---------------------------------------------------------------------
/*
 * An icon is usually its own element, so block-level is the default and inline
 * is opt-in. Asserted because the class is what the CSS keys off — a silent
 * change here would alter every icon's layout on every site.
 */
$block_level = do_blocks( '<!-- wp:zealblocks/icon {"icon":"star"} /-->' );
$inline      = do_blocks( '<!-- wp:zealblocks/icon {"icon":"star","isInline":true} /-->' );

$check( 'default emits no is-inline class', false === strpos( $block_level, 'is-inline' ) );
$check( 'isInline true emits is-inline', false !== strpos( $inline, 'is-inline' ) );
$check(
    'isInline false is the same as omitting it',
    ( false === strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"star","isInline":false} /-->' ), 'is-inline' ) )
);
$check(
    'is-inline composes with rotation and a width',
    1 === preg_match( '/<div[^>]*is-inline/', do_blocks( '<!-- wp:zealblocks/icon {"icon":"star","isInline":true,"rotation":90,"style":{"dimensions":{"width":"32px"}}} /-->' ) )
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
    'unregistered'     => 'does-not-exist',
    'unnamespaced'     => 'star-filled',
    'path traversal'   => '../../wp-config',
    'script injection' => 'x"><script>alert(1)</script>',
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

$escaped = do_blocks( '<!-- wp:zealblocks/icon {"icon":"star","label":"\"><script>alert(1)</script>"} /-->' );
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

// ---------------------------------------------------------------------
echo "\nText — HTML tag\n";
// ---------------------------------------------------------------------
/*
 * The tag lands in an ELEMENT POSITION, so it is an XSS boundary. render.php
 * validates it against an allow-list; these pin that a hostile value falls back
 * to a paragraph and a listed one is honoured.
 */
$out = do_blocks( '<!-- wp:zealblocks/text {"tagName":"script","content":"X"} /-->' );
$check( 'a tag outside the allow-list falls back to <p>', false === stripos( $out, '<script' ) && false !== strpos( $out, '<p' ) );

$out = do_blocks( '<!-- wp:zealblocks/text {"tagName":"h2","styleAs":"caption","content":"X"} /-->' );
$check( 'an allowed tag is rendered', 0 === strpos( trim( $out ), '<h2' ) && false !== strpos( $out, '</h2>' ) );
$check( 'the visual preset still applies on top of the tag', false !== strpos( $out, 'has-style-caption' ) );

// ---------------------------------------------------------------------
echo "\nText — drop cap\n";
// ---------------------------------------------------------------------
$check( 'drop cap class on a paragraph', false !== strpos( do_blocks( '<!-- wp:zealblocks/text {"dropCap":true,"content":"X"} /-->' ), 'has-drop-cap' ) );
$check( 'no drop cap on a span', false === strpos( do_blocks( '<!-- wp:zealblocks/text {"dropCap":true,"tagName":"span","content":"X"} /-->' ), 'has-drop-cap' ) );
$check( 'no drop cap on centred text', false === strpos( do_blocks( '<!-- wp:zealblocks/text {"dropCap":true,"style":{"typography":{"textAlign":"center"}},"content":"X"} /-->' ), 'has-drop-cap' ) );

// ---------------------------------------------------------------------
echo "\nText — per-viewport shadow, gap and hover\n";
// ---------------------------------------------------------------------
$out = do_blocks(
	'<!-- wp:zealblocks/text {"content":"X","style":{"zealblocks":{"columnGap":"2em","textShadowX":"-2px",'
	. '"textShadowColor":"rgba(0,0,0,0.3)","textHover":"#ff0000","backgroundHover":"linear-gradient(90deg,#000 0%,#fff 100%)"},'
	. '"@mobile":{"zealblocks":{"textHover":"#00ff00","textShadowColor":"url(x)"}}}} /-->'
);
$css = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );

$check( 'scoping class on the text block', 1 === preg_match( '/class="[^"]*\bzealblocks-text-[0-9a-f]{8}\b/', $out ) );
$check( 'shadow class switched on', false !== strpos( $out, 'has-text-shadow' ) );
$check( 'hover class switched on', false !== strpos( $out, 'has-hover' ) );
$check( 'no <style> element in the text output', false === stripos( $out, '<style' ) );
$check( 'column gap emitted', 1 === preg_match( '/column-gap:\s*2em/', $css ) );
$check( 'negative shadow offset emitted', false !== strpos( $css, '--zealblocks-text-shadow-x:-2px' ) || false !== strpos( $css, '--zealblocks-text-shadow-x: -2px' ) );
$check( 'hover colour is an important :hover rule', 1 === preg_match( '/:hover\{[^}]*color:\s*#ff0000\s*!important/', $css ) );
$check( 'gradient hover emitted as the background shorthand', 1 === preg_match( '/background:\s*linear-gradient\(90deg,#000 0%,#fff 100%\)\s*!important/', $css ) );
$check( 'mobile hover colour emitted in its band', false !== strpos( $css, '#00ff00' ) );
$check( 'an unsafe value is dropped, not printed', false === strpos( $css, 'url(x)' ) );

// ---------------------------------------------------------------------
echo "\nText — extended tags, position and z-index\n";
// ---------------------------------------------------------------------
$check( 'figcaption tag accepted', 0 === strpos( trim( do_blocks( '<!-- wp:zealblocks/text {"tagName":"figcaption","content":"X"} /-->' ) ), '<figcaption ' ) );
$check( 'bdo tag accepted', 0 === strpos( trim( do_blocks( '<!-- wp:zealblocks/text {"tagName":"bdo","content":"X"} /-->' ) ), '<bdo ' ) );
$check( 'iframe tag refused', 0 === strpos( trim( do_blocks( '<!-- wp:zealblocks/text {"tagName":"iframe","content":"X"} /-->' ) ), '<p ' ) );

$out = do_blocks(
	'<!-- wp:zealblocks/text {"content":"X","style":{"zealblocks":{"zIndex":"5","position":"absolute","positionTop":"-10px","overflow":"hidden"},'
	. '"@tablet":{"zealblocks":{"position":"sticky","zIndex":"9;color:red"}}}} /-->'
);
$css = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );

$check( 'z-index class on the block', false !== strpos( $out, 'has-zealblocks-z-index' ) );
$check( 'z-index emitted', 1 === preg_match( '/z-index:\s*5/', $css ) );
$check( 'position and negative offset emitted', 1 === preg_match( '/position:\s*absolute/', $css ) && 1 === preg_match( '/top:\s*-10px/', $css ) );
$check( 'overflow emitted', 1 === preg_match( '/overflow:\s*hidden/', $css ) );
$check( 'sticky refused', false === strpos( $css, 'sticky' ) );
$check( 'injected z-index refused', false === strpos( $css, 'color:red' ) );

// ---------------------------------------------------------------------
echo "\nText — entrance animation\n";
// ---------------------------------------------------------------------
wp_dequeue_script( 'zealblocks-text-view-script' );
do_blocks( '<!-- wp:zealblocks/text {"content":"X"} /-->' );
$check( 'view script NOT loaded for a plain text block', ! wp_script_is( 'zealblocks-text-view-script', 'enqueued' ) );
$check( 'view script still registered', wp_script_is( 'zealblocks-text-view-script', 'registered' ) );

$out = do_blocks( '<!-- wp:zealblocks/text {"content":"X","animationType":"zoom-in-up","animationDuration":99999,"animationDelay":-5,"animationEasing":"steps(1)","animationRepeat":true} /-->' );
$check( 'animation data attribute', false !== strpos( $out, 'data-zealblocks-animation="zoom-in-up"' ) );
$check( 'animation class', false !== strpos( $out, 'has-animation' ) );
$check( 'duration clamped to 5000ms', false !== strpos( $out, '--zealblocks-animation-duration:5000ms' ) );
$check( 'delay clamped to 0ms', false !== strpos( $out, '--zealblocks-animation-delay:0ms' ) );
$check( 'unknown easing falls back to ease', 1 === preg_match( '/--zealblocks-animation-easing:ease[;"]/', $out ) && false === strpos( $out, 'steps' ) );
$check( 'repeat flag', false !== strpos( $out, 'data-zealblocks-animation-repeat="true"' ) );
$check( 'view script loaded for an animated block', wp_script_is( 'zealblocks-text-view-script', 'enqueued' ) );
$check( 'unknown animation type ignored', false === strpos( do_blocks( '<!-- wp:zealblocks/text {"content":"X","animationType":"explode"} /-->' ), 'data-zealblocks-animation' ) );

// ---------------------------------------------------------------------
echo "\nText — display conditions\n";
// ---------------------------------------------------------------------
$check( 'hidden from logged-out visitors', '' === trim( do_blocks( '<!-- wp:zealblocks/text {"content":"Secret","displayConditions":{"hideWhenLoggedOut":true}} /-->' ) ) );
$check( 'shown to logged-out visitors when only hidden for logged-in', false !== strpos( do_blocks( '<!-- wp:zealblocks/text {"content":"Public","displayConditions":{"hideWhenLoggedIn":true}} /-->' ), 'Public' ) );
$today = strtolower( current_datetime()->format( 'l' ) );
$check( 'hidden on today', '' === trim( do_blocks( '<!-- wp:zealblocks/text {"content":"X","displayConditions":{"hideOnDays":["' . $today . '"]}} /-->' ) ) );

// ---------------------------------------------------------------------
echo "\nText — inline formats survive the front end\n";
// ---------------------------------------------------------------------
/*
 * Every format the Text block's RichText offers, written the way the editor
 * saves it. The render used to filter through Block_Render::LABEL_HTML, a
 * button-label list, so links, highlights, kbd, language, underline and inline
 * images showed in the editor and vanished on the page.
 *
 * Serialised from attributes rather than hand-written, so the JSON escaping is
 * the serializer's, as it is for a real post.
 */
$render_text = static function ( $content ) {
	return do_blocks(
		serialize_blocks(
			array(
				array(
					'blockName'    => 'zealblocks/text',
					'attrs'        => array( 'content' => $content ),
					'innerBlocks'  => array(),
					'innerHTML'    => '',
					'innerContent' => array(),
				),
			)
		)
	);
};

$formats = $render_text(
	'A <a href="https://example.org/docs" target="_blank" rel="noreferrer noopener">link</a>'
	. ' B <mark style="background-color:rgba(0, 0, 0, 0);color:#cf2e2e" class="has-inline-color">red</mark>'
	. ' C <span style="text-decoration: underline;">under</span>'
	. ' D <kbd>Ctrl</kbd>'
	. ' E <bdo lang="fr" dir="ltr">bonjour</bdo>'
	. ' F <img class="wp-image-7" style="width: 20px;" src="https://example.org/a.png" alt="tiny">'
	. ' G <math><mi>x</mi></math>'
	. ' H <strong>b</strong> <em>i</em> <s>s</s> <code>c</code> <sub>2</sub> <sup>3</sup> line<br>break'
);

$check( 'link kept with its href', false !== strpos( $formats, '<a href="https://example.org/docs"' ) );
$check( 'link keeps target and rel', false !== strpos( $formats, 'target="_blank"' ) && false !== strpos( $formats, 'rel="noreferrer noopener"' ) );
$check( 'highlight / inline colour kept with its class', false !== strpos( $formats, '<mark' ) && false !== strpos( $formats, 'class="has-inline-color"' ) );
$check( 'inline colour value kept', false !== strpos( $formats, 'color:#cf2e2e' ) );
$check( 'underline kept', false !== strpos( $formats, 'text-decoration: underline' ) );
$check( 'keyboard input kept', false !== strpos( $formats, '<kbd>Ctrl</kbd>' ) );
$check( 'language kept with lang and dir', false !== strpos( $formats, '<bdo lang="fr" dir="ltr">' ) );
$check( 'inline image kept with src and alt', false !== strpos( $formats, 'src="https://example.org/a.png"' ) && false !== strpos( $formats, 'alt="tiny"' ) );
$check( 'inline image keeps its class and width', false !== strpos( $formats, 'wp-image-7' ) && false !== strpos( $formats, 'width: 20px' ) );
$check( 'inline math kept', false !== strpos( $formats, '<math><mi>x</mi></math>' ) );
$check(
	'bold, italic, strikethrough, code, sub, sup and br still kept',
	false !== strpos( $formats, '<strong>b</strong>' )
	&& false !== strpos( $formats, '<em>i</em>' )
	&& false !== strpos( $formats, '<s>s</s>' )
	&& false !== strpos( $formats, '<code>c</code>' )
	&& false !== strpos( $formats, '<sub>2</sub>' )
	&& false !== strpos( $formats, '<sup>3</sup>' )
	&& false !== strpos( $formats, '<br' )
);

$hostile_text = $render_text(
	'X <script>alert(1)</script>'
	. ' <a href="javascript:alert(1)">js</a>'
	. ' <a href="data:text/html;base64,PHNjcmlwdD4=">data</a>'
	. ' <a href="https://example.org" onclick="alert(1)">click</a>'
	. ' <img src="https://example.org/b.png" onerror="alert(1)" alt="b">'
	. ' <iframe src="https://example.org"></iframe>'
	. ' <mark style="color:red;background:url(javascript:alert(1));width:expression(alert(1));behavior:url(x.htc)">bg</mark>'
);

$check( 'script element removed from text', false === stripos( $hostile_text, '<script' ) );
$check( 'javascript: href removed from text', false === stripos( $hostile_text, 'javascript:' ) );
$check( 'data: href removed from text', false === stripos( $hostile_text, 'data:text' ) );
$check( 'event handlers removed from text', false === stripos( $hostile_text, 'onclick' ) && false === stripos( $hostile_text, 'onerror' ) );
$check( 'iframe removed from text', false === stripos( $hostile_text, '<iframe' ) );
// An https url() in a background is allowed in post content by core, by design;
// these are the forms it must remove.
$check(
	'expression(), behavior and javascript: url() removed from an inline style',
	false === stripos( $hostile_text, 'expression(' )
	&& false === stripos( $hostile_text, 'behavior' )
	&& false === stripos( $hostile_text, 'url(javascript' )
);
$check( 'the safe declaration in that style survives', false !== strpos( $hostile_text, 'style="color:red"' ) );
$check( 'the safe link beside them survives', false !== strpos( $hostile_text, 'href="https://example.org"' ) );

$check(
	'a block holding only an inline image still renders',
	false !== strpos( $render_text( '<img src="https://example.org/c.png" alt="only">' ), 'alt="only"' )
);
$check(
	'a block holding only a line break renders nothing',
	'' === trim( $render_text( '<br>' ) )
);

/*
 * The post content always kept the formats; only the render dropped them. So a
 * post saved before the fix shows them now, with no re-save.
 */
$formats_post_id = wp_insert_post(
	array(
		'post_title'   => 'Zealblocks integration probe (inline formats)',
		'post_status'  => 'publish',
		'post_type'    => 'post',
		// wp_insert_post() unslashes its input, which would eat the backslashes
		// in the serializer's < escapes. The editor saves through REST,
		// which slashes first, so do the same.
		'post_content' => wp_slash(
			serialize_blocks(
				array(
					array(
						'blockName'    => 'zealblocks/text',
						'attrs'        => array( 'content' => 'Read the <a href="https://example.org/guide">guide</a> first.' ),
						'innerBlocks'  => array(),
						'innerHTML'    => '',
						'innerContent' => array(),
					),
				)
			)
		),
	)
);

if ( $formats_post_id && ! is_wp_error( $formats_post_id ) ) {
	$check(
		'a saved post shows its link through the_content',
		false !== strpos( apply_filters( 'the_content', get_post( $formats_post_id )->post_content ), '<a href="https://example.org/guide">guide</a>' )
	);

	wp_delete_post( $formats_post_id, true );
} else {
	$check( 'could create the inline-formats probe post', false );
}

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
