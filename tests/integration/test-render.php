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
$check( 'rotation emitted on the svg, as the variable style.scss spends', 1 === preg_match( '/<svg[^>]*--zealblocks-icon-rotation:90deg;/', $rotated ) );

// Normalisation: a stored value outside 0-359 must not emit a meaningless
// declaration, and a negative must resolve to its positive equivalent.
$check( '720 normalises to no rotation', false === strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","rotation":720} /-->' ), 'rotation' ) );
$check( '-90 normalises to 270deg', false !== strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"arrow-right","rotation":-90} /-->' ), '--zealblocks-icon-rotation:270deg;' ) );

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
echo "\nIcon — hover colours, RTL flip and link (I-01 to I-04)\n";
// ---------------------------------------------------------------------
$icon_probe = static function ( $attrs ) {
	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	$html = do_blocks( '<!-- wp:zealblocks/icon ' . wp_json_encode( array_merge( array( 'icon' => 'arrow-right' ), $attrs ) ) . ' /-->' );
	preg_match( '/class="[^"]*(zealblocks-icon-[0-9a-f]{8})/', $html, $match );

	return array(
		'html'  => $html,
		'css'   => wp_style_engine_get_stylesheet_from_context( 'zealblocks' ),
		'class' => isset( $match[1] ) ? '.' . $match[1] : '',
	);
};

$icon_hover = $icon_probe(
	array(
		'style' => array(
			'zealblocks' => array(
				'textHover'       => '#ff0000',
				'backgroundHover' => 'linear-gradient(90deg,#000 0%,#fff 100%)',
			),
			'@mobile'    => array( 'zealblocks' => array( 'textHover' => '#0000ff' ) ),
		),
	)
);
$check( 'icon hover colour on :hover and :focus-visible, important', '' !== $icon_hover['class'] && false !== strpos( $icon_hover['css'], $icon_hover['class'] . ':hover,' . $icon_hover['class'] . ':focus-visible{color:#ff0000 !important;' ) );
$check( 'background hover takes a gradient', false !== strpos( $icon_hover['css'], 'background:linear-gradient(90deg,#000 0%,#fff 100%) !important;' ) );
$check( 'icon hover is per device', 1 === preg_match( '/@media[^{]*\{' . preg_quote( $icon_hover['class'] . ':hover,' . $icon_hover['class'] . ':focus-visible{color:#0000ff !important;}', '/' ) . '\}/', $icon_hover['css'] ) );
$check( 'has-hover switches the transition on', false !== strpos( $icon_hover['html'], 'has-hover' ) );

$icon_hostile = $icon_probe( array( 'style' => array( 'zealblocks' => array( 'textHover' => 'red;}body{x', 'backgroundHover' => 'url(javascript:x)' ) ) ) );
$check( 'hostile icon hover values leave no CSS, hash or class', '' === $icon_hostile['css'] && false === strpos( $icon_hostile['html'], 'zealblocks-icon-' ) && false === strpos( $icon_hostile['html'], 'has-hover' ) );

$check( 'flipForRTL adds has-rtl-flip to the wrapper', false !== strpos( $icon_probe( array( 'flipForRTL' => true ) )['html'], 'has-rtl-flip' ) );
$check( 'and nothing without it', false === strpos( $icon_probe( array() )['html'], 'has-rtl-flip' ) );

$icon_linked = $icon_probe( array( 'url' => 'https://example.org/?a=1&b=2', 'linkTarget' => '_blank', 'rel' => 'nofollow', 'label' => 'Pricing' ) );
$check( 'a linked icon is an <a> wrapper with href', 1 === preg_match( '#^<a [^>]*href="https://example.org/\?a=1&\#038;b=2"#', trim( $icon_linked['html'] ) ) && false !== strpos( $icon_linked['html'], '</a>' ) );
$check( 'new tab keeps the author\'s rel and adds the opener guard', false !== strpos( $icon_linked['html'], 'target="_blank"' ) && false !== strpos( $icon_linked['html'], 'rel="nofollow noreferrer noopener"' ) );
$check( 'the alternative text names the link, the SVG is hidden', false !== strpos( $icon_linked['html'], 'aria-label="Pricing"' ) && false !== strpos( $icon_linked['html'], 'aria-hidden="true"' ) && false === strpos( $icon_linked['html'], 'role="img"' ) );

$icon_nameless = $icon_probe( array( 'url' => 'https://example.org/' ) );
$icon_entry    = Zealblocks\Icon_Handler\Library::get( 'arrow-right' );
$check( 'an unlabelled linked icon is named after the icon', '' !== (string) ( $icon_entry['label'] ?? '' ) && false !== strpos( $icon_nameless['html'], 'aria-label="' . esc_attr( $icon_entry['label'] ) . '"' ) );

$icon_js = $icon_probe( array( 'url' => 'javascript:alert(1)', 'linkTarget' => '_blank' ) );
$check( 'an unusable URL leaves a plain <div>, no href or target', 0 === strpos( trim( $icon_js['html'] ), '<div' ) && false === strpos( $icon_js['html'], 'href' ) && false === strpos( $icon_js['html'], 'target=' ) );
$check( 'an unlinked labelled icon keeps role="img" on the SVG', false !== strpos( $icon_probe( array( 'label' => 'Rating' ) )['html'], 'role="img" aria-label="Rating"' ) );

$check( 'Render::link() drops unknown targets and rel tokens', array( 'href' => 'https://ex.org', 'rel' => 'nofollow sponsored' ) === Zealblocks\Block\Render::link( array( 'url' => 'https://ex.org', 'linkTarget' => 'evil', 'rel' => 'NoFollow  sponsored bogus' ) ) );
$check( 'and returns nothing for an unusable URL', array() === Zealblocks\Block\Render::link( array( 'url' => 'data:text/html,x', 'linkTarget' => '_blank' ) ) );

// ---------------------------------------------------------------------
echo "\nButtons — background, hover, border, shadow and margin (BS-01 to BS-05)\n";
// ---------------------------------------------------------------------
$buttons_supports = WP_Block_Type_Registry::get_instance()->get_registered( 'zealblocks/buttons' )->supports;
$check( 'background colour and gradient, no text colour (BS-01)', true === ( $buttons_supports['color']['background'] ?? null ) && true === ( $buttons_supports['color']['gradients'] ?? null ) && false === ( $buttons_supports['color']['text'] ?? null ) );
$check( 'border and shadow (BS-03, BS-04)', true === ( $buttons_supports['__experimentalBorder']['width'] ?? null ) && true === ( $buttons_supports['__experimentalBorder']['radius'] ?? null ) && true === ( $buttons_supports['shadow'] ?? null ) );
$check( 'margin on all sides (BS-05)', true === ( $buttons_supports['spacing']['margin'] ?? null ) );

$buttons_probe = static function ( $attrs ) {
	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	$html = do_blocks(
		'<!-- wp:zealblocks/buttons ' . wp_json_encode( $attrs ) . ' -->'
		. '<!-- wp:zealblocks/button {"text":"A","url":"https://ex.org"} /-->'
		. '<!-- /wp:zealblocks/buttons -->'
	);
	preg_match( '/class="[^"]*(zealblocks-btns-[0-9a-f]{8})/', $html, $match );

	return array(
		'html'  => $html,
		'css'   => wp_style_engine_get_stylesheet_from_context( 'zealblocks' ),
		'class' => isset( $match[1] ) ? '.' . $match[1] : '',
	);
};

$styled = $buttons_probe(
	array(
		'style' => array(
			'color'   => array( 'background' => '#eeeeee' ),
			'border'  => array( 'width' => '2px', 'style' => 'solid', 'color' => '#111111', 'radius' => '8px' ),
			'spacing' => array( 'margin' => array( 'left' => '10px', 'right' => '20px' ) ),
		),
	)
);
$check( 'core serialises background, border and side margins on the wrapper', false !== strpos( $styled['html'], 'background-color:#eeeeee' ) && false !== strpos( $styled['html'], 'border-width:2px' ) && false !== strpos( $styled['html'], 'margin-left:10px' ) && false !== strpos( $styled['html'], 'margin-right:20px' ) );
$check( 'no hover: no hash class, no rules', '' === $styled['class'] && '' === $styled['css'] && false === strpos( $styled['html'], 'has-hover' ) );

$hovered = $buttons_probe(
	array(
		'style' => array(
			'zealblocks' => array(
				'backgroundHover' => 'linear-gradient(90deg,#000 0%,#fff 100%)',
				'textHover'       => '#ff0000',
			),
			'@tablet'    => array( 'zealblocks' => array( 'backgroundHover' => '#00ff00' ) ),
		),
	)
);
$check( 'background hover on :hover and keyboard focus inside (BS-02)', '' !== $hovered['class'] && false !== strpos( $hovered['css'], $hovered['class'] . ':hover,' . $hovered['class'] . ':has(:focus-visible){background:linear-gradient(90deg,#000 0%,#fff 100%) !important;}' ) );
$check( 'background hover is per device', 1 === preg_match( '/@media[^{]*\{' . preg_quote( $hovered['class'] . ':hover,' . $hovered['class'] . ':has(:focus-visible){background:#00ff00 !important;}', '/' ) . '\}/', $hovered['css'] ) );
$check( 'a stored text hover is dropped: the container has no text colour', false === strpos( $hovered['css'], '#ff0000' ) );
$check( 'has-hover switches the transition on', false !== strpos( $hovered['html'], 'has-hover' ) );
$check( 'the children still render inside', false !== strpos( $hovered['html'], 'wp-block-zealblocks-button' ) );

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
echo "\nText — entrance animation (shared Animation module)\n";
// ---------------------------------------------------------------------
$animation_handle = Zealblocks\Block\Animation::handle();
$text_type        = WP_Block_Type_Registry::get_instance()->get_registered( 'zealblocks/text' );

$check( 'animation script registered under the shared handle', wp_script_is( $animation_handle, 'registered' ) );
$check(
	'animation script points at the built shared file',
	false !== strpos( (string) wp_scripts()->registered[ $animation_handle ]->src, 'build/shared/animation-view.js' )
	&& is_readable( Zealblocks\Helper::path( Zealblocks\Block\Animation::SCRIPT ) )
);
$check( 'animation script is deferred', 'defer' === ( wp_scripts()->registered[ $animation_handle ]->extra['strategy'] ?? '' ) );
$check( 'Text has no view script of its own any more', $text_type && empty( $text_type->view_script_handles ) );

wp_dequeue_script( $animation_handle );
do_blocks( '<!-- wp:zealblocks/text {"content":"X"} /-->' );
$check( 'view script NOT loaded for a plain text block', ! wp_script_is( $animation_handle, 'enqueued' ) );

$out = do_blocks( '<!-- wp:zealblocks/text {"content":"X","animationType":"zoom-in-up","animationDuration":99999,"animationDelay":-5,"animationEasing":"steps(1)","animationRepeat":true} /-->' );
$check( 'animation data attribute', false !== strpos( $out, 'data-zealblocks-animation="zoom-in-up"' ) );
$check( 'animation class', false !== strpos( $out, 'has-animation' ) );
$check( 'duration clamped to 5000ms', false !== strpos( $out, '--zealblocks-animation-duration:5000ms' ) );
$check( 'delay clamped to 0ms', false !== strpos( $out, '--zealblocks-animation-delay:0ms' ) );
$check( 'unknown easing falls back to ease', 1 === preg_match( '/--zealblocks-animation-easing:ease[;"]/', $out ) && false === strpos( $out, 'steps' ) );
$check( 'repeat flag', false !== strpos( $out, 'data-zealblocks-animation-repeat="true"' ) );
$check( 'view script loaded for an animated block', wp_script_is( $animation_handle, 'enqueued' ) );
$check( 'unknown animation type ignored', false === strpos( do_blocks( '<!-- wp:zealblocks/text {"content":"X","animationType":"explode"} /-->' ), 'data-zealblocks-animation' ) );

// ---------------------------------------------------------------------
echo "\nButton, Icon and Buttons — entrance animation (S-05)\n";
// ---------------------------------------------------------------------
$animated_markup = array(
	'button'  => '<!-- wp:zealblocks/button {"text":"Go","url":"https://ex.org","animationType":"fade-up","animationDuration":600,"animationDelay":100,"animationEasing":"ease-out"} /-->',
	'icon'    => '<!-- wp:zealblocks/icon {"icon":"heart","animationType":"fade-up","animationDuration":600,"animationDelay":100,"animationEasing":"ease-out","style":{"dimensions":{"width":"48px"}}} /-->',
	'buttons' => '<!-- wp:zealblocks/buttons {"animationType":"fade-up","animationDuration":600,"animationDelay":100,"animationEasing":"ease-out"} --><!-- wp:zealblocks/button {"text":"In","url":"https://ex.org"} /--><!-- /wp:zealblocks/buttons -->',
);

foreach ( $animated_markup as $animated_slug => $animated_source ) {
	wp_dequeue_script( $animation_handle );
	$plain_source = (string) preg_replace( '/"animation[A-Za-z]+":("[^"]*"|\d+),?/', '', $animated_source );
	$plain_source = str_replace( array( ',}', '{}' ), array( '}', '' ), $plain_source );
	$plain_html   = do_blocks( $plain_source );

	$check( $animated_slug . ': no animation, no class, attribute or script', false === strpos( $plain_html, 'has-animation' ) && false === strpos( $plain_html, 'data-zealblocks-animation' ) && ! wp_script_is( $animation_handle, 'enqueued' ) );

	$animated_html = do_blocks( $animated_source );
	preg_match( '/<(?:a|div|button) [^>]*class="[^"]*wp-block-zealblocks-' . $animated_slug . '\b[^"]*"[^>]*>/', $animated_html, $animated_root );
	$animated_root = $animated_root[0] ?? '';

	$check( $animated_slug . ': class, type and timing on the block root', false !== strpos( $animated_root, 'has-animation' ) && false !== strpos( $animated_root, 'data-zealblocks-animation="fade-up"' ) && false !== strpos( $animated_root, '--zealblocks-animation-duration:600ms;--zealblocks-animation-delay:100ms;--zealblocks-animation-easing:ease-out' ) );
	$check( $animated_slug . ': the view script is loaded', wp_script_is( $animation_handle, 'enqueued' ) );
}

$check( 'icon: the animation timing joins the width in one style attribute', 1 === preg_match( '/style="[^"]*width:48px[^"]*--zealblocks-animation-duration|style="[^"]*--zealblocks-animation-duration[^"]*width:48px/', do_blocks( $animated_markup['icon'] ) ) );
wp_dequeue_script( $animation_handle );

// ---------------------------------------------------------------------
echo "\nButton — hover, icon, gap and shadow styling (B-01 to B-07)\n";
// ---------------------------------------------------------------------
/*
 * Each probe renders one button into an empty style store, so every assertion
 * reads only that button's CSS.
 */
$button_probe = static function ( $style, $extra = array() ) {
	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();

	$html = do_blocks(
		serialize_blocks(
			array(
				array(
					'blockName'    => 'zealblocks/button',
					'attrs'        => array_merge(
						array(
							'text'  => 'Go',
							'icon'  => 'arrow-right',
							'style' => $style,
						),
						$extra
					),
					'innerBlocks'  => array(),
					'innerHTML'    => '',
					'innerContent' => array(),
				),
			)
		)
	);

	preg_match( '/class="(zealblocks-btn-[0-9a-f]{8})/', $html, $match );

	return array(
		'html'  => $html,
		'css'   => wp_style_engine_get_stylesheet_from_context( 'zealblocks' ),
		'class' => isset( $match[1] ) ? '.' . $match[1] : '',
	);
};

$hover = $button_probe(
	array(
		'zealblocks' => array(
			'textHover'       => '#ff0000',
			'backgroundHover' => '#00ff00',
			'borderHover'     => '#0000ff',
			'hoverDuration'   => '400ms',
		),
	)
);
$hover_states = $hover['class'] . ':hover,' . $hover['class'] . ':focus-visible{';

$check( 'text, background and border hover share one :hover,:focus-visible rule', false !== strpos( $hover['css'], $hover_states . 'color:#ff0000 !important;background:#00ff00 !important;border-color:#0000ff !important;}' ) );
$check( 'hover duration is a plain custom property', false !== strpos( $hover['css'], $hover['class'] . '{--zealblocks-button-hover-duration:400ms;}' ) );
$check( 'has-hover switches the transition on', false !== strpos( $hover['html'], 'has-hover' ) );
$check( 'no :focus state, which would keep colours on after a click', false === strpos( $hover['css'], ':focus{' ) && false === strpos( $hover['css'], ':focus,' ) );

$icon = $button_probe(
	array(
		'zealblocks' => array(
			'iconColor' => '#111111',
			'iconHover' => '#222222',
			'iconGap'   => '1em',
		),
		'@mobile'    => array( 'zealblocks' => array( 'iconGap' => '0.25em' ) ),
	)
);

$check( 'icon colour, icon hover and gap are variables on the root', false !== strpos( $icon['css'], $icon['class'] . '{--zealblocks-button-icon-gap:1em;--zealblocks-button-icon-color:#111111;--zealblocks-button-icon-hover-color:#222222;}' ) );
$check( 'the gap is per viewport', 1 === preg_match( '/@media[^{]*\{' . preg_quote( $icon['class'] . '{--zealblocks-button-icon-gap:0.25em;}', '/' ) . '\}/', $icon['css'] ) );
$check( 'an icon hover alone still switches the transition on', false !== strpos( $icon['html'], 'has-hover' ) );

$shadow = $button_probe(
	array(
		'zealblocks' => array(
			'shadowHoverX'      => '0px',
			'shadowHoverY'      => '6px',
			'shadowHoverBlur'   => '12px',
			'shadowHoverSpread' => '-2px',
			'shadowHoverColor'  => 'rgba(0, 0, 0, 0.3)',
		),
	)
);

$check( 'shadow hover parts are variables on the root', false !== strpos( $shadow['css'], '--zealblocks-button-shadow-hover-y:6px;' ) && false !== strpos( $shadow['css'], '--zealblocks-button-shadow-hover-spread:-2px;' ) );
$check( 'an rgba() shadow colour reaches the page, as hex', false !== strpos( $shadow['css'], '--zealblocks-button-shadow-hover-color:#0000004d;' ) );
$check( 'has-shadow-hover and has-hover on the button', false !== strpos( $shadow['html'], 'has-shadow-hover' ) && false !== strpos( $shadow['html'], 'has-hover' ) );

$hostile_button = $button_probe(
	array(
		'zealblocks' => array(
			'borderHover'     => 'red;}body{display:none',
			'iconColor'       => 'url(x)',
			'iconGap'         => '-1em',
			'shadowHoverBlur' => '-3px',
			'textHover'       => 'expression(alert(1))',
		),
	)
);

$check( 'hostile hover, icon, gap and shadow values all dropped', '' === $hostile_button['css'] );
$check( 'and leave no hash or feature class behind', false === strpos( $hostile_button['html'], 'zealblocks-btn-' ) && false === strpos( $hostile_button['html'], 'has-hover' ) && false === strpos( $hostile_button['html'], 'has-shadow-hover' ) );

$block_supports = WP_Block_Type_Registry::get_instance()->get_registered( 'zealblocks/button' )->supports;
$check( 'margin, four-sided padding and writing mode are supported (B-11 to B-13)', true === ( $block_supports['spacing']['margin'] ?? null ) && true === ( $block_supports['spacing']['padding'] ?? null ) && true === ( $block_supports['typography']['__experimentalWritingMode'] ?? null ) );

// ---------------------------------------------------------------------
echo "\nButton — rotation, icon only and hover icon (B-08 to B-10)\n";
// ---------------------------------------------------------------------
$button_html = static function ( $attrs ) {
	return do_blocks( '<!-- wp:zealblocks/button ' . wp_json_encode( array_merge( array( 'url' => 'https://ex.org' ), $attrs ) ) . ' /-->' );
};

$plain_icon = $button_html( array( 'text' => 'Go', 'icon' => 'arrow-right' ) );
$rotated    = $button_html( array( 'text' => 'Go', 'icon' => 'arrow-right', 'iconRotation' => -90 ) );
$full_turn  = $button_html( array( 'text' => 'Go', 'icon' => 'arrow-right', 'iconRotation' => 360 ) );

$check( 'an unrotated icon prints no class and no style', false === strpos( $plain_icon, 'has-rotation' ) && 0 === preg_match( '#<svg[^>]*\sstyle=#', $plain_icon ) );
$check( 'a rotation is a variable on the SVG, folded into one turn', false !== strpos( $rotated, 'class="zealblocks-icon wp-block-zealblocks-button__icon has-rotation"' ) && false !== strpos( $rotated, 'style="--zealblocks-button-icon-rotation:270deg;"' ) );
$check( 'a full turn is no rotation', false === strpos( $full_turn, 'has-rotation' ) && false === strpos( $full_turn, '--zealblocks-button-icon-rotation' ) );

$icon_only = $button_html( array( 'text' => 'Tom &amp; <strong>Jerry</strong>', 'icon' => 'heart', 'showText' => false ) );
$check( 'icon only: no text span', false === strpos( $icon_only, 'wp-block-zealblocks-button__text' ) && false !== strpos( $icon_only, 'wp-block-zealblocks-button__icon' ) );
$check( 'icon only: the text, tags stripped, is the aria-label', false !== strpos( $icon_only, 'aria-label="Tom &amp; Jerry"' ) );

$no_icon = $button_html( array( 'text' => 'Shown', 'showText' => false ) );
$check( 'Show text off without an icon still shows the text', false !== strpos( $no_icon, '>Shown</span>' ) && false === strpos( $no_icon, 'aria-label' ) );

$unknown_icon = $button_html( array( 'text' => 'Shown', 'icon' => 'no-such-icon', 'showText' => false ) );
$check( 'nor with an icon that does not resolve', false !== strpos( $unknown_icon, '>Shown</span>' ) );

$unnamed = $button_html( array( 'text' => '', 'icon' => 'heart', 'showText' => false ) );
$check( 'an icon-only button renders with empty text, with no empty aria-label', false !== strpos( $unnamed, 'wp-block-zealblocks-button__icon' ) && false === strpos( $unnamed, 'aria-label' ) );

$hover_icon = $button_html(
	array(
		'text'                => 'Go',
		'showIconOnHover'     => true,
		'hoverIcon'           => 'arrow-right',
		'hoverIconPosition'   => 'left',
		'hoverIconFlipForRTL' => true,
		'hoverIconRotation'   => 90,
		'hoverIconAriaLabel'  => 'Ignored with text',
	)
);
$check( 'hover icon: printed after the text, with its own rotation', 1 === preg_match( '#__text">Go</span><svg class="zealblocks-icon wp-block-zealblocks-button__hover-icon has-rotation"[^>]*style="--zealblocks-button-icon-rotation:90deg;"#', $hover_icon ) );
$check( 'hover icon: side and flip classes on the root', false !== strpos( $hover_icon, 'has-hover-icon ' ) && false !== strpos( $hover_icon, 'has-hover-icon-left' ) && false !== strpos( $hover_icon, 'has-hover-icon-rtl-flip' ) );
$check( 'hover icon: no hover label while the text shows', false === strpos( $hover_icon, Zealblocks\Block\Hover_Label::ATTRIBUTE ) );

$hover_off = $button_html( array( 'text' => 'Go', 'hoverIcon' => 'arrow-right' ) );
$hover_bad = $button_html( array( 'text' => 'Go', 'showIconOnHover' => true, 'hoverIcon' => '../../etc/passwd' ) );
$check( 'a hover icon needs the toggle on', false === strpos( $hover_off, 'hover-icon' ) );
$check( 'an unknown hover icon prints nothing', false === strpos( $hover_bad, 'hover-icon' ) );

$hover_label_handle = Zealblocks\Block\Hover_Label::handle();
$check( 'hover label script registered from build/shared', wp_script_is( $hover_label_handle, 'registered' ) && false !== strpos( (string) wp_scripts()->registered[ $hover_label_handle ]->src, 'build/shared/hover-label-view.js' ) );
$check( 'and built', is_readable( ZEALBLOCKS_PATH . Zealblocks\Block\Hover_Label::SCRIPT ) );
$check( 'not loaded by a hover icon beside text', ! wp_script_is( $hover_label_handle, 'enqueued' ) );

$labelled = $button_html(
	array(
		'text'               => 'Download',
		'icon'               => 'heart',
		'showText'           => false,
		'showIconOnHover'    => true,
		'hoverIcon'          => 'arrow-right',
		'hoverIconPosition'  => 'left',
		'hoverIconAriaLabel' => 'Learn <b>more</b>',
	)
);
$check( 'icon only + hover icon: the hover label, tags stripped', false !== strpos( $labelled, 'aria-label="Download"' ) && false !== strpos( $labelled, Zealblocks\Block\Hover_Label::ATTRIBUTE . '="Learn more"' ) );
$check( 'icon only + hover icon: no side class', false === strpos( $labelled, 'has-hover-icon-left' ) );
$check( 'and the script is loaded', wp_script_is( $hover_label_handle, 'enqueued' ) );
wp_dequeue_script( $hover_label_handle );

$editor_icons = ( new Zealblocks\Icon_Handler\Editor_Provider() )->add_icons( array(), array( array( 'attrs' => array( 'hoverIcon' => 'heart' ) ) ) );
$check( 'the editor preloads hover icons too', isset( $editor_icons['icons']['heart'] ) );

// ---------------------------------------------------------------------
echo "\nColour functions reach the page\n";
// ---------------------------------------------------------------------
/*
 * Core's style engine drops any declaration using rgb(), rgba(), hsl() or
 * hsla() outside a gradient (safecss_filter_attr()). Text seeded its shadow
 * with rgba(0, 0, 0, 0.3), so the default shadow had no colour on the page.
 */
WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
do_blocks( '<!-- wp:zealblocks/text {"content":"S","style":{"zealblocks":{"textShadowX":"1px","textShadowY":"1px","textShadowBlur":"2px","textShadowColor":"rgba(0, 0, 0, 0.3)","textHover":"hsl(0, 100%, 50%)"}}} /-->' );
$colour_css = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );

