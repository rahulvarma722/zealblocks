/**
 * Text — shared constants.
 */

import { __ } from '@wordpress/i18n';

/**
 * Visual style presets, independent of the HTML tag.
 *
 * THE POINT OF THIS BLOCK. Core couples a heading's level to its appearance:
 * pick `h2` and you get h2's size. That forces a choice between a correct
 * document outline and the design you want, and the outline usually loses.
 *
 * Each preset resolves to a CSS custom property in style.scss, which prefers
 * the ACTIVE THEME's font-size preset and falls back to a sensible value. So a
 * theme with a proper type scale drives the look, and a theme without one still
 * renders something reasonable.
 *
 * `value` becomes a `has-style-<value>` class. Keep the values stable — they
 * are written into post content.
 */
export const STYLE_PRESETS = [
	{ value: '', label: __( 'Default (follow the tag)', 'zealblocks' ) },
	{ value: 'display', label: __( 'Display', 'zealblocks' ) },
	{ value: 'h1', label: __( 'Heading 1', 'zealblocks' ) },
	{ value: 'h2', label: __( 'Heading 2', 'zealblocks' ) },
	{ value: 'h3', label: __( 'Heading 3', 'zealblocks' ) },
	{ value: 'h4', label: __( 'Heading 4', 'zealblocks' ) },
	{ value: 'h5', label: __( 'Heading 5', 'zealblocks' ) },
	{ value: 'h6', label: __( 'Heading 6', 'zealblocks' ) },
	{ value: 'lead', label: __( 'Lead', 'zealblocks' ) },
	{ value: 'body', label: __( 'Body', 'zealblocks' ) },
	{ value: 'caption', label: __( 'Caption', 'zealblocks' ) },
	{ value: 'eyebrow', label: __( 'Eyebrow', 'zealblocks' ) },
];
