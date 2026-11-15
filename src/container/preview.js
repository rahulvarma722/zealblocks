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
import { getPositionPreview } from '../shared/position/preview';
import {
	CSS_VARS,
	HOVER_VAR_PREFIX,
	KEYS,
	OVERLAY_HOVER_KEYS,
	OVERLAY_IMAGE_SIZES,
	OVERLAY_KEYS,
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
 * A focal point as `x% y%`, as Render::focal_point() prints it.
 *
 * @param {?Object} point `{ x, y }`, each 0 to 1.
 * @return {string} The position; the centre for none or junk.
 */
export function focalPosition( point ) {
	const clamp = ( value ) =>
		Math.max( 0, Math.min( 100, Math.round( value * 10000 ) / 100 ) );

	if (
		! Number.isFinite( Number( point?.x ) ) ||
		! Number.isFinite( Number( point?.y ) )
	) {
		return '50% 50%';
	}

	return `${ clamp( Number( point.x ) ) }% ${ clamp( Number( point.y ) ) }%`;
}

/**
 * The overlay image as the background layer render.php writes, or undefined.
 *
 * @param {Object} attributes Block attributes.
 * @return {string|undefined} The layer.
 */
export function getOverlayImageLayer( attributes ) {
	const url = attributes?.overlayImage?.url;

	if ( ! url ) {
		return undefined;
	}

	const size = OVERLAY_IMAGE_SIZES.includes( attributes.overlayImageSize )
		? attributes.overlayImageSize
		: 'cover';

	// Encoded as render.php encodes it, for the same characters.
	const safe = url.replace(
		/[;()'\\ ]/g,
		( character ) =>
			( {
				';': '%3B',
				'(': '%28',
				')': '%29',
				"'": '%27',
				'\\': '%5C',
				' ': '%20',
			} )[ character ]
	);

	return `url("${ safe }") ${ focalPosition(
		attributes.overlayImagePosition
	) } / ${ 'repeat' === size ? 'auto repeat' : `${ size } no-repeat` }`;
}

/**
 * Inline style and classes for the canvas.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} device     Core device name.
 * @return {{style: Object, classes: string[]}} What to merge into blockProps.
 */
export function getStylePreview( attributes, device ) {
	const { style, layout, positionPreview } = attributes;
	const hover = getHoverPreview( style, device, HOVER_VAR_PREFIX );
	const inline = { ...hover.style };
	const classes = [ ...hover.classes ];

	[
		KEYS.borderHover,
		KEYS.lift,
		...SHADOW_HOVER_KEYS,
		...OVERLAY_KEYS,
	].forEach( ( key ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ CSS_VARS[ key ] ] = value;
		}
	} );

	[
		[ KEYS.maxWidth, 'maxWidth' ],
		[ KEYS.maxHeight, 'maxHeight' ],
		[ KEYS.overflow, 'overflow' ],
		[ KEYS.alignSelf, 'alignSelf' ],
		[ KEYS.order, 'order' ],
	].forEach( ( [ key, property ] ) => {
		const value = getResolvedValue( style, device, key );

		if ( undefined !== value && '' !== value ) {
			inline[ property ] = value;
		}
	} );

	// Off when the author turned the preview off, as on the Text block.
	if ( false !== positionPreview ) {
		Object.assign( inline, getPositionPreview( style, device ) );
	}

	const overlayImage = getOverlayImageLayer( attributes );

	if ( overlayImage ) {
		inline[ CSS_VARS.overlayImage ] = overlayImage;
	}

	const direction = getPreviewDirection( layout, style, device );

	if ( direction ) {
		inline.flexDirection = direction;
	}

	if ( inline[ CSS_VARS[ KEYS.borderHover ] ] ) {
		classes.push( 'has-hover-border' );
	}

	const hasShadowHover = hasAnyLayerValue( style, SHADOW_HOVER_KEYS );
	const hasLift = hasAnyLayerValue( style, [ KEYS.lift ] );
	const hasOverlayHover = hasAnyLayerValue( style, OVERLAY_HOVER_KEYS );

	if ( overlayImage || hasAnyLayerValue( style, OVERLAY_KEYS ) ) {
		classes.push( 'has-overlay' );
	}

	if ( hasOverlayHover ) {
		classes.push( 'has-overlay-hover' );
	}

	if ( hasShadowHover ) {
		classes.push( 'has-shadow-hover' );
	}

	if ( hasLift ) {
		classes.push( 'has-hover-lift' );
	}

	// render.php switches the transition on for a border, shadow, lift or
	// overlay hover alone.
	if (
		! classes.includes( HOVER_CLASS ) &&
		( hasShadowHover ||
			hasLift ||
			hasOverlayHover ||
			hasAnyLayerValue( style, [ KEYS.borderHover ] ) )
	) {
		classes.unshift( HOVER_CLASS );
	}

	return { style: inline, classes };
}