$check( 'Text\'s default rgba() shadow colour is printed, as hex', false !== strpos( $colour_css, '--zealblocks-text-shadow-color:#0000004d;' ) );
$check( 'an hsl() hover colour is printed, as hex', false !== strpos( $colour_css, 'color:#ff0000 !important;' ) );

// ---------------------------------------------------------------------
echo "\nShared hover — states through the real style engine\n";
// ---------------------------------------------------------------------
/*
 * Text uses `:hover` alone; Button, Icon and Buttons will add a focus state.
 * The unit suite proves the selector list is built; this proves core's style
 * engine prints it intact, inside a per-band media query too, and keeps the
 * important flag. The colours are unique to this check.
 */
$hover_result = Zealblocks\Block\Render::responsive(
	array(
		'zealblocks' => array( 'textHover' => '#0a0b0c' ),
		'@mobile'    => array( 'zealblocks' => array( 'backgroundHover' => '#0c0b0a' ) ),
	),
	'zealblocks',
	Zealblocks\Block\Hover::properties( '--zealblocks-probe-hover-', array( ':hover', ':focus-within' ) ),
	'zealblocks-probe-'
);
Zealblocks\Block\Render::store_rules( $hover_result['rules'] );
$hover_css   = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );
$hover_class = '.' . $hover_result['class'];

