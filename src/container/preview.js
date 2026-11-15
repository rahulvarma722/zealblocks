/**
 * Container — what the canvas shows for the previewed device.
 *
 * The front end gets real per-band rules from render.php. The canvas has no
 * stylesheet of ours per instance, so values are resolved for the previewed
 * device and applied inline, as the Button does. Each mirrors a rule in
 * render.php or style.scss.
 */

import {
	getStateValue,
	getResolvedValue,
} from '../button/responsive-width/style-value';
import { VIEWPORT_STATE_BY_DEVICE } from '../button/responsive-width/constants';
import { getHoverPreview } from '../shared/hover/preview';
import { HOVER_CLASS } from '../shared/hover/constants';
import {
	CSS_VARS,
	HOVER_VAR_PREFIX,
	KEYS,
	SHADOW_HOVER_KEYS,
} from './constants';

const LAYERS = Object.values( VIEWPORT_STATE_BY_DEVICE );

/**
 * Whether any layer holds any of the keys.
 *
 * @param {?Object}  style The block's `style` attribute.
 * @param {string[]} keys  Keys under `style.zealblocks`.
 * @return {boolean} True when one is set somewhere.
 */
function hasAnyLayerValue( style, keys ) {
	return LAYERS.some( ( layer ) =>
		keys.some( ( key ) => undefined !== getStateValue( style, layer, key ) )
	);
}

/**
 * The flex direction for the previewed device, as Reverse_Order works it out:
 * that device's orientation (core's layout, falling back to the base layer)
 * and that device's reverse flag (falling back to the base layer).
 *
 * @param {?Object} layout The block's `layout` attribute.
 * @param {?Object} style  The block's `style` attribute.
 * @param {string}  device Core device name.
 * @return {string|undefined} A flex-direction, or undefined when no device is
 *                            reversed: then core's own direction stands.
 */
export function getPreviewDirection( layout, style, device ) {
	const isReversedSomewhere = LAYERS.some(
		( layer ) => true === getStateValue( style, layer, KEYS.reverse )
	);

	if ( 'flex' !== layout?.type || ! isReversedSomewhere ) {
		return undefined;
	}

	const stateKey = VIEWPORT_STATE_BY_DEVICE[ device ] ?? null;
	const orientation =
		( stateKey && style?.[ stateKey ]?.layout?.orientation ) ||
		layout?.orientation ||
		'horizontal';
	const reverse = true === getResolvedValue( style, device, KEYS.reverse );

	return (
		( 'vertical' === orientation ? 'column' : 'row' ) +
		( reverse ? '-reverse' : '' )
	);
}

/**
 * Inline style and classes for the canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} device     Core device name.
 * @return {{style: Object, classes: string[]}} What to merge into blockProps.
 */
export function getStylePreview( attributes, device ) {
	const { style, layout } = attributes;
	const hover = getHoverPreview( style, device, HOVER_VAR_PREFIX );
	const inline = { ...hover.style };
	const classes = [ ...hover.classes ];

	[ KEYS.borderHover, KEYS.lift, ...SHADOW_HOVER_KEYS ].forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ CSS_VARS[ key ] ] = value;
		}
	} );

	[
		[ KEYS.maxWidth, 'maxWidth' ],
		[ KEYS.maxHeight, 'maxHeight' ],
		[ KEYS.overflow, 'overflow' ],
	].forEach( ( [ key, property ] ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ property ] = value;
		}
	} );

	const direction = getPreviewDirection( layout, style, device );

	if ( direction ) {
		inline.flexDirection = direction;
	}

	if ( inline[ CSS_VARS[ KEYS.borderHover ] ] ) {
		classes.push( 'has-hover-border' );
	}

	const hasShadowHover = hasAnyLayerValue( style, SHADOW_HOVER_KEYS );
	const hasLift = hasAnyLayerValue( style, [ KEYS.lift ] );

	if ( hasShadowHover ) {
		classes.push( 'has-shadow-hover' );
	}

	if ( hasLift ) {
		classes.push( 'has-hover-lift' );
	}

	// render.php switches the transition on for a border, shadow or lift alone.
	if (
		! classes.includes( HOVER_CLASS ) &&
		( hasShadowHover ||
			hasLift ||
			hasAnyLayerValue( style, [ KEYS.borderHover ] ) )
	) {
		classes.unshift( HOVER_CLASS );
	}

	return { style: inline, classes };
}
