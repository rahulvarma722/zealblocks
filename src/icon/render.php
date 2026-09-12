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
use Zealblocks\Block\Render as Block_Render;

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
 * THE SVG COMES FROM CORE, NOT FROM US.
 *
 * wp_get_icon() (WordPress 7.1) resolves a namespaced name against
 * WP_Icons_Registry and returns the markup. Building the SVG here instead
 * would mean shipping our own copy of every icon and hand-rolling the
 * accessibility attributes — which is exactly what the button block does, and
 * why its icon map has to be kept in step with icon.js by hand.
 *
 * It also returns '' for an unknown name, which is the validation: a name that
 * is not registered cannot produce markup, so there is no allow-list to
 * maintain here and no way for a stored value to inject anything.
 *
 * `size => null` leaves the SVG's intrinsic viewBox alone. Sizing is the
 * `dimensions.width` support's job — core serialises it onto the wrapper and
 * style.scss makes the SVG fill it, so a user's width setting wins and stays
 * overridable. Passing a number here would hard-code width/height attributes
 * that CSS then has to fight.
 */
$label = Block_Render::text( $attributes, 'label' );

$svg = wp_get_icon(
	$icon_name,
	array(
		'size'  => null,
		'label' => $label,
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
	 * Rotation is a plain integer, normalised to 0-359.
	 *
	 * (int) rather than a regex: the value arrives from a NumberControl, and a
	 * cast cannot produce anything but an integer, so there is no string to
	 * escape into the style attribute. The modulo keeps a stored 720 from
	 * emitting a meaningless declaration.
	 */
	$rotation = isset( $attributes['rotation'] ) ? (int) $attributes['rotation'] % 360 : 0;

	if ( 0 !== $rotation ) {
		if ( $rotation < 0 ) {
			$rotation += 360;
		}

		$processor->add_class( 'has-rotation' );
		$processor->set_attribute( 'style', sprintf( 'rotate:%ddeg;', $rotation ) );
	}

	$svg = $processor->get_updated_html();
}

/*
 * `is-inline` is opt-in, and the default is a block-level wrapper.
 *
 * An icon is usually its own element — a feature bullet, a card badge, a
 * standalone mark — so `display: block` is the right default. Inline matters
 * only when the icon genuinely sits in a run of text, and forcing it on
 * everybody meant every other use had to work around it.
 */
$wrapper_attributes = get_block_wrapper_attributes(
	empty( $attributes['isInline'] ) ? array() : array( 'class' => 'is-inline' )
);

printf(
	'<div %1$s>%2$s</div>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	$svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Produced by core's wp_get_icon() from the icon registry, then rewritten by WP_HTML_Tag_Processor. An unregistered name returns '' and is refused above.
);