$check( 'hover + focus-within printed as one selector list', false !== strpos( $hover_css, $hover_class . ':hover,' . $hover_class . ':focus-within{color:#0a0b0c !important;}' ) );
$check( 'the same list inside the mobile band', 1 === preg_match( '/@media[^{]*\{' . preg_quote( $hover_class . ':hover,' . $hover_class . ':focus-within{background:#0c0b0a !important;}', '/' ) . '\}/', $hover_css ) );
$check( 'Hover::classes() switches the transition on', array( 'has-hover' ) === Zealblocks\Block\Hover::classes( $hover_result['rules'] ) );

// ---------------------------------------------------------------------
echo "\nText — display conditions\n";
// ---------------------------------------------------------------------
$check( 'hidden from logged-out visitors', '' === trim( do_blocks( '<!-- wp:zealblocks/text {"content":"Secret","displayConditions":{"hideWhenLoggedOut":true}} /-->' ) ) );
$check( 'shown to logged-out visitors when only hidden for logged-in', false !== strpos( do_blocks( '<!-- wp:zealblocks/text {"content":"Public","displayConditions":{"hideWhenLoggedIn":true}} /-->' ), 'Public' ) );
$today = strtolower( current_datetime()->format( 'l' ) );
$check( 'hidden on today', '' === trim( do_blocks( '<!-- wp:zealblocks/text {"content":"X","displayConditions":{"hideOnDays":["' . $today . '"]}} /-->' ) ) );

