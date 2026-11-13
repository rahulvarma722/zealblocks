<?php
/**
 * Front-end markup for zealblocks/buttons.
 *
 * A container: the only job is to emit the wrapper and print whatever
 * the inner blocks rendered. Layout classes (the flex container and its
 * blockGap) are added by wp_render_layout_support_flag() on the
 * render_block filter, after this file runs — there is nothing to do
 * here for them.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

// A file-level `use` is lexical: see button/render.php.
use Zealblocks\Block\Animation;
use Zealblocks\Block\Display_Conditions;
use Zealblocks\Block\Hover;
use Zealblocks\Block\Render as Block_Render;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * These variables are NOT global, despite what the sniff reports.
 *
 * `register_block_type_from_metadata()` wraps a block's render template in a
 * static closure and requires it from inside that closure —
 * `wp-includes/blocks.php:629-631`:
 *
 *     $settings['render_callback'] = static function ( $attributes, $content, $block ) use ( $template_path ) {
 *         ob_start();
 *         require $template_path;
 *         return ob_get_clean();
 *     };
 *
 * So every assignment below is function-scoped and disappears when the
 * callback returns. PHPCS is a static analyser: it sees a .php file whose
 * top level assigns variables and cannot know the file is only ever reached
 * through that closure, so it assumes global scope. Core's own block
 * templates trip the same sniff for the same reason.
 *
 * Prefixing these to ``$myplugin_text`, `$myplugin_url` and so on would satisfy
 * the sniff while making the file harder to read and implying a lifetime these
 * variables do not have. Disabled at file level instead, since it applies to
 * every line rather than to any one of them.
 */

/*
 * Display conditions first, before any work: a hidden block renders nothing at
 * all, and must not leave a stored CSS rule or an enqueued script behind.
 * Display_Conditions::pre_render() normally stops it sooner; this covers render
 * paths that call the callback directly.
 */
if ( Display_Conditions::hides( isset( $attributes['displayConditions'] ) ? $attributes['displayConditions'] : null ) ) {
	return;
}

// An empty container would render as a stray, invisible wrapper.
if ( '' === trim( (string) $content ) ) {
	return;
}

/*
 * Background hover (BS-02), per device, through the shared Hover. Background
 * and border, shadow and margin (BS-01, BS-03 to BS-05) are core supports,
 * which get_block_wrapper_attributes() already serialises.
 *
 * No text hover: the container has no text colour (`color.text: false`), so a
 * hand-stored one is dropped here rather than printed.
 *
 * States: `:hover`, and `:has(:focus-visible)` for a keyboard user tabbing to
 * a button inside. Spectra uses `:focus-within`, which a mouse click on a
 * <button> child also triggers, leaving the hover background on until the
 * visitor clicks elsewhere.
 */
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array_diff_key(
		Hover::properties( '--zealblocks-buttons-hover-', array( ':hover', ':has(:focus-visible)' ) ),
		array( Hover::TEXT => true )
	),
	'zealblocks-btns-'
);

/*
 * Entrance animation (S-05), shared with every block that opts in; see
 * includes/block/class-animation.php. Empty for a group that is not animated.
 */
$animation = Animation::wrapper( $attributes );

$wrapper_classes = array_filter( array( $responsive['class'], ...Hover::classes( $responsive['rules'] ), ...$animation['classes'] ) );

// To core's style engine, as the Button's rules go. See button/render.php.
Block_Render::store_rules( $responsive['rules'] );

/*
 * $content is NOT filtered, and must not be.
 *
 * It is not user input: it is the finished HTML of the inner blocks, which core
 * produced by running each child's own render callback — every one of which
 * escaped its own output on the way through. Filtering here would mean escaping
 * twice.
 *
 * wp_kses() in particular would be actively destructive. A container cannot
 * know what its children legitimately emit: today that is anchors, buttons,
 * spans and inline SVG, and tomorrow it is whatever block a user nests here.
 * Any allow-list narrow enough to be worth writing would silently delete part
 * of somebody's page. This is why core's own container blocks — core/group,
 * core/buttons, core/columns — print $content unfiltered too.
 *
 * The escaping boundary for inner blocks is the CHILD's render callback. For
 * this block, that is src/button/render.php.
 */
printf(
	'<div %1$s>%2$s</div>',
	get_block_wrapper_attributes( array_merge( $wrapper_classes ? array( 'class' => implode( ' ', $wrapper_classes ) ) : array(), $animation['attributes'] ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered inner block HTML; see the note above.
);
