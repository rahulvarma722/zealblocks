/**
 * Text — pure read/write helpers for the per-viewport style values.
 *
 * Kept apart from style-controls.js so they can be unit-tested without loading
 * any WordPress package.
 */

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';

import { SHADOW_KEYS, SHADOW_DEFAULTS } from './constants';

/**
 * Clear several keys in one state layer, leaving every other layer alone.
 *
 * Clearing Tablet must reveal the Desktop value rather than remove it, which
 * is why this is scoped to `stateKey` — the same reason the Button scopes its
 * reset filters by hand (see src/button/responsive-width/index.js).
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
 * Write one shadow part, seeding the others the first time a shadow appears.
 *
 * The stylesheet's fallbacks draw nothing (style.scss explains why), so a
 * colour picked on its own would produce an invisible shadow. When neither
 * this layer nor the base holds any shadow part yet, the remaining parts are
 * filled with SHADOW_DEFAULTS in the same write.
 *
 * @param {?Object}          style    The block's `style` attribute.
 * @param {?string}          stateKey Layer being edited.
 * @param {string}           key      Shadow key being set.
 * @param {string|undefined} value    New value.
 * @return {Object|undefined} The new `style`.
 */
export function setShadowValue( style, stateKey, key, value ) {
	const isFirst =
		undefined !== value &&
		SHADOW_KEYS.every(
			( part ) =>
				undefined === getStateValue( style, stateKey, part ) &&
				undefined === getStateValue( style, null, part )
		);

	let next = setStateValue( style, stateKey, value, key );

	if ( isFirst ) {
		SHADOW_KEYS.filter( ( part ) => part !== key ).forEach( ( part ) => {
			next = setStateValue(
				next,
				stateKey,
				SHADOW_DEFAULTS[ part ],
				part
			);
		} );
	}

	return next;
}

/**
 * Set one display condition, dropping it when it no longer hides anything.
 *
 * An off toggle, an empty select and an empty day list are all removed rather
 * than stored, so `displayConditions` holds only what is active: post content
 * stays clean, and "has any condition" is simply "is the object non-empty".
 *
 * @param {?Object} conditions The `displayConditions` attribute.
 * @param {string}  key        Condition key.
 * @param {*}       value      New value.
 * @return {Object} The new object.
 */
export function setCondition( conditions, key, value ) {
	const next = { ...( conditions || {} ) };
	const isEmpty =
		undefined === value ||
		false === value ||
		'' === value ||
		( Array.isArray( value ) && ! value.length );

	if ( isEmpty ) {
		delete next[ key ];
	} else {
		next[ key ] = value;
	}

	return next;
}