/*
 * A hidden block must leave NOTHING behind, not just no markup: a CSS rule in
 * the style-engine store or an enqueued script would still reach the page.
 * The hover colour is unique to this check, so the store cannot already hold
 * it from another one.
 */
wp_dequeue_script( Zealblocks\Block\Animation::handle() );
$hidden_out = do_blocks( '<!-- wp:zealblocks/text {"content":"Hidden","animationType":"fade","style":{"zealblocks":{"textHover":"#0d0e0f"}},"displayConditions":{"hideWhenLoggedOut":true}} /-->' );
$check( 'a hidden block renders no markup', '' === trim( $hidden_out ) );
$check( 'a hidden block stores no CSS rule', false === strpos( wp_style_engine_get_stylesheet_from_context( 'zealblocks' ), '#0d0e0f' ) );
$check( 'a hidden animated block enqueues no script', ! wp_script_is( Zealblocks\Block\Animation::handle(), 'enqueued' ) );

// ---------------------------------------------------------------------
echo "\nButton, Icon and Buttons — display conditions (S-06)\n";
// ---------------------------------------------------------------------
$hide = array( 'hideWhenLoggedOut' => true );

/*
 * Each hidden block carries an animation and a unique hover colour, so a CSS
 * rule or a script left behind would show. The visitor here is logged out.
 */
