/**
 * Container — pure helpers for the overlay and order controls. No React and
 * no editor packages, so they are unit-tested directly.
 */

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import {
	KEYS,
	ORDER_FIRST,
	ORDER_LAST,
	OVERLAY_DEFAULT_OPACITY,
} from './constants';

/** A gradient, as opposed to a colour, in a stored overlay fill. */
export const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/;

/**
 * Write the overlay fill, and seed the opacity the first time an overlay
 * appears: a full-strength black over a photo is never what an author meant,
 * and 50% is where Elementor starts too.
 *
 * @param {?Object} style    The block's `style` attribute.
 * @param {?string} stateKey Layer being edited.
 * @param {string}  key      `overlay` or `overlayHover`.
 * @param {?string} value    Colour or gradient, or undefined to clear.
 * @return {Object|undefined} The new `style`.
 */
export function setOverlayFill( style, stateKey, key, value ) {
	const isFirst =
		undefined !== value &&
		[ null, '@tablet', '@mobile' ].every(
			( layer ) =>
				undefined === getStateValue( style, layer, KEYS.overlay ) &&
				undefined === getStateValue( style, layer, KEYS.overlayOpacity )
		);

	const next = setStateValue( style, stateKey, value, key );

	return isFirst && KEYS.overlay === key
		? setStateValue(
				next,
				null,
				OVERLAY_DEFAULT_OPACITY,
				KEYS.overlayOpacity
		  )
		: next;
}

/**
 * A stored opacity ('0.5') as the percentage a slider shows.
 *
 * @param {?string} value Stored value.
 * @return {number|undefined} 0 to 100.
 */
export function toPercent( value ) {
	const number = parseFloat( value );

	return Number.isFinite( number ) ? Math.round( number * 100 ) : undefined;
}

/**
 * A slider percentage as the opacity stored.
 *
 * @param {?number} percent 0 to 100.
 * @return {string|undefined} '0' to '1'.
 */
export function fromPercent( percent ) {
	return undefined === percent || Number.isNaN( percent )
		? undefined
		: String( Math.max( 0, Math.min( 100, percent ) ) / 100 );
}

/**
 * Which of the order choices a stored value is.
 *
 * @param {?string} value Stored order.
 * @return {string} '', 'first', 'last' or 'custom'.
 */
export function orderMode( value ) {
	if ( undefined === value || '' === value ) {
		return '';
	}

	if ( ORDER_FIRST === value ) {
		return 'first';
	}

	return ORDER_LAST === value ? 'last' : 'custom';
}
