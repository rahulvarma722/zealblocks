/**
 * Container — shape dividers in the editor: the same shapes and the same
 * markup render.php prints (Shape_Divider::render()), from the same JSON.
 */

import { __ } from '@wordpress/i18n';

import SHAPES from '../../includes/block/shape-dividers.json';

/** What the picker calls each shape. Every key in the JSON needs one. */
export const DIVIDER_LABELS = {
	triangle: __( 'Triangle', 'zealblocks' ),
	'triangle-asymmetric': __( 'Triangle, off centre', 'zealblocks' ),
	fan: __( 'Fan', 'zealblocks' ),
	tilt: __( 'Tilt', 'zealblocks' ),
	'tilt-layers': __( 'Tilt, layered', 'zealblocks' ),
	curve: __( 'Curve', 'zealblocks' ),
	'curve-asymmetric': __( 'Curve, off centre', 'zealblocks' ),
	'curve-layers': __( 'Curve, layered', 'zealblocks' ),
	arrow: __( 'Arrow', 'zealblocks' ),
	split: __( 'Split', 'zealblocks' ),
	book: __( 'Book', 'zealblocks' ),
	wave: __( 'Wave', 'zealblocks' ),
	waves: __( 'Waves, layered', 'zealblocks' ),
	mountains: __( 'Mountains', 'zealblocks' ),
	zigzag: __( 'Zigzag', 'zealblocks' ),
	steps: __( 'Steps', 'zealblocks' ),
	clouds: __( 'Clouds', 'zealblocks' ),
	drops: __( 'Drops', 'zealblocks' ),
};

export const DIVIDER_SHAPES = Object.keys( SHAPES );

/**
 * The paths for a shape, as render.php builds them.
 *
 * @param {string}  shape  Slug.
 * @param {boolean} invert Closed along the bottom edge instead.
 * @return {Array<{d: string, opacity: ?number}>} Paths; none for an unknown slug.
 */
export function dividerPaths( shape, invert ) {
	const close = invert ? ' L1000,100 L0,100 Z' : ' L1000,0 L0,0 Z';

	return ( SHAPES[ shape ] || [] ).map( ( layer ) => ( {
		d: layer.curve + close,
		opacity:
			typeof layer.opacity === 'number' && layer.opacity < 1
				? Math.round( layer.opacity * 100 ) / 100
				: null,
	} ) );
}

/**
 * One divider, as render.php prints it.
 *
 * @param {Object}  props
 * @param {?Object} props.config `{ shape, flip, invert, front }`.
 * @param {string}  props.side   'top' or 'bottom'.
 * @return {?Element} The divider, or null with no known shape.
 */
export function Divider( { config, side } ) {
	const paths = dividerPaths( config?.shape, !! config?.invert );

	if ( ! paths.length ) {
		return null;
	}

	const className = [
		'wp-block-zealblocks-container__divider',
		`is-${ side }`,
		`is-shape-${ config.shape }`,
		config.flip ? 'is-flipped' : '',
		config.invert ? 'is-inverted' : '',
		config.front ? 'is-front' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	return (
		<div className={ className } aria-hidden="true">
			<svg
				viewBox="0 0 1000 100"
				preserveAspectRatio="none"
				focusable="false"
			>
				{ paths.map( ( { d, opacity } ) => (
					<path
						key={ d }
						d={ d }
						opacity={ null === opacity ? undefined : opacity }
					/>
				) ) }
			</svg>
		</div>
	);
}