$hidden_cases = array(
	'button' => '<!-- wp:zealblocks/button ' . wp_json_encode( array( 'text' => 'Hidden', 'url' => 'https://ex.org', 'animationType' => 'fade', 'style' => array( 'zealblocks' => array( 'textHover' => '#0d0e01' ) ), 'displayConditions' => $hide ) ) . ' /-->',
	'icon'   => '<!-- wp:zealblocks/icon ' . wp_json_encode( array( 'icon' => 'heart', 'animationType' => 'fade', 'style' => array( 'zealblocks' => array( 'textHover' => '#0d0e02' ) ), 'displayConditions' => $hide ) ) . ' /-->',
);

foreach ( $hidden_cases as $hidden_slug => $hidden_source ) {
	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	wp_dequeue_script( Zealblocks\Block\Animation::handle() );

	$check( $hidden_slug . ': hidden renders no markup, CSS rule or script', '' === trim( do_blocks( $hidden_source ) ) && '' === wp_style_engine_get_stylesheet_from_context( 'zealblocks' ) && ! wp_script_is( Zealblocks\Block\Animation::handle(), 'enqueued' ) );
}

$check( 'a condition that does not match leaves the block alone', false !== strpos( do_blocks( '<!-- wp:zealblocks/icon {"icon":"heart","displayConditions":{"hideWhenLoggedIn":true}} /-->' ), 'wp-block-zealblocks-icon' ) );

