<?php
/**
 * Front-end markup for zealblocks/container.
 *
 * Core does the layout. The block declares core's `layout` support, so flex,
 * grid and constrained layouts, the gap, per-device orientation and columns,
 * and the children's own sizing all come from block-supports/layout.php. This
 * template adds what core cannot: the hover styling, the reverse order, the
 * size limits, a semantic tag and a link that is safe to nest buttons inside.
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
use Zealblocks\Block\Reverse_Order;
use Zealblocks\Block\Z_Index;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * Function-scoped, not global: core requires this file from inside a closure.
 * See button/render.php.
 */

// A hidden container renders nothing, and leaves no rule or script behind.
if ( Display_Conditions::hides( isset( $attributes['displayConditions'] ) ? $attributes['displayConditions'] : null ) ) {
	return;
}

/*
 * An allow-list, not esc_attr(): the tag is printed as a tag name, and only
 * these eight are meaningful wrappers for a group of blocks. MUST match TAGS in
 * src/container/constants.js.
 */
$tag_name = Block_Render::one_of(
	Block_Render::text( $attributes, 'tagName' ),
	array( 'div', 'section', 'header', 'footer', 'main', 'article', 'aside', 'nav' ),
	'div'
);

$style = isset( $attributes['style'] ) && is_array( $attributes['style'] ) ? $attributes['style'] : array();

/*
 * Hover and focus, as on the Buttons wrapper: `:has(:focus-visible)`, so a
 * keyboard user tabbing to a button inside the container sees the card's hover
 * state, and a mouse click on that button does not leave it on.
 *
 *   - Text, background and border colour: real declarations under the states,
 *     important; see includes/block/class-hover.php.
 *   - Shadow hover and lift: custom properties, spent by style.scss under the
 *     same states, so a tablet override of one part keeps the others.
 *   - Max width, max height and overflow: real declarations per band. Core's
 *     dimensions support has no max sizes, and none per device.
 */
$container_states = array( ':hover', ':has(:focus-visible)' );

$responsive = Block_Render::responsive(
	$style,
	'zealblocks',
	array_merge(
		Hover::properties( '--zealblocks-container-hover-', $container_states ),
		array(
			'borderHover'       => array( 'border-color', 'color', $container_states ),
			'shadowHoverX'      => array( '--zealblocks-container-shadow-hover-x', 'signed-length' ),
			'shadowHoverY'      => array( '--zealblocks-container-shadow-hover-y', 'signed-length' ),
			'shadowHoverBlur'   => array( '--zealblocks-container-shadow-hover-blur', 'length' ),
			'shadowHoverSpread' => array( '--zealblocks-container-shadow-hover-spread', 'signed-length' ),
			'shadowHoverColor'  => array( '--zealblocks-container-shadow-hover-color', 'color' ),
			'hoverLift'         => array( '--zealblocks-container-lift', 'signed-length' ),
			'maxWidth'          => 'max-width',
			'maxHeight'         => 'max-height',
			'overflow'          => array( 'overflow', 'overflow' ),
			// Stacking order, per device (S-07); see includes/block/class-z-index.php.
			Z_Index::KEY        => Z_Index::PROPERTY,
		)
	),
	'zealblocks-ctr-'
);

/*
 * The max sizes are important. The page around a container sets a max width on
 * every content child: a classic theme with a selector worth two classes
 * (Astra's `.entry-content[data-ast-blocks-layout] > *`, found live), a block
 * theme through the constrained layout. A width the author set on this one
 * block has to beat a width the theme set on all of them. Each rule holds one
 * declaration, so the flag cannot reach any other property.
 */
foreach ( $responsive['rules'] as $index => $rule ) {
	if ( array_intersect_key( $rule['declarations'], array_flip( array( 'max-width', 'max-height' ) ) ) ) {
		$responsive['rules'][ $index ]['important'] = true;
	}
}

/*
 * Reverse order (P-14), per device, with its own class: see
 * includes/block/class-reverse-order.php.
 */
$reverse = Reverse_Order::responsive(
	isset( $attributes['layout'] ) ? $attributes['layout'] : array(),
	$style,
	'zealblocks-ctr-rev-'
);

/*
 * Feature classes, from the rules that SURVIVED validation, never from the
 * stored values, and from every band together.
 */
$has_shadow_hover = false;
$has_lift         = false;

foreach ( $responsive['rules'] as $rule ) {
	foreach ( array_keys( $rule['declarations'] ) as $property ) {
		$has_shadow_hover = $has_shadow_hover || str_starts_with( $property, '--zealblocks-container-shadow-hover-' );
		$has_lift         = $has_lift || '--zealblocks-container-lift' === $property;
	}
}

// `has-hover` switches the transition on; a shadow or lift alone needs it too.
$hover_classes = Hover::classes( $responsive['rules'] );

if ( ! $hover_classes && ( $has_shadow_hover || $has_lift ) ) {
	$hover_classes = array( Hover::CLASS_NAME );
}

/*
 * The link (P-64): the whole container clickable, with buttons and links
 * inside it still working.
 *
 * Not by making the root an <a>. Interactive content inside an <a> is invalid
 * HTML, and the audit found what browsers make of it: Spectra's linked
 * container with a button inside renders two broken links, and Elementor V4
 * refuses the link outright. Instead the link is an empty <a> stretched over
 * the container, under its content; style.scss lets clicks through the content
 * to it, except on the content's own controls. No nesting, so no repair.
 *
 * An empty link has no name of its own, so it needs an aria-label: the
 * author's, or the container's first heading, or the start of its text.
 */
$link_attributes = Block_Render::link( $attributes );
$link_markup     = '';

if ( $link_attributes ) {
	$link_label = sanitize_text_field( Block_Render::text( $attributes, 'linkLabel' ) );

	if ( '' === $link_label && preg_match( '#<h[1-6][^>]*>(.*?)</h[1-6]>#is', (string) $content, $heading ) ) {
		$link_label = trim( wp_strip_all_tags( $heading[1] ) );
	}

	if ( '' === $link_label ) {
		$link_label = wp_trim_words( wp_strip_all_tags( (string) $content ), 12, '' );
	}

	$link_attributes = array_merge(
		array( 'class' => 'wp-block-zealblocks-container__link' ),
		$link_attributes,
		'' === $link_label ? array() : array( 'aria-label' => $link_label )
	);

	$link_markup = '<a';

	foreach ( $link_attributes as $name => $value ) {
		$link_markup .= sprintf( ' %s="%s"', $name, 'href' === $name ? esc_url( $value ) : esc_attr( $value ) );
	}

	$link_markup .= '></a>';
}

$animation = Animation::wrapper( $attributes );

$wrapper_classes = array_filter(
	array(
		$responsive['class'],
		$reverse['class'],
		...$hover_classes,
		$has_shadow_hover ? 'has-shadow-hover' : '',
		$has_lift ? 'has-hover-lift' : '',
		...Z_Index::classes( $responsive['rules'] ),
		...$animation['classes'],
		'' !== $link_markup ? 'has-link' : '',
	)
);

// To core's style engine, as the Button's rules go. See button/render.php.
Block_Render::store_rules( array_merge( $responsive['rules'], $reverse['rules'] ) );

printf(
	'<%1$s %2$s>%3$s%4$s</%1$s>',
	esc_attr( $tag_name ),
	get_block_wrapper_attributes( array_merge( $wrapper_classes ? array( 'class' => implode( ' ', $wrapper_classes ) ) : array(), $animation['attributes'] ) ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$link_markup, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built above: esc_url() on the href, esc_attr() on every other value.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered inner block HTML.
);
