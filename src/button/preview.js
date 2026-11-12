/**
 * Button — what the canvas shows for the hover, icon and shadow styling.
 *
 * Pure: takes the block's `style` attribute and a device name, returns the
 * inline style and classes for the block root. Unit-tested directly.
 *
 * It mirrors render.php, with the shared hover difference: the front end gets
 * real per-band hover rules, the canvas gets the value for the PREVIEWED device
 * as a custom property and a class that exists only when that device has one.
 */

import {
	getStateValue,
	getResolvedValue,
} from './responsive-width/style-value';
import { VIEWPORT_STATE_BY_DEVICE } from './responsive-width/constants';
import { getHoverPreview } from '../shared/hover/preview';
import { HOVER_CLASS } from '../shared/hover/constants';
import {
	KEYS,
	CSS_VARS,
	HOVER_VAR_PREFIX,
	SHADOW_HOVER_KEYS,
} from './constants';

const LAYERS = Object.values( VIEWPORT_STATE_BY_DEVICE );

/**
 * Whether any layer stores any of the given keys.
 *
 * @param {?Object}  style The block's `style` attribute.
 * @param {string[]} keys  Keys under the namespace.
 * @return {boolean} Whether any is set.
 */
function hasAnyLayerValue( style, keys ) {
	return LAYERS.some( ( layer ) =>
		keys.some( ( key ) => undefined !== getStateValue( style, layer, key ) )
	);
}

/**
 * Inline style and classes for the block root at a device.
 *
 * @param {?Object} style  The block's `style` attribute.
 * @param {string}  device Core device name — 'Desktop' | 'Tablet' | 'Mobile'.
 * @return {{style: Object, classes: string[]}} What to merge into blockProps.
 */
export function getStylePreview( style, device ) {
	const hover = getHoverPreview( style, device, HOVER_VAR_PREFIX );
	const inline = { ...hover.style };
	const classes = [ ...hover.classes ];

	// Variables the stylesheet spends on the icon and the shadow, resolved per
	// KEY so a tablet override of one part keeps the others.
	[
		KEYS.iconGap,
		KEYS.iconColor,
		KEYS.iconHover,
		KEYS.borderHover,
		...SHADOW_HOVER_KEYS,
	].forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ CSS_VARS[ key ] ] = value;
		}
	} );

	// Like the text and background classes: only where this device has a
	// border hover, so the canvas rule never reads an undefined variable.
	if ( inline[ CSS_VARS[ KEYS.borderHover ] ] ) {
		classes.push( 'has-hover-border' );
	}

	const hasShadowHover = hasAnyLayerValue( style, SHADOW_HOVER_KEYS );

	if ( hasShadowHover ) {
		classes.push( 'has-shadow-hover' );
	}

	// render.php switches the transition on for a shadow or icon hover alone.
	if (
		! classes.includes( HOVER_CLASS ) &&
		( hasShadowHover ||
			hasAnyLayerValue( style, [ KEYS.iconHover, KEYS.borderHover ] ) )
	) {
		classes.unshift( HOVER_CLASS );
	}

	return { style: inline, classes };
}