/*
 * THE CONTAINER CASE. Core renders the inner blocks before the container's
 * own callback, so a hidden group must be stopped by pre_render_block, or its
 * Buttons would already have stored their CSS rules, which reach the page.
 * (Core dequeues their scripts itself when the group renders empty.)
 */
WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
wp_dequeue_script( Zealblocks\Block\Animation::handle() );
$hidden_group = do_blocks(
	'<!-- wp:zealblocks/buttons {"displayConditions":{"hideWhenLoggedOut":true}} -->'
	. '<!-- wp:zealblocks/button ' . wp_json_encode( array( 'text' => 'Inner', 'url' => 'https://ex.org', 'animationType' => 'zoom-in', 'style' => array( 'zealblocks' => array( 'backgroundHover' => '#0d0e03' ) ) ) ) . ' /-->'
	. '<!-- /wp:zealblocks/buttons -->'
);
$check( 'buttons: a hidden group renders no markup', '' === trim( $hidden_group ) );
$check( 'buttons: and its Buttons leave no CSS rule', '' === wp_style_engine_get_stylesheet_from_context( 'zealblocks' ) );
$check( 'buttons: and no script', ! wp_script_is( Zealblocks\Block\Animation::handle(), 'enqueued' ) );

$one_hidden = do_blocks(
	'<!-- wp:zealblocks/buttons -->'
	. '<!-- wp:zealblocks/button {"text":"Shown","url":"https://ex.org"} /-->'
	. '<!-- wp:zealblocks/button {"text":"Gone","url":"https://ex.org","displayConditions":{"hideWhenLoggedOut":true}} /-->'
	. '<!-- /wp:zealblocks/buttons -->'
);
$check( 'a hidden Button inside a visible group drops out alone', false !== strpos( $one_hidden, '>Shown<' ) && false === strpos( $one_hidden, '>Gone<' ) );

