/**
 * Container — the layout presets offered when a new container is empty.
 *
 * Each is a core grid, so the columns, the gap and the children's spans are
 * core's own layout attributes and stay editable with core's controls. On
 * mobile every preset drops to one column, and a wide child's span drops with
 * it: a span of 2 in a one-column grid would make the browser add a column.
 */

import { __ } from '@wordpress/i18n';

import { presetIcon } from './icons';

/**
 * A child container spanning some columns, back to one on mobile.
 *
 * Its layout is set, not left to the default: a Container with no layout and
 * no children shows the presets picker, and a column should not.
 *
 * @param {number} span Columns on desktop and tablet.
 * @return {Array} An inner-blocks template entry.
 */
const column = ( span = 1 ) => [
	'zealblocks/container',
	{
		layout: { type: 'constrained' },
		...( 1 === span
			? {}
			: {
					style: {
						layout: { columnSpan: span },
						'@mobile': { layout: { columnSpan: 1 } },
					},
			  } ),
	},
];

/**
 * A grid preset.
 *
 * @param {string}   name    Preset name.
 * @param {string}   label   What the picker calls it.
 * @param {number}   columns Tracks on desktop.
 * @param {number[]} spans   Each child's span.
 * @param {Object}   options `tablet`: tracks on tablet; `rows`: for the icon.
 * @return {Object} The preset.
 */
const grid = ( name, label, columns, spans, options = {} ) => ( {
	name,
	label,
	icon: presetIcon( spans, columns, options.rows ),
	layout: { type: 'grid', columnCount: columns },
	style: {
		...( options.tablet
			? { '@tablet': { layout: { columnCount: options.tablet } } }
			: {} ),
		'@mobile': { layout: { columnCount: 1 } },
	},
	innerBlocks: spans.map( column ),
} );

export const PRESETS = [
	grid( 'halves', __( 'Two columns', 'zealblocks' ), 2, [ 1, 1 ] ),
	grid( 'thirds', __( 'Three columns', 'zealblocks' ), 3, [ 1, 1, 1 ] ),
	grid( 'quarters', __( 'Four columns', 'zealblocks' ), 4, [ 1, 1, 1, 1 ], {
		tablet: 2,
	} ),
	grid(
		'one-third-two-thirds',
		__( 'One third, two thirds', 'zealblocks' ),
		3,
		[ 1, 2 ]
	),
	grid(
		'two-thirds-one-third',
		__( 'Two thirds, one third', 'zealblocks' ),
		3,
		[ 2, 1 ]
	),
	grid(
		'wide-centre',
		__( 'Wide centre, narrow sides', 'zealblocks' ),
		4,
		[ 1, 2, 1 ]
	),
	grid( 'two-by-two', __( 'Two by two', 'zealblocks' ), 2, [ 1, 1, 1, 1 ], {
		rows: 2,
	} ),
];

/**
 * Merge a preset's per-device layout into the block's `style`.
 *
 * @param {?Object} style  The block's `style` attribute.
 * @param {Object}  preset The preset.
 * @return {Object} The new `style`.
 */
export function withPresetStyle( style, preset ) {
	const next = { ...( style || {} ) };

	Object.entries( preset.style ).forEach( ( [ stateKey, layer ] ) => {
		next[ stateKey ] = {
			...( next[ stateKey ] || {} ),
			layout: { ...( next[ stateKey ]?.layout || {} ), ...layer.layout },
		};
	} );

	return next;
}
