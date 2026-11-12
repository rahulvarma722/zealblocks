/**
 * Button — writing the hover shadow, one part at a time.
 */

import { getStateValue, setStateValue } from './responsive-width/style-value';
import { SHADOW_HOVER_KEYS, SHADOW_HOVER_DEFAULTS } from './constants';

/**
 * Clear keys on one layer.
 *
 * @param {?Object}  style    The block's `style` attribute.
 * @param {?string}  stateKey Layer being edited, null for the base.
 * @param {string[]} keys     Keys to clear.
 * @return {Object|undefined} The new `style`.
 */
export function clearKeys( style, stateKey, keys ) {
	return keys.reduce(
		( next, key ) => setStateValue( next, stateKey, undefined, key ),
		style
	);
}

/**
 * Write one hover-shadow part, seeding the others the first time a shadow
 * appears, as the Text block's shadow does.
 *
 * Without seeding, a colour picked on its own would combine with the
 * stylesheet's fallbacks, which are Spectra's default shadow; that is visible,
 * but the author would see sliders sitting at nothing. When neither this layer
 * nor the base holds any part yet, the remaining parts are filled with
 * SHADOW_HOVER_DEFAULTS in the same write.
 *
 * @param {?Object}          style    The block's `style` attribute.
 * @param {?string}          stateKey Layer being edited.
 * @param {string}           key      Part being set.
 * @param {string|undefined} value    New value.
 * @return {Object|undefined} The new `style`.
 */
export function setShadowHoverValue( style, stateKey, key, value ) {
	const isFirst =
		undefined !== value &&
		SHADOW_HOVER_KEYS.every(
			( part ) =>
				undefined === getStateValue( style, stateKey, part ) &&
				undefined === getStateValue( style, null, part )
		);

	let next = setStateValue( style, stateKey, value, key );

	if ( isFirst ) {
		SHADOW_HOVER_KEYS.filter( ( part ) => part !== key ).forEach(
			( part ) => {
				next = setStateValue(
					next,
					stateKey,
					SHADOW_HOVER_DEFAULTS[ part ],
					part
				);
			}
		);
	}

	return next;
}
