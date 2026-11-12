/**
 * Display conditions — reading and writing the `displayConditions` attribute.
 */

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

/**
 * Whether any condition is set.
 *
 * setCondition() never stores an inactive one, so a non-empty object means
 * something hides the block: the editor marks it, and
 * Display_Conditions::has_any() agrees on the server.
 *
 * @param {?Object} conditions The `displayConditions` attribute.
 * @return {boolean} Whether the block has a condition.
 */
export function hasConditions( conditions ) {
	return !! conditions && Object.keys( conditions ).length > 0;
}