$display_conditions = new Zealblocks\Block\Display_Conditions();
$check( 'pre_render leaves other plugins\' blocks alone', null === $display_conditions->pre_render( null, array( 'blockName' => 'core/paragraph', 'attrs' => array( 'displayConditions' => $hide ) ) ) );
$check( 'and keeps content another filter already chose', 'kept' === $display_conditions->pre_render( 'kept', array( 'blockName' => 'zealblocks/icon', 'attrs' => array( 'displayConditions' => $hide ) ) ) );

// ---------------------------------------------------------------------
echo "\nAll four blocks — core's per-device hide (S-08)\n";
// ---------------------------------------------------------------------
/*
 * Core's block visibility (WordPress 7.0+): hiding on a device adds
 * `wp-block-hidden-{viewport}` to the block's first tag and a display:none rule
 * in that viewport's media query; `blockVisibility: false` hides it on every
 * device. Each case carries a hover colour, so CSS left behind would show.
 */
$visibility_sources = array(
	'text'    => '<!-- wp:zealblocks/text {"content":"T","metadata":{"blockVisibility":%s},"style":{"zealblocks":{"textHover":"#0a0b01"}}} /-->',
	'button'  => '<!-- wp:zealblocks/button {"text":"B","url":"https://ex.org","metadata":{"blockVisibility":%s},"style":{"zealblocks":{"textHover":"#0a0b02"}}} /-->',
	'icon'    => '<!-- wp:zealblocks/icon {"icon":"heart","metadata":{"blockVisibility":%s},"style":{"zealblocks":{"textHover":"#0a0b03"}}} /-->',
	'buttons' => '<!-- wp:zealblocks/buttons {"metadata":{"blockVisibility":%s}} --><!-- wp:zealblocks/button {"text":"In","url":"https://ex.org","style":{"zealblocks":{"backgroundHover":"#0a0b04"}}} /--><!-- /wp:zealblocks/buttons -->',
);

