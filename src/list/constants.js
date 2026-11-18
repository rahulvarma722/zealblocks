/**
 * List — names shared by the list, its items and the blocks inside them.
 *
 * Every item is the same three blocks:
 *
 *     List item (<li>)
 *       ├─ Icon        the marker, on the left
 *       └─ Container   the content, on the right
 *            └─ Text   ready to type in; any other block can follow it
 *
 * The Icon and the Container are locked in place, so an item always keeps
 * both; what goes inside the Container is the author's.
 */

import { __ } from '@wordpress/i18n';

export const LIST = 'zealblocks/list';
export const ITEM = 'zealblocks/list-item';
export const ICON = 'zealblocks/icon';
export const BODY = 'zealblocks/container';
export const TEXT = 'zealblocks/text';

/** The icon of a new list. */
export const DEFAULT_ICON = 'check';

/** The Icon and the Container cannot be moved or removed from their item. */
export const LOCKED = { move: true, remove: true };

/**
 * A new item's Container: plain flow, its blocks 0.25em apart. Its own Block
 * spacing setting, so the author can change it on the Container.
 */
export const BODY_ATTRIBUTES = {
	layout: { type: 'default' },
	style: { spacing: { blockGap: '0.25em' } },
};

/** A new item's Text. */
export const TEXT_ATTRIBUTES = {
	placeholder: __( 'List item', 'zealblocks' ),
};

/**
 * An item's inner blocks, as a block template.
 *
 * @param {string} icon The list's icon.
 * @return {Array} The template.
 */
export function itemTemplate( icon ) {
	return [
		[ ICON, { icon: icon || DEFAULT_ICON, lock: LOCKED } ],
		[
			BODY,
			{ ...BODY_ATTRIBUTES, lock: LOCKED },
			[ [ TEXT, TEXT_ATTRIBUTES ] ],
		],
	];
}

/**
 * One-click icons. MUST match Editor_Provider::LIST_PRESETS, which preloads
 * them; BlockContractTest compares the two.
 */
export const ICON_PRESETS = [
	'check',
	'circle-check',
	'arrow-right',
	'chevron-right',
	'star',
	'circle',
	'minus',
];

/** MUST match render.php's allow-list and block.json's enum. */
export const ORDERED_TYPES = [
	{ value: 'decimal', label: '1, 2, 3' },
	{ value: 'decimal-leading-zero', label: '01, 02, 03' },
	{ value: 'lower-alpha', label: 'a, b, c' },
	{ value: 'upper-alpha', label: 'A, B, C' },
	{ value: 'lower-roman', label: 'i, ii, iii' },
	{ value: 'upper-roman', label: 'I, II, III' },
];

/** Keys under `style.zealblocks`. */
export const KEYS = {
	itemGap: 'itemGap',
	iconSize: 'iconSize',
	iconGap: 'iconGap',
	iconColor: 'iconColor',
	markerColor: 'markerColor',
	markerSize: 'markerSize',
};

/** The custom properties render.php writes for them. */
export const CSS_VARS = {
	[ KEYS.itemGap ]: '--zealblocks-list-gap',
	[ KEYS.iconSize ]: '--zealblocks-list-icon-size',
	[ KEYS.iconGap ]: '--zealblocks-list-icon-gap',
	[ KEYS.iconColor ]: '--zealblocks-list-icon-color',
	[ KEYS.markerColor ]: '--zealblocks-list-marker-color',
	[ KEYS.markerSize ]: '--zealblocks-list-marker-size',
};

export const SIZE_UNITS = [ 'px', 'em', 'rem' ];

/**
 * The hover variable prefix. MUST match render.php's Hover::properties() call
 * and the selectors in style.scss and editor.scss; BlockContractTest checks.
 */
export const HOVER_PREFIX = '--zealblocks-list-hover-';
