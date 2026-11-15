<?php
/**
 * Front-end markup for zealblocks/list.
 *
 * A real `<ul>` or `<ol>`, so the browser numbers it and assistive technology
 * hears a list. Numbering stays native: `type` as a list-style, `start` and
 * `reversed` as the attributes HTML gives them. With an icon the markers are
 * replaced by the items' icons (list-item/render.php) and the list says
 * `role="list"`, which WebKit drops from a list with no markers.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered items.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

// A file-level `use` is lexical: see button/render.php.
use Zealblocks\Block\Animation;
use Zealblocks\Block\Display_Conditions;
use Zealblocks\Block\Render as Block_Render;
use Zealblocks\Block\Z_Index;
use Zealblocks\Icon_Handler\Library as Icon_Library;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * Function-scoped, not global: core requires this file from inside a closure.
 * See button/render.php.
 */

if ( Display_Conditions::hides( isset( $attributes['displayConditions'] ) ? $attributes['displayConditions'] : null ) ) {
	return;
}

// No items, no list: an empty <ul> is invisible and still announced.
if ( '' === trim( (string) $content ) ) {
	return;
}

$ordered  = ! empty( $attributes['ordered'] );
$list_tag = $ordered ? 'ol' : 'ul';

// The list's icon, for unordered lists only: numbers stay numbers.
$icon     = $ordered ? '' : Block_Render::text( $attributes, 'icon' );
$has_icon = '' !== $icon && null !== Icon_Library::get( $icon );

/*
 * Per device: the space between items, the icon's colour, size and gap, and
 * the colour and size of native markers. Custom properties on the list, which
 * its items (and their icons) inherit; an item can override the colour.
 */
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) && is_array( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array(
		'itemGap'     => '--zealblocks-list-gap',
		'iconSize'    => '--zealblocks-list-icon-size',
		'iconGap'     => '--zealblocks-list-icon-gap',
		'iconColor'   => array( '--zealblocks-list-icon-color', 'color' ),
		'markerColor' => array( '--zealblocks-list-marker-color', 'color' ),
		'markerSize'  => '--zealblocks-list-marker-size',
		// Stacking order, per device (S-07); see includes/block/class-z-index.php.
		Z_Index::KEY  => Z_Index::PROPERTY,
	),
	'zealblocks-list-'
);

// Space between items applies once set, in any band; see style.scss.
$has_item_gap = false;

foreach ( $responsive['rules'] as $rule ) {
	$has_item_gap = $has_item_gap || isset( $rule['declarations']['--zealblocks-list-gap'] );
}

$animation = Animation::wrapper( $attributes );

$classes = array_filter(
	array(
		$responsive['class'],
		$has_icon ? 'has-icon' : '',
		$has_item_gap ? 'has-item-gap' : '',
		$has_icon && 'center' === Block_Render::text( $attributes, 'iconAlign' ) ? 'is-icon-centred' : '',
		...Z_Index::classes( $responsive['rules'] ),
		...$animation['classes'],
	)
);

$extra = array_merge(
	$classes ? array( 'class' => implode( ' ', $classes ) ) : array(),
	$animation['attributes']
);

if ( $has_icon ) {
	$extra['role'] = 'list';
}

if ( $ordered ) {
	$list_type = Block_Render::one_of(
		Block_Render::text( $attributes, 'type' ),
		array( 'decimal', 'decimal-leading-zero', 'lower-alpha', 'upper-alpha', 'lower-roman', 'upper-roman' )
	);

	// A list-style, not the `type` attribute: HTML has no leading zero.
	if ( '' !== $list_type && 'decimal' !== $list_type ) {
		$extra['style'] = 'list-style-type:' . $list_type . ';' . ( isset( $extra['style'] ) ? $extra['style'] : '' );
	}

	if ( isset( $attributes['start'] ) && is_numeric( $attributes['start'] ) ) {
		$extra['start'] = (string) (int) $attributes['start'];
	}

	if ( ! empty( $attributes['reversed'] ) ) {
		$extra['reversed'] = 'reversed';
	}
}

Block_Render::store_rules( $responsive['rules'] );

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	esc_attr( $list_tag ),
	get_block_wrapper_attributes( $extra ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered items.
);
