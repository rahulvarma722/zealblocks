/**
 * Position — what the canvas shows for the previewed device: the position
 * and its offsets as inline style, resolved per key as render.php's per-band
 * rules resolve.
 */

import { getResolvedValue } from '../../button/responsive-width/style-value';
import { POSITION_ITEM_KEYS, POSITION_STYLE } from './constants';

/**
 * @param {?Object} style  The block's `style` attribute.
 * @param {string}  device Core device name.
 * @return {Object} Inline style.
 */
export function getPositionPreview( style, device ) {
	const inline = {};

	POSITION_ITEM_KEYS.forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ POSITION_STYLE[ key ] ] = value;
		}
	} );

	return inline;
}
