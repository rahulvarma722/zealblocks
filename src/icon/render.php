<?php
/**
 * Front-end markup for zealblocks/icon.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

/*
 * A file-level `use` in a file with no `namespace` declaration. `use` is
 * lexical and per-file, so the alias applies here even though core requires
 * this template from inside a closure in global scope.
 */
use Zealblocks\Block\Hover;
use Zealblocks\Block\Render as Block_Render;
use Zealblocks\Icon_Handler\Library as Icon_Library;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * These variables are not global. register_block_type_from_metadata() wraps
 * this template in a static closure and requires it from inside that closure
 * (wp-includes/blocks.php:629-631), so every assignment is function-scoped.
 */

$icon_name = Block_Render::text( $attributes, 'icon' );

// No icon chosen yet — render nothing rather than an empty wrapper that still
// occupies layout and still announces itself to a screen reader.
if ( '' === $icon_name ) {
	return;
}

/*
 * THE SVG COMES FROM OUR OWN LIBRARY.
 *
 * This used to call core's wp_get_icon(), which meant this block and the
 * button block drew from two different sets with two different slug
 * namespaces — `core/star-filled` here, `star` there — and neither could
 * render the other's saved value.
 *
 * Icon_Library::render() returns '' for a slug it does not hold, which is the
 * validation: an unknown value cannot produce markup, so there is no
 * allow-list to maintain and no way for a stored string to inject anything.
 * The path itself is esc_attr()'d there.
 *
 * No size is passed, so the SVG keeps its intrinsic viewBox. Sizing is the
 * `dimensions.width` support's job — core serialises it onto the wrapper and
 * style.scss makes the SVG fill it, so the user's setting wins and stays
 * overridable. Hard-coding width/height here would only give CSS something to
 * fight.
 */
$label = Block_Render::text( $attributes, 'label' );

/*
 * THE LINK (I-04). With a usable URL the wrapper itself becomes the <a>, as in
 * Spectra, so the whole box is clickable and hover reaches it from the
 * keyboard. href, target and rel are validated by Block_Render::link(), shared
 * with the Button.
 *
 * A link needs a name, and an SVG inside it is not one, so the name moves to
 * the link and the SVG is hidden. The alternative text names it when there is
 * some; otherwise the icon's own name does, so the link is never announced as
 * a bare URL. Spectra leaves a link around a decorative icon nameless; the
 * editor asks for alternative text instead.
 */
$link_attributes = Block_Render::link( $attributes );

$svg = Icon_Library::render(
	$icon_name,
	array(
		'class' => 'wp-block-zealblocks-icon__svg',
		'label' => $link_attributes ? '' : $label,
	)
);

// Unknown or empty icon. Nothing safe to print.
if ( '' === $svg ) {
	return;
}

/*
 * Flip and rotation are applied to the SVG itself, via the HTML API rather
 * than string surgery.
 *
 * WP_HTML_Tag_Processor parses the markup properly, so adding a class cannot
 * corrupt an attribute or produce invalid HTML the way a str_replace on
 * '<svg' could. This is the same approach core's own icon block takes.
 *
 * They belong on the SVG and not the wrapper because a transform on the
 * wrapper would also rotate any background, border or padding the block
 * supports have put there — the user asked to rotate the icon, not the box.
 */
$processor = new WP_HTML_Tag_Processor( $svg );

if ( $processor->next_tag( 'svg' ) ) {
	if ( ! empty( $attributes['flipHorizontal'] ) ) {
		$processor->add_class( 'is-flip-horizontal' );
	}

	if ( ! empty( $attributes['flipVertical'] ) ) {
		$processor->add_class( 'is-flip-vertical' );
	}

	/*
	 * Rotation, as whole degrees 0-359 (Block_Render::angle()), so nothing but
	 * an integer reaches the style attribute.
	 *
	 * A custom property, not an inline `rotate`: style.scss spends it, and its
	 * RTL rule needs the angle to mirror a rotated icon (I-03), which it could
	 * not read back from an inline declaration.
	 */
	$rotation = Block_Render::angle( $attributes, 'rotation' );

	if ( 0 !== $rotation ) {
		$processor->add_class( 'has-rotation' );
		$processor->set_attribute( 'style', sprintf( '--zealblocks-icon-rotation:%ddeg;', $rotation ) );
	}

	$svg = $processor->get_updated_html();
}

/*
 * Hover colours (I-01, I-02): the icon colour and the background, per device,
 * through the shared Hover. On `:hover`, and on `:focus-visible` for a linked
 * icon a keyboard user reaches, as on the Button. Real declarations under
 * those states, important, so they beat core's colour classes.
 */
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	Hover::properties( '--zealblocks-icon-hover-', array( ':hover', ':focus-visible' ) ),
	'zealblocks-icon-'
);

$wrapper_classes = array_filter(
	array(
		$responsive['class'],
		// `is-inline` is opt-in. An icon is usually its own element — a feature
		// bullet, a card badge — so block-level is the right default.
		empty( $attributes['isInline'] ) ? '' : 'is-inline',
		// Opt-in mirroring for directional icons (I-03); style.scss gates it on [dir=rtl].
		empty( $attributes['flipForRTL'] ) ? '' : 'has-rtl-flip',
		...Hover::classes( $responsive['rules'] ),
	)
);

$extra_attributes = $wrapper_classes ? array( 'class' => implode( ' ', $wrapper_classes ) ) : array();

if ( $link_attributes ) {
	$icon_data = Icon_Library::get( $icon_name );

	$extra_attributes = array_merge(
		$extra_attributes,
		$link_attributes,
		array( 'aria-label' => '' !== $label ? $label : (string) ( $icon_data['label'] ?? $icon_name ) )
	);
}

$wrapper_attributes = get_block_wrapper_attributes( $extra_attributes );

// To core's style engine, as the Button's rules go. See button/render.php.
Block_Render::store_rules( $responsive['rules'] );

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	$link_attributes ? 'a' : 'div',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	$svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by Icon_Library::render(), which esc_attr()s every interpolated value, then rewritten by WP_HTML_Tag_Processor. An unknown slug returns '' and is refused above.
);
