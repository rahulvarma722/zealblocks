/**
 * Text — what the canvas shows for the previewed device.
 *
 * Pure: takes the block's `style` attribute and a device name, returns the
 * inline style and classes for the block root. No React, no WordPress, so it is
 * unit-tested directly.
 *
 * It mirrors render.php, with one deliberate difference. The front end gets
 * real per-band `:hover` rules; the canvas cannot, so hover colours are
 * resolved for the previewed device and carried as custom properties, with a
 * class that exists only when that device HAS a value (see editor.scss).
 */

import {
	getStateValue,
	getResolvedValue,
} from '../button/responsive-width/style-value';

import { Z_INDEX_CLASS } from '../shared/z-index/constants';
import { KEYS, SHADOW_KEYS, POSITION_KEYS, CSS_VARS } from './constants';

/**
 * Inline style property for each position key — what render.php's rules
 * declare, in React's camelCase.
 */
const POSITION_STYLE = {
	[ KEYS.zIndex ]: 'zIndex',
	[ KEYS.position ]: 'position',
	[ KEYS.top ]: 'top',
	[ KEYS.right ]: 'right',
	[ KEYS.bottom ]: 'bottom',
	[ KEYS.left ]: 'left',
	[ KEYS.overflow ]: 'overflow',
};

const LAYERS = [ null, '@tablet', '@mobile' ];

/**
 * Whether any layer stores any of the given keys.
 *
 * The shadow and hover classes are present in EVERY band once any band uses
 * them, exactly as render.php derives them from the rules of all bands. A
 * shadow set for Mobile only must still be switched on at Mobile, and its
 * variables then simply resolve to nothing at Desktop.
 *
 * @param {?Object}  style The block's `style` attribute.
 * @param {string[]} keys  Keys under the namespace.
 * @return {boolean} Whether any is set.
 */
export function hasAnyLayerValue( style, keys ) {
	return LAYERS.some( ( layer ) =>
		keys.some( ( key ) => undefined !== getStateValue( style, layer, key ) )
	);
}

/**
 * Inline style and classes for the block root at a device.
 *
 * Position, offsets, overflow and z-index are previewed only while
 * `previewPosition` is on. An absolutely positioned block can sit on top of
 * the blocks around it and be hard to select, so the author can turn the
 * preview off — the front end is unaffected either way.
 *
 * @param {?Object} style                     The block's `style` attribute.
 * @param {string}  device                    Core device name — 'Desktop' | 'Tablet' | 'Mobile'.
 * @param {Object}  [options]
 * @param {boolean} [options.previewPosition] Whether to preview position. Default true.
 * @return {{style: Object, classes: string[]}} What to merge into blockProps.
 */
export function getPreview( style, device, { previewPosition = true } = {} ) {
	const inline = {};
	const classes = [];

	const columnGap = getResolvedValue( style, device, KEYS.columnGap );

	if ( columnGap ) {
		inline.columnGap = columnGap;
	}

	if ( hasAnyLayerValue( style, SHADOW_KEYS ) ) {
		classes.push( 'has-text-shadow' );
	}

	// Resolved per KEY, not per shadow: a tablet override of the colour alone
	// keeps the desktop offsets, which is what the cascade does on the front
	// end where each key is its own custom property.
	[ ...SHADOW_KEYS, KEYS.hoverDuration ].forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( value ) {
			inline[ CSS_VARS[ key ] ] = value;
		}
	} );

	if ( hasAnyLayerValue( style, [ KEYS.textHover, KEYS.backgroundHover ] ) ) {
		classes.push( 'has-hover' );
	}

	const textHover = getResolvedValue( style, device, KEYS.textHover );

	if ( textHover ) {
		inline[ CSS_VARS[ KEYS.textHover ] ] = textHover;
		classes.push( 'has-hover-color' );
	}

	const backgroundHover = getResolvedValue(
		style,
		device,
		KEYS.backgroundHover
	);

	if ( backgroundHover ) {
		inline[ CSS_VARS[ KEYS.backgroundHover ] ] = backgroundHover;
		classes.push( 'has-hover-background' );
	}

	if ( previewPosition ) {
		[ KEYS.zIndex, ...POSITION_KEYS ].forEach( ( key ) => {
			const value = getResolvedValue( style, device, key );

			if ( undefined !== value && '' !== value ) {
				inline[ POSITION_STYLE[ key ] ] = value;
			}
		} );

		// The same zero-specificity `position: relative` the front end gets,
		// so a z-index alone takes effect here too.
		if ( hasAnyLayerValue( style, [ KEYS.zIndex ] ) ) {
			classes.push( Z_INDEX_CLASS );
		}
	}

	return { style: inline, classes };
}
