/**
 * Button — icon colours, border hover, text-icon gap and hover shadow.
 *
 * Per viewport like every other style control, so each lives in a group
 * WordPress 7.1 renders on Tablet and Mobile: Color, Dimensions, Border.
 * Values go to `style.zealblocks` in core's viewport-state shape; render.php
 * turns them into rules per band. Text and background hover come from the
 * shared HoverControls, not from here.
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useSettings,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	BaseControl,
	ColorPalette,
	Flex,
	RangeControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import { getStateValue, setStateValue } from './responsive-width/style-value';
import { withDevice } from '../shared/device-label';
import {
	KEYS,
	SHADOW_HOVER_KEYS,
	SHADOW_HOVER_RANGES,
	GAP_UNITS,
} from './constants';
import { clearKeys, setShadowHoverValue } from './style-values';

/**
 * A stored length (`'4px'`) as the number a slider shows.
 *
 * @param {?string} value Stored value.
 * @return {number|undefined} The number, or undefined.
 */
function toNumber( value ) {
	const number = parseFloat( value );

	return Number.isFinite( number ) ? number : undefined;
}

/**
 * Icon colour, icon hover colour and border hover colour, in the Color panel.
 *
 * The icon rows appear only when the button has an icon, as in Spectra.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @param {boolean}  props.hasIcon       Whether the button has an icon.
 * @return {Element} The fill.
 */
export function ButtonColorControls( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	hasIcon,
} ) {
	const colorSettings = useMultipleOriginColorsAndGradients();

	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue( style, stateKey, next || undefined, key ),
		} );

	const reset =
		( ...keys ) =>
		( attrs ) => ( { style: clearKeys( attrs?.style, stateKey, keys ) } );

	const row = ( key, label ) => ( {
		label: withDevice( label, stateKey, device ),
		colorValue: getStateValue( style, stateKey, key ),
		onColorChange: ( next ) => set( key, next ),
		resetAllFilter: reset( key ),
		enableAlpha: true,
		clearable: true,
	} );

	const rows = [
		...( hasIcon
			? [
					row( KEYS.iconColor, __( 'Icon', 'zealblocks' ) ),
					row( KEYS.iconHover, __( 'Icon hover', 'zealblocks' ) ),
			  ]
			: [] ),
		row( KEYS.borderHover, __( 'Border hover', 'zealblocks' ) ),
	];

	return (
		<InspectorControls
			group="color"
			resetAllFilter={ reset(
				KEYS.iconColor,
				KEYS.iconHover,
				KEYS.borderHover
			) }
		>
			<ColorGradientSettingsDropdown
				__experimentalIsRenderedInSidebar
				panelId={ clientId }
				{ ...colorSettings }
				settings={ rows }
			/>
		</InspectorControls>
	);
}

/**
 * The text-icon gap, in the Dimensions panel, when there is an icon.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @param {boolean}  props.hasIcon       Whether the button has an icon.
 * @return {?Element} The fill, or null without an icon.
 */
export function IconGapControl( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	hasIcon,
} ) {
	const units = useCustomUnits( { availableUnits: GAP_UNITS } );

	if ( ! hasIcon ) {
		return null;
	}

	const gap = getStateValue( style, stateKey, KEYS.iconGap );
	const label = withDevice(
		__( 'Text-icon gap', 'zealblocks' ),
		stateKey,
		device
	);
	const reset = ( attrs ) => ( {
		style: clearKeys( attrs?.style, stateKey, [ KEYS.iconGap ] ),
	} );

	return (
		<InspectorControls group="dimensions" resetAllFilter={ reset }>
			<ToolsPanelItem
				hasValue={ () => undefined !== gap }
				label={ label }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, [ KEYS.iconGap ] ),
					} )
				}
				resetAllFilter={ reset }
				panelId={ clientId }
			>
				<UnitControl
					__next40pxDefaultSize
					label={ label }
					labelPosition="top"
					value={ gap }
					onChange={ ( next ) =>
						setAttributes( {
							style: setStateValue(
								style,
								stateKey,
								next || undefined,
								KEYS.iconGap
							),
						} )
					}
					units={ units }
					min={ 0 }
					placeholder={ __( '0.5em', 'zealblocks' ) }
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);
}

/**
 * The hover shadow, in the Border & Shadow panel: colour, X, Y, blur, spread.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function ShadowHoverControl( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
} ) {
	const [ palette ] = useSettings( 'color.palette' );

	const value = ( key ) => getStateValue( style, stateKey, key );
	const hasShadow = SHADOW_HOVER_KEYS.some(
		( key ) => undefined !== value( key )
	);

	const set = ( key, next ) =>
		setAttributes( {
			style: setShadowHoverValue( style, stateKey, key, next ),
		} );

	const reset = ( attrs ) => ( {
		style: clearKeys( attrs?.style, stateKey, SHADOW_HOVER_KEYS ),
	} );

	const label = withDevice(
		__( 'Shadow hover', 'zealblocks' ),
		stateKey,
		device
	);

	const slider = ( key, sliderLabel ) => (
		<RangeControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ sliderLabel }
			value={ toNumber( value( key ) ) }
			onChange={ ( next ) =>
				set( key, undefined === next ? undefined : `${ next }px` )
			}
			min={ SHADOW_HOVER_RANGES[ key ].min }
			max={ SHADOW_HOVER_RANGES[ key ].max }
			allowReset
		/>
	);

	return (
		<InspectorControls group="border" resetAllFilter={ reset }>
			<ToolsPanelItem
				hasValue={ () => hasShadow }
				label={ label }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, SHADOW_HOVER_KEYS ),
					} )
				}
				resetAllFilter={ reset }
				panelId={ clientId }
			>
				<Flex direction="column" gap={ 3 } align="stretch">
					<BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel>
					<ColorPalette
						__experimentalIsRenderedInSidebar
						aria-label={ __( 'Shadow hover color', 'zealblocks' ) }
						colors={ palette || [] }
						value={ value( KEYS.shadowColor ) }
						onChange={ ( next ) =>
							set( KEYS.shadowColor, next || undefined )
						}
						enableAlpha
						clearable
					/>
					{ slider( KEYS.shadowX, __( 'X offset', 'zealblocks' ) ) }
					{ slider( KEYS.shadowY, __( 'Y offset', 'zealblocks' ) ) }
					{ slider( KEYS.shadowBlur, __( 'Blur', 'zealblocks' ) ) }
					{ slider(
						KEYS.shadowSpread,
						__( 'Spread', 'zealblocks' )
					) }
				</Flex>
			</ToolsPanelItem>
		</InspectorControls>
	);
}
