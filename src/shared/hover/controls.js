/**
 * Hover colours — the per-device controls, for every block that opts in.
 *
 * In core's Color panel, as Spectra puts them, and per viewport: the Color
 * group is one WordPress 7.1 renders on Tablet and Mobile. Values go to
 * `style.zealblocks` in core's viewport-state shape; Hover on the server turns
 * them into real per-band rules.
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	RangeControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../../button/responsive-width/style-value';
import { withDevice } from '../device-label';
import { HOVER_KEYS } from './constants';

/**
 * A stored duration (`'300ms'`) as the number the slider shows.
 *
 * @param {?string} value Stored value.
 * @return {number|undefined} The number, or undefined.
 */
function toNumber( value ) {
	const number = parseFloat( value );

	return Number.isFinite( number ) ? number : undefined;
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited, null for the base.
 * @param {string}   props.device        Core device name.
 * @param {string}   [props.textLabel]   Label for the text colour, e.g.
 *                                       "Icon hover" on a block whose text
 *                                       colour is its icon's.
 * @return {Element} The fill.
 */
export function HoverControls( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	textLabel = __( 'Text hover', 'zealblocks' ),
} ) {
	const colorSettings = useMultipleOriginColorsAndGradients();

	const textHover = getStateValue( style, stateKey, HOVER_KEYS.text );
	const backgroundHover = getStateValue(
		style,
		stateKey,
		HOVER_KEYS.background
	);
	const isGradient = !! backgroundHover?.includes( 'gradient' );
	const duration = getStateValue( style, stateKey, HOVER_KEYS.duration );

	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue( style, stateKey, next || undefined, key ),
		} );

	const resetKey =
		( ...keys ) =>
		( attrs ) => ( {
			style: keys.reduce(
				( next, key ) =>
					setStateValue( next, stateKey, undefined, key ),
				attrs?.style
			),
		} );

	return (
		<InspectorControls
			group="color"
			resetAllFilter={ resetKey(
				HOVER_KEYS.text,
				HOVER_KEYS.background,
				HOVER_KEYS.duration
			) }
		>
			<ColorGradientSettingsDropdown
				__experimentalIsRenderedInSidebar
				panelId={ clientId }
				{ ...colorSettings }
				settings={ [
					{
						label: withDevice( textLabel, stateKey, device ),
						colorValue: textHover,
						onColorChange: ( next ) => set( HOVER_KEYS.text, next ),
						resetAllFilter: resetKey( HOVER_KEYS.text ),
						enableAlpha: true,
						clearable: true,
					},
					{
						label: withDevice(
							__( 'Background hover', 'zealblocks' ),
							stateKey,
							device
						),
						colorValue: isGradient ? undefined : backgroundHover,
						gradientValue: isGradient ? backgroundHover : undefined,
						onColorChange: ( next ) =>
							set( HOVER_KEYS.background, next ),
						onGradientChange: ( next ) =>
							set( HOVER_KEYS.background, next ),
						resetAllFilter: resetKey( HOVER_KEYS.background ),
						enableAlpha: true,
						clearable: true,
					},
				] }
			/>

			<ToolsPanelItem
				hasValue={ () => undefined !== duration }
				label={ withDevice(
					__( 'Hover transition', 'zealblocks' ),
					stateKey,
					device
				) }
				onDeselect={ () => set( HOVER_KEYS.duration, undefined ) }
				resetAllFilter={ resetKey( HOVER_KEYS.duration ) }
				panelId={ clientId }
			>
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ withDevice(
						__( 'Hover transition (ms)', 'zealblocks' ),
						stateKey,
						device
					) }
					value={ toNumber( duration ) }
					onChange={ ( next ) =>
						set(
							HOVER_KEYS.duration,
							undefined === next ? undefined : `${ next }ms`
						)
					}
					min={ 0 }
					max={ 2000 }
					step={ 50 }
					initialPosition={ 200 }
					allowReset
					help={ __(
						'How long the hover colours take to change.',
						'zealblocks'
					) }
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);
}
