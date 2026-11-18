<?php
/**
 * Front-end markup for zealblocks/list-item.
 *
 * An `<li>` around the item's two blocks, already rendered:
 *
 *     <li>
 *       <div class="wp-block-zealblocks-icon">…<svg aria-hidden="true"/></div>
 *       <div class="wp-block-zealblocks-container"> … Text, and any blocks the author added … </div>
 *     </li>
 *
 * The Icon block prints a decorative icon (no label: `aria-hidden`), so a
 * screen reader hears the list and its text, never an unnamed image. In a
 * numbered list the list's stylesheet hides it: the browser's own number is
 * the marker.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    The item's blocks, rendered.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

printf(
	'<li %1$s>%2$s</li>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered blocks.
);
