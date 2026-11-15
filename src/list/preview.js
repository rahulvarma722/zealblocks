/**
 * List — what the canvas shows for the previewed device: the per-device
 * values as the same custom properties render.php writes. Pure, so it is
 * unit-tested directly.
 */

import { getResolvedValue } from '../button/responsive-width/style-value';
import { CSS_VARS } from './constants';

/**
 * @param {?Object}  style  The block's `style` attribute.
 * @param {string}   device Core device name.
 * @param {string[]} keys   Keys under `style.zealblocks` to resolve.
 * @return {Object} Inline custom properties.
 */
export function getListPreview(
	style,
	device,
	keys = Object.keys( CSS_VARS )
) {
	const inline = {};

	keys.forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ CSS_VARS[ key ] ] = value;
		}
	} );

	return inline;
}
