/**
 * Hover colours — what the canvas shows at a device.
 *
 * Pure, so it is unit-tested directly. It mirrors Hover on the server with
 * one deliberate difference: the front end gets real per-band hover rules,
 * the canvas cannot, so each colour is resolved for the previewed device and
 * carried as a custom property, with a class that exists only when that
 * device HAS a value (see the preview() mixin).
 */

import {
	getStateValue,
	getResolvedValue,
} from '../../button/responsive-width/style-value';
import { VIEWPORT_STATE_BY_DEVICE } from '../../button/responsive-width/constants';
import { HOVER_KEYS, HOVER_CLASS, HOVER_PREVIEW_CLASSES } from './constants';

/**
 * Inline style and classes for the block root at a device.
 *
 * `has-hover` is present at EVERY device once any layer has a hover colour,
 * exactly as Hover::classes() derives it from the rules of all bands.
 *
 * @param {?Object} style     The block's `style` attribute.
 * @param {string}  device    Core device name — 'Desktop' | 'Tablet' | 'Mobile'.
 * @param {string}  varPrefix The block's hover variable prefix, e.g.
 *                            '--zealblocks-text-hover-'.
 * @return {{style: Object, classes: string[]}} What to merge into blockProps.
 */
export function getHoverPreview( style, device, varPrefix ) {
	const inline = {};
	const classes = [];

	const duration = getResolvedValue( style, device, HOVER_KEYS.duration );

	if ( duration ) {
		inline[ `${ varPrefix }duration` ] = duration;
	}

	const hasAnyColour = Object.values( VIEWPORT_STATE_BY_DEVICE ).some(
		( layer ) =>
			[ HOVER_KEYS.text, HOVER_KEYS.background ].some(
				( key ) => undefined !== getStateValue( style, layer, key )
			)
	);

	if ( hasAnyColour ) {
		classes.push( HOVER_CLASS );
	}

	const text = getResolvedValue( style, device, HOVER_KEYS.text );

	if ( text ) {
		inline[ `${ varPrefix }color` ] = text;
		classes.push( HOVER_PREVIEW_CLASSES.text );
	}

	const background = getResolvedValue( style, device, HOVER_KEYS.background );

	if ( background ) {
		inline[ `${ varPrefix }background` ] = background;
		classes.push( HOVER_PREVIEW_CLASSES.background );
	}

	return { style: inline, classes };
}