foreach ( $visibility_sources as $visibility_slug => $visibility_source ) {
	foreach ( array( 'mobile', 'tablet', 'desktop' ) as $viewport ) {
		WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
		$visible_html = trim( do_blocks( sprintf( $visibility_source, wp_json_encode( array( 'viewport' => array( $viewport => false ) ) ) ) ) );
		preg_match( '/^<[a-z]+[^>]*>/', $visible_html, $visible_root );

		$check(
			$visibility_slug . ': hidden on ' . $viewport . ' puts core\'s class on our root, and its rule',
			false !== strpos( $visible_root[0] ?? '', 'wp-block-zealblocks-' . $visibility_slug ) && false !== strpos( $visible_root[0] ?? '', 'wp-block-hidden-' . $viewport )
				&& false !== strpos( wp_style_engine_get_stylesheet_from_context( 'block-supports' ), '.wp-block-hidden-' . $viewport . '{display:none !important;}' )
				&& '' !== wp_style_engine_get_stylesheet_from_context( 'zealblocks' )
		);
	}

	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	$everywhere = trim( do_blocks( sprintf( $visibility_source, 'false' ) ) );
	$check( $visibility_slug . ': hidden everywhere renders nothing and leaves none of our CSS', '' === $everywhere && '' === wp_style_engine_get_stylesheet_from_context( 'zealblocks' ) );
}

$check( 'a Button hidden on mobile inside a visible group carries the class itself', 1 === preg_match( '/<a [^>]*class="[^"]*wp-block-hidden-mobile[^"]*"[^>]*>Hidden on phones/', str_replace( '<span class="wp-block-zealblocks-button__text">', '', do_blocks( '<!-- wp:zealblocks/buttons --><!-- wp:zealblocks/button {"text":"Hidden on phones","url":"https://ex.org","metadata":{"blockVisibility":{"viewport":{"mobile":false}}}} /--><!-- /wp:zealblocks/buttons -->' ) ) ) );

// ---------------------------------------------------------------------
echo "\nButton, Icon and Buttons — z-index (S-07)\n";
// ---------------------------------------------------------------------
$z_sources = array(
	'button'  => static function ( $style ) {
		return '<!-- wp:zealblocks/button ' . wp_json_encode( array( 'text' => 'Z', 'url' => 'https://ex.org', 'style' => $style ) ) . ' /-->';
	},
	'icon'    => static function ( $style ) {
		return '<!-- wp:zealblocks/icon ' . wp_json_encode( array( 'icon' => 'heart', 'style' => $style ) ) . ' /-->';
	},
	'buttons' => static function ( $style ) {
		return '<!-- wp:zealblocks/buttons ' . wp_json_encode( array( 'style' => $style ) ) . ' --><!-- wp:zealblocks/button {"text":"In","url":"https://ex.org"} /--><!-- /wp:zealblocks/buttons -->';
	},
);

foreach ( $z_sources as $z_slug => $z_source ) {
	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	$z_html = do_blocks( $z_source( array( 'zealblocks' => array( 'zIndex' => '5' ), '@mobile' => array( 'zealblocks' => array( 'zIndex' => '-2' ) ) ) ) );
	$z_css  = wp_style_engine_get_stylesheet_from_context( 'zealblocks' );
	preg_match( '/<(?:a|div) [^>]*class="[^"]*wp-block-zealblocks-' . $z_slug . '\b[^"]*"/', $z_html, $z_root );

	$check( $z_slug . ': z-index per device, and the class on the block root', 1 === preg_match( '/\{z-index:5;\}/', $z_css ) && 1 === preg_match( '/@media[^{]*\{[^{]*\{z-index:-2;\}\}/', $z_css ) && false !== strpos( $z_root[0] ?? '', 'has-zealblocks-z-index' ) );

	WP_Style_Engine_CSS_Rules_Store::remove_all_stores();
	$z_bad = do_blocks( $z_source( array( 'zealblocks' => array( 'zIndex' => '9;}body{color:red' ) ) ) );
	$check( $z_slug . ': an injected z-index leaves no CSS and no class', '' === wp_style_engine_get_stylesheet_from_context( 'zealblocks' ) && false === strpos( $z_bad, 'has-zealblocks-z-index' ) );
}

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
