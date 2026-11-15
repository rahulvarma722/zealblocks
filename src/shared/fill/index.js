/**
 * Fill, shared: the handlers for one `style.zealblocks` key that holds a
 * colour or a gradient, edited with core's tabbed colour/gradient control.
 *
 * Used by the shared hover background, and by the Container's overlay. See
 * values.js for what core's control does and why a plain setter loses every
 * pick.
 */

import { useRef } from '@wordpress/element';

import {
	getStateValue,
	setStateValue,
} from '../../button/responsive-width/style-value';
import { isGradient, nextFill } from './values';

export { isGradient, nextFill } from './values';

/**
 * The two calls of one pick happen before the block re-renders, so both would
 * read the same stale `style`, and the second write would undo the first. The
 * handlers read and write the latest style through a ref instead.
 *
 * @param {?Object}  style         The block's `style` attribute.
 * @param {?string}  stateKey      Layer being edited, null for the base.
 * @param {Function} setAttributes Attribute setter.
 * @return {Function} ( key, write? ) => { colorValue, gradientValue,
 *                    onColorChange, onGradientChange }, for one settings
 *                    entry of ColorGradientSettingsDropdown. `write( style,
 *                    stateKey, key, value )` returns the new style; it
 *                    defaults to setting the key.
 */
export function useFillHandlers( style, stateKey, setAttributes ) {
	const latest = useRef( style );

	latest.current = style;

	return (
		key,
		write = ( from, layer, name, value ) =>
			setStateValue( from, layer, value, name )
	) => {
		const current = getStateValue( style, stateKey, key );
		const handle = ( type ) => ( next ) => {
			const { change, value } = nextFill(
				getStateValue( latest.current, stateKey, key ),
				type,
				next
			);

			if ( ! change ) {
				return;
			}

			latest.current = write( latest.current, stateKey, key, value );
			setAttributes( { style: latest.current } );
		};

		return {
			colorValue: isGradient( current ) ? undefined : current,
			gradientValue: isGradient( current ) ? current : undefined,
			onColorChange: handle( 'color' ),
			onGradientChange: handle( 'gradient' ),
		};
	};
}
