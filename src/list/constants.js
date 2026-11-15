/**
 * List — names shared by the list, its items and the Text inside them.
 */

import { __ } from '@wordpress/i18n';

export const LIST = 'zealblocks/list';
export const ITEM = 'zealblocks/list-item';
export const TEXT = 'zealblocks/text';

/** What an item's content area accepts. */
export const ITEM_BLOCKS = [
	TEXT,
	LIST,
	'zealblocks/buttons',
	'zealblocks/icon',
	'zealblocks/container',
	'core/image',
	'core/paragraph',
	'core/heading',
];

/** A new item: a Text, ready to type in. */
export const ITEM_TEMPLATE = [
	[ TEXT, { placeholder: __( 'List item', 'zealblocks' ) } ],
];

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

/** An item's icon value that switches its icon off. */
export const ICON_NONE = 'none';

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
