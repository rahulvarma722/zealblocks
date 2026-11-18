/**
 * List — the per-device style controls: space between items and the icon's
 * size and gap in Dimensions; the icon or marker colour in Color; the marker
 * size in Typography. Groups WordPress 7.1 renders on Tablet and Mobile.
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import { KEYS, SIZE_UNITS } from './constants';

/**
 * A per-device length item.
 *
 * @param {Object}   props
 * @param {string}   props.clientId           Block client ID.
 * @param {?Object}  props.style              The block's `style` attribute.
 * @param {Function} props.setAttributes      Attribute setter.
 * @param {?string}  props.stateKey           Layer being edited.
 * @param {string}   props.device             Core device name.
 * @param {string}   props.valueKey           Key under `style.zealblocks`.
 * @param {string}   props.text               Label, before the device.
 * @param {string}   props.placeholder        Shown when empty.
 * @param {boolean}  [props.isShownByDefault] Show without the options menu.
 * @return {Element} The item.
 */
function LengthItem( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	valueKey,
	text,
	placeholder,
	isShownByDefault = false,
} ) {
	const units = useCustomUnits( { availableUnits: SIZE_UNITS } );
	const value = getStateValue( style, stateKey, valueKey );
	const label = withDevice( text, stateKey, device );
	const set = ( next ) =>
		setAttributes( {
			style: setStateValue(
				style,
				stateKey,
				next || undefined,
				valueKey
			),
		} );

	return (
		<ToolsPanelItem
			hasValue={ () => undefined !== value }
			label={ label }
			onDeselect={ () => set( undefined ) }
			resetAllFilter={ ( attrs ) => ( {
				style: clearKeys( attrs?.style, stateKey, [ valueKey ] ),
			} ) }
			panelId={ clientId }
			isShownByDefault={ isShownByDefault }
		>
			<UnitControl
				__next40pxDefaultSize
				label={ label }
				labelPosition="top"
				value={ value }
				onChange={ set }
				units={ units }
				min={ 0 }
				placeholder={ placeholder }
			/>
		</ToolsPanelItem>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @param {boolean}  props.hasIcon       Whether the items show icons (a <ul>).
 * @return {Element} The fills.
 */
export function ListStyleControls( props ) {
	const { clientId, style, setAttributes, stateKey, device, hasIcon } = props;
	const colorSettings = useMultipleOriginColorsAndGradients();
	const colorKey = hasIcon ? KEYS.iconColor : KEYS.markerColor;

	return (
		<>
			<InspectorControls
				group="color"
				resetAllFilter={ ( attrs ) => ( {
					style: clearKeys( attrs?.style, stateKey, [
						KEYS.iconColor,
						KEYS.markerColor,
					] ),
				} ) }
			>
				<ColorGradientSettingsDropdown
					__experimentalIsRenderedInSidebar
					panelId={ clientId }
					{ ...colorSettings }
					settings={ [
						{
							label: withDevice(
								hasIcon
									? __( 'Icon', 'zealblocks' )
									: __( 'Numbers', 'zealblocks' ),
								stateKey,
								device
							),
							colorValue: getStateValue(
								style,
								stateKey,
								colorKey
							),
							onColorChange: ( next ) =>
								setAttributes( {
									style: setStateValue(
										style,
										stateKey,
										next || undefined,
										colorKey
									),
								} ),
							resetAllFilter: ( attrs ) => ( {
								style: clearKeys( attrs?.style, stateKey, [
									colorKey,
								] ),
							} ),
							enableAlpha: true,
							clearable: true,
						},
					] }
				/>
			</InspectorControls>

			<InspectorControls
				group="dimensions"
				resetAllFilter={ ( attrs ) => ( {
					style: clearKeys( attrs?.style, stateKey, [
						KEYS.itemGap,
						KEYS.iconSize,
						KEYS.iconGap,
						KEYS.markerSize,
					] ),
				} ) }
			>
				<LengthItem
					{ ...props }
					valueKey={ KEYS.itemGap }
					text={ __( 'Space between items', 'zealblocks' ) }
					placeholder="0"
					isShownByDefault
				/>
				{ hasIcon ? (
					<>
						<LengthItem
							{ ...props }
							valueKey={ KEYS.iconSize }
							text={ __( 'Icon size', 'zealblocks' ) }
							placeholder="1em"
							isShownByDefault
						/>
						<LengthItem
							{ ...props }
							valueKey={ KEYS.iconGap }
							text={ __( 'Space after the icon', 'zealblocks' ) }
							placeholder="0.5em"
						/>
					</>
				) : (
					<LengthItem
						{ ...props }
						valueKey={ KEYS.markerSize }
						text={ __( 'Number size', 'zealblocks' ) }
						placeholder="1em"
					/>
				) }
			</InspectorControls>
		</>
	);
}
