/**
 * Reading and writing a namespaced value inside core's `style` attribute.
 *
 * All four functions take and return plain objects and never mutate their
 * input, so they are equally usable from the control, from a reset filter and
 * from a test.
 */

import {
	STYLE_NAMESPACE,
	WIDTH_KEY,
	VIEWPORT_STATE_BY_DEVICE,
} from './constants';

/**
 * The value stored for one exact state — no fallback.
 *
 * This is what the CONTROL shows. A control must display only what is set for
 * the state being edited, so an unset tablet value renders an empty field
 * rather than the desktop number. Showing the inherited value instead would be
 * a lie: the user would see 200px on Tablet, change nothing, and wrongly
 * believe a tablet override exists.
 *
 * @param {?Object} style    The block's `style` attribute.
 * @param {?string} stateKey `'@tablet'`, `'@mobile'`, or null for the base.
 * @param {string}  key      Property under the namespace. Defaults to width so
 *                           the original single-property callers are unchanged.
 * @return {string|undefined} The stored value, or undefined when unset.
 */
export function getStateValue( style, stateKey, key = WIDTH_KEY ) {
	const layer = stateKey ? style?.[ stateKey ] : style;

	return layer?.[ STYLE_NAMESPACE ]?.[ key ];
}

/**
 * The value that actually applies at a given device — with fallback.
 *
 * This is what the PREVIEW shows, and it follows core's resolution model
 * exactly: each viewport state is an independent override of the base, merged
 * as `array_replace( base, state )` against mutually exclusive media queries.
 *
 * So mobile falls back to the BASE, never to tablet. That is the single
 * biggest behavioural difference from a pre-7.1 responsive generator, which
 * resolved `sm -> md -> lg` and therefore let a tablet value apply on phones.
 *
 * @param {?Object} style  The block's `style` attribute.
 * @param {string}  device Core device name — 'Desktop' | 'Tablet' | 'Mobile'.
 * @param {string}  key    Property under the namespace.
 * @return {string|undefined} The effective value, or undefined.
 */
export function getResolvedValue( style, device, key = WIDTH_KEY ) {
	const stateKey = VIEWPORT_STATE_BY_DEVICE[ device ] ?? null;

	if ( ! stateKey ) {
		return getStateValue( style, null, key );
	}

	return (
		getStateValue( style, stateKey, key ) ??
		getStateValue( style, null, key )
	);
}

/**
 * Remove keys that have become empty objects.
 *
 * Without this, clearing the last value in a state leaves
 * `{ '@tablet': { 'zealblocks': {} } }` behind, which serializes into the post
 * content as noise and makes `hasValue()` checks read as true. Core does the
 * same thing through its own `cleanEmptyObject`.
 *
 * @param {Object} object Object to prune. Not mutated.
 * @return {Object|undefined} Pruned copy, or undefined if nothing is left.
 */
function prune( object ) {
	const result = {};

	Object.keys( object ).forEach( ( key ) => {
		const value = object[ key ];

		if ( value && typeof value === 'object' && ! Array.isArray( value ) ) {
			const pruned = prune( value );

			if ( pruned ) {
				result[ key ] = pruned;
			}

			return;
		}

		if ( value !== undefined && value !== '' ) {
			result[ key ] = value;
		}
	} );

	return Object.keys( result ).length ? result : undefined;
}

/**
 * Set (or clear) the value for one state, returning a new `style`.
 *
 * Pass `undefined` as the value to clear. Clearing a viewport state does not
 * touch the base, which is what makes "reset Tablet" reveal the Desktop value
 * rather than removing it.
 *
 * @param {?Object}          style    The block's current `style` attribute.
 * @param {?string}          stateKey `'@tablet'`, `'@mobile'`, or null.
 * @param {string|undefined} value    The new value, or undefined to clear.
 * @param {string}           key      Property under the namespace.
 * @return {Object|undefined} The new `style`, or undefined when empty.
 */
export function setStateValue( style, stateKey, value, key = WIDTH_KEY ) {
	const next = { ...( style || {} ) };

	if ( ! stateKey ) {
		next[ STYLE_NAMESPACE ] = {
			...( next[ STYLE_NAMESPACE ] || {} ),
			[ key ]: value,
		};

		return prune( next );
	}

	next[ stateKey ] = {
		...( next[ stateKey ] || {} ),
		[ STYLE_NAMESPACE ]: {
			...( next[ stateKey ]?.[ STYLE_NAMESPACE ] || {} ),
			[ key ]: value,
		},
	};

	return prune( next );
}
