/**
 * Icon — the SVG's classes and style in the canvas, as render.php builds them.
 */

import { ROTATION_VAR } from './constants';

/**
 * Class and style for the SVG.
 *
 * @param {Object}  attributes                Block attributes.
 * @param {boolean} attributes.flipHorizontal Flip horizontally.
 * @param {boolean} attributes.flipVertical   Flip vertically.
 * @param {*}       attributes.rotation       Stored rotation.
 * @return {{className: string, style: (Object|undefined)}} SVG props.
 */
export function getSvgProps( { flipHorizontal, flipVertical, rotation } ) {
	const parsed = parseInt( rotation, 10 );
	const degrees = Number.isFinite( parsed )
		? ( ( parsed % 360 ) + 360 ) % 360
		: 0;

	return {
		className: [
			'wp-block-zealblocks-icon__svg',
			flipHorizontal ? 'is-flip-horizontal' : '',
			flipVertical ? 'is-flip-vertical' : '',
			degrees ? 'has-rotation' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
		style: degrees ? { [ ROTATION_VAR ]: `${ degrees }deg` } : undefined,
	};
}
