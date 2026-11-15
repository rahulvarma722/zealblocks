<?php
/**
 * Front-end markup for zealblocks/list-item.
 *
 * An `<li>` with the icon on the left and the item's blocks on the right:
 *
 *     <li>
 *       <span class="…__icon" aria-hidden="true"><svg/></span>
 *       <div class="…__content"> … Text, and any blocks the author added … </div>
 *     </li>
 *
 * The icon is the list's (block context), or this item's own. It is a real
 * element so it can be styled, and hidden from assistive technology, so a
 * screen reader hears the list and its text, never an unnamed image. In a
 * numbered list there is no icon: the browser's own number is the marker.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    The item's blocks, rendered.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

// A file-level `use` is lexical: see button/render.php.
use Zealblocks\Block\Render as Block_Render;
use Zealblocks\Icon_Handler\Library as Icon_Library;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * Function-scoped, not global: core requires this file from inside a closure.
 * See button/render.php.
 */

$ordered = ! empty( $block->context['zealblocks/list/ordered'] );
$own     = Block_Render::text( $attributes, 'icon' );
$icon    = '' !== $own ? $own : ( isset( $block->context['zealblocks/list/icon'] ) && is_string( $block->context['zealblocks/list/icon'] ) ? $block->context['zealblocks/list/icon'] : '' );

$icon_markup = '';

// "none" switches the icon off for this item alone.
if ( ! $ordered && '' !== $icon && 'none' !== $icon ) {
	$svg = Icon_Library::render( $icon, array( 'class' => 'wp-block-zealblocks-list-item__svg' ) );

	if ( '' !== $svg ) {
		$icon_markup = '<span class="wp-block-zealblocks-list-item__icon" aria-hidden="true">' . $svg . '</span>';
	}
}

// This item's own icon colour, per device, over the list's.
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) && is_array( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array( 'iconColor' => array( '--zealblocks-list-icon-color', 'color' ) ),
	'zealblocks-li-'
);

Block_Render::store_rules( $responsive['rules'] );

printf(
	'<li %1$s>%2$s<div class="wp-block-zealblocks-list-item__content">%3$s</div></li>',
	get_block_wrapper_attributes( $responsive['class'] ? array( 'class' => $responsive['class'] ) : array() ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$icon_markup, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by Icon_Library::render(), which escapes every value.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered blocks.
);
