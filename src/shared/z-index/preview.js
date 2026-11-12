/**
 * Z-index — what the canvas shows, for a block with no Position panel.
 *
 * Pure, so it is unit-tested directly. Text does not use this: its z-index is
 * previewed with its position, behind the "Preview in editor" toggle, since an
 * absolutely positioned block can be hard to select. A z-index alone cannot
 * cause that, so here it is always previewed.
 */

import {
	getStateValue,
	getResolvedValue,
} from '../../button/responsive-width/style-value';
import { VIEWPORT_STATE_BY_DEVICE } from '../../button/responsive-width/constants';
import { Z_INDEX_KEY, Z_INDEX_CLASS } from './constants';

/**
 * Inline style and classes for the block root at a device.
 *
 * The class is present at EVERY device once any layer has a z-index, exactly
 * as Z_Index::classes() derives it from the rules of all bands, so a
 * Mobile-only z-index still takes effect at Mobile.
 *
 * @param {?Object} style  The block's `style` attribute.
 * @param {string}  device Core device name — 'Desktop' | 'Tablet' | 'Mobile'.
 * @return {{style: Object, classes: string[]}} Empty when no layer has a z-index.
 */
export function getZIndexPreview( style, device ) {
	const hasAny = Object.values( VIEWPORT_STATE_BY_DEVICE ).some(
		( layer ) => undefined !== getStateValue( style, layer, Z_INDEX_KEY )
	);

	if ( ! hasAny ) {
		return { style: {}, classes: [] };
	}

	const value = getResolvedValue( style, device, Z_INDEX_KEY );

	return {
		style: undefined !== value && '' !== value ? { zIndex: value } : {},
		classes: [ Z_INDEX_CLASS ],
	};
}
