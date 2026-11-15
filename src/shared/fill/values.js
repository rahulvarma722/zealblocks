/**
 * Fill — one stored value that holds a colour OR a gradient. Pure helpers,
 * unit-tested directly; the hook that uses them is in index.js.
 */

const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\(/;

/**
 * Whether a stored fill is a gradient: a gradient function, or a preset one.
 *
 * @param {?string} value Stored fill.
 * @return {boolean} True for a gradient.
 */
export function isGradient( value ) {
	return (
		'string' === typeof value &&
		( GRADIENT.test( value ) ||
			value.startsWith( 'var(--wp--preset--gradient--' ) )
	);
}

/**
 * What one call of a tabbed colour/gradient control should do.
 *
 * Core's ColorGradientControl, when it offers both tabs, calls the handler of
 * the tab used and then the OTHER handler with no value: picking a colour is
 * `onColorChange( colour )` then `onGradientChange()`. With both writing one
 * key, the second call cleared what the first had just stored.
 *
 * So a value always writes, and no value clears only when what is stored is
 * of the handler's own type: the colour handler clears a colour, never a
 * gradient, and the other way round.
 *
 * @param {?string} current What is stored now.
 * @param {string}  type    'color' or 'gradient': whose handler this is.
 * @param {?string} next    The value the control passed, if any.
 * @return {{change: boolean, value: (string|undefined)}} What to write.
 */
export function nextFill( current, type, next ) {
	if ( undefined !== next && '' !== next ) {
		return { change: true, value: next };
	}

	const stored = isGradient( current ) ? 'gradient' : 'color';

	return undefined !== current && stored === type
		? { change: true, value: undefined }
		: { change: false, value: current };
}
