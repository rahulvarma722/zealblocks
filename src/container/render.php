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
use Zealblocks\Block\Background_Video;
use Zealblocks\Block\Display_Conditions;
use Zealblocks\Block\Hover;
use Zealblocks\Block\Position;
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
 *   - The overlay (P-42): its fill, opacity and blend mode, and their hover
 *     values, as custom properties that style.scss spends on `::before`. A
 *     pseudo-element cannot carry an inline style, and the hover values need
 *     the base ones as fallbacks.
 *   - Child settings (CH-04 to CH-06), for a Container inside a flex or grid
 *     parent: align self, order, and the shared position and offsets.
 */
$container_states = array( ':hover', ':has(:focus-visible)' );

$responsive = Block_Render::responsive(
	$style,
	'zealblocks',
	array_merge(
		Hover::properties( '--zealblocks-container-hover-', $container_states ),
		array(
			'borderHover'         => array( 'border-color', 'color', $container_states ),
			'shadowHoverX'        => array( '--zealblocks-container-shadow-hover-x', 'signed-length' ),
			'shadowHoverY'        => array( '--zealblocks-container-shadow-hover-y', 'signed-length' ),
			'shadowHoverBlur'     => array( '--zealblocks-container-shadow-hover-blur', 'length' ),
			'shadowHoverSpread'   => array( '--zealblocks-container-shadow-hover-spread', 'signed-length' ),
			'shadowHoverColor'    => array( '--zealblocks-container-shadow-hover-color', 'color' ),
			'hoverLift'           => array( '--zealblocks-container-lift', 'signed-length' ),
			'maxWidth'            => 'max-width',
			'maxHeight'           => 'max-height',
			'overflow'            => array( 'overflow', 'overflow' ),
			'overlay'             => array( '--zealblocks-container-overlay', 'background' ),
			'overlayOpacity'      => array( '--zealblocks-container-overlay-opacity', 'opacity' ),
			'overlayBlend'        => array( '--zealblocks-container-overlay-blend', 'blend' ),
			'overlayHover'        => array( '--zealblocks-container-overlay-hover', 'background' ),
			'overlayHoverOpacity' => array( '--zealblocks-container-overlay-hover-opacity', 'opacity' ),
			'alignSelf'           => array( 'align-self', 'align-self' ),
			// A custom property: core's style engine drops `order` itself, as
			// safecss_filter_attr() does not allow it. style.scss spends it.
			'order'               => array( '--zealblocks-container-order', 'integer' ),
			// Stacking order, per device (S-07); see includes/block/class-z-index.php.
			Z_Index::KEY          => Z_Index::PROPERTY,
		),
		// Position and its offsets, shared; see includes/block/class-position.php.
		Position::properties()
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
$has_shadow_hover  = false;
$has_lift          = false;
$has_overlay       = false;
$has_overlay_hover = false;
$has_order         = false;

foreach ( $responsive['rules'] as $rule ) {
	foreach ( array_keys( $rule['declarations'] ) as $property ) {
		$has_shadow_hover  = $has_shadow_hover || str_starts_with( $property, '--zealblocks-container-shadow-hover-' );
		$has_lift          = $has_lift || '--zealblocks-container-lift' === $property;
		$has_overlay       = $has_overlay || str_starts_with( $property, '--zealblocks-container-overlay' );
		$has_overlay_hover = $has_overlay_hover || str_starts_with( $property, '--zealblocks-container-overlay-hover' );
		$has_order         = $has_order || '--zealblocks-container-order' === $property;
	}
}

/*
 * The overlay image (P-42): one image for every device, as a background layer
 * in a custom property on the root, which `::before` puts above the fill.
 *
 * esc_url_raw() drops a hostile scheme, quotes and braces. It keeps `;`, `(`,
 * `)`, `'` and `\`, which mean something in a declaration: WordPress splits the
 * style attribute on `;`, and a URL holding one broke the property in two. So
 * those are percent-encoded, which a URL allows and CSS ignores.
 */
$overlay_style = '';
$overlay_url   = isset( $attributes['overlayImage']['url'] ) && is_string( $attributes['overlayImage']['url'] )
	? str_replace(
		array( ';', '(', ')', "'", '\\', ' ' ),
		array( '%3B', '%28', '%29', '%27', '%5C', '%20' ),
		esc_url_raw( trim( $attributes['overlayImage']['url'] ) )
	)
	: '';

if ( '' !== $overlay_url ) {
	$overlay_focal = Block_Render::focal_point( isset( $attributes['overlayImagePosition'] ) ? $attributes['overlayImagePosition'] : null );
	$overlay_size  = Block_Render::one_of( Block_Render::text( $attributes, 'overlayImageSize' ), array( 'cover', 'contain', 'repeat' ), 'cover' );
	$overlay_style = sprintf(
		'--zealblocks-container-overlay-image:url("%s") %s / %s;',
		$overlay_url,
		$overlay_focal ? implode( ' ', $overlay_focal ) : '50% 50%',
		'repeat' === $overlay_size ? 'auto repeat' : $overlay_size . ' no-repeat'
	);
	$has_overlay   = true;
}

// `has-hover` switches the transition on; a shadow, lift or overlay alone too.
$hover_classes = Hover::classes( $responsive['rules'] );

if ( ! $hover_classes && ( $has_shadow_hover || $has_lift || $has_overlay_hover ) ) {
	$hover_classes = array( Hover::CLASS_NAME );
}

/*
 * The background video (P-43), with its pause button. Nothing for a URL that
 * is not a video file. See includes/block/class-background-video.php.
 */
$video = Background_Video::render( $attributes, 'zealblocks/container' );

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
		$has_overlay ? 'has-overlay' : '',
		$has_overlay_hover ? 'has-overlay-hover' : '',
		$has_order ? 'has-order' : '',
		...$video['classes'],
	)
);

$extra_attributes = array_merge(
	$wrapper_classes ? array( 'class' => implode( ' ', $wrapper_classes ) ) : array(),
	$animation['attributes']
);

// The animation carries a style of its own; the overlay image goes before it.
if ( '' !== $overlay_style ) {
	$extra_attributes['style'] = $overlay_style . ( isset( $extra_attributes['style'] ) ? $extra_attributes['style'] : '' );
}

// To core's style engine, as the Button's rules go. See button/render.php.
Block_Render::store_rules( array_merge( $responsive['rules'], $reverse['rules'], $video['rules'] ) );

/*
 * Order inside the root: the video and its button, the link, then the content.
 * The decorations are out of flow; style.scss takes the top margin off the
 * first block after them, as core takes it off a first child. The button comes
 * first in the tab order, where a pause control is easiest to reach.
 */
printf(
	'<%1$s %2$s>%3$s%4$s%5$s</%1$s>',
	esc_attr( $tag_name ),
	get_block_wrapper_attributes( $extra_attributes ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$video['markup'], // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by Background_Video::render(), which escapes every value.
	$link_markup, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built above: esc_url() on the href, esc_attr() on every other value.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered inner block HTML.
);
