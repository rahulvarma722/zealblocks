/**
 * Container — size limits, hover lift and reverse order.
 *
 * Per viewport, like every other style control, so each lives in a group
 * WordPress 7.1 renders on Tablet and Mobile: Dimensions, Border and Layout.
 * Values go to `style.zealblocks` in core's viewport-state shape. Colours,
 * border hover and the hover shadow are the shared and Button controls.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	SelectControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import {
	getStateValue,
	getResolvedValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import { ZIndexItem } from '../shared/z-index';
import { KEYS, LIFT_UNITS, OVERFLOW_VALUES, SIZE_UNITS } from './constants';

const SIZE_KEYS = [ KEYS.maxWidth, KEYS.maxHeight, KEYS.overflow ];

/**
 * A reset filter clearing keys on one layer.
 *
 * @param {?string}  stateKey Layer being edited, null for the base.
 * @param {string[]} keys     Keys to clear.
 * @return {Function} A resetAllFilter.
 */
const resetKeys = ( stateKey, keys ) => ( attributes ) => ( {
	style: clearKeys( attributes?.style, stateKey, keys ),
} );

/**
 * One per-viewport ToolsPanel item holding one value.
 *
 * @param {Object}   props
 * @param {string}   props.clientId           Block client ID.
 * @param {?Object}  props.style              The block's `style` attribute.
 * @param {Function} props.setAttributes      Attribute setter.
 * @param {?string}  props.stateKey           Layer being edited.
 * @param {string}   props.valueKey           Key under `style.zealblocks`.
 * @param {string}   props.label              Label, with the device.
 * @param {Function} props.children           Renders the control: ( set, value ).
 * @param {boolean}  [props.isShownByDefault] Show it without the options menu.
 * @return {Element} The item.
 */
function Item( {
	clientId,
	style,
	setAttributes,
	stateKey,
	valueKey,
	label,
	children,
	isShownByDefault = false,
} ) {
	const value = getStateValue( style, stateKey, valueKey );
	const set = ( next ) =>
		setAttributes( {
			style: setStateValue(
				style,
				stateKey,
				'' === next ? undefined : next,
				valueKey
			),
		} );

	return (
		<ToolsPanelItem
			hasValue={ () => undefined !== value }
			label={ label }
			onDeselect={ () => set( undefined ) }
			resetAllFilter={ resetKeys( stateKey, [ valueKey ] ) }
			panelId={ clientId }
			isShownByDefault={ isShownByDefault }
		>
			{ children( set, value ) }
		</ToolsPanelItem>
	);
}

/**
 * Max width, max height, overflow and z-index, in the Dimensions panel.
 *
 * Core's dimensions support has width, height and min height, but no maximums
 * and none per device: a card that may grow to 480px and no further, or a
 * hero capped at the viewport's height, needs both.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function SizeControls( props ) {
	const { stateKey, device } = props;
	const units = useCustomUnits( { availableUnits: SIZE_UNITS } );
	const label = ( text ) => withDevice( text, stateKey, device );

	const length = ( valueKey, text ) => (
		<Item { ...props } valueKey={ valueKey } label={ label( text ) }>
			{ ( set, value ) => (
				<UnitControl
					__next40pxDefaultSize
					label={ label( text ) }
					labelPosition="top"
					value={ value }
					onChange={ ( next ) => set( next || undefined ) }
					units={ units }
					min={ 0 }
				/>
			) }
		</Item>
	);

	return (
		<InspectorControls
			group="dimensions"
			resetAllFilter={ resetKeys( stateKey, SIZE_KEYS ) }
		>
			{ length( KEYS.maxWidth, __( 'Max width', 'zealblocks' ) ) }
			{ length( KEYS.maxHeight, __( 'Max height', 'zealblocks' ) ) }
			<Item
				{ ...props }
				valueKey={ KEYS.overflow }
				label={ label( __( 'Overflow', 'zealblocks' ) ) }
			>
				{ ( set, value ) => (
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ label( __( 'Overflow', 'zealblocks' ) ) }
						value={ value ?? '' }
						onChange={ set }
						options={ [
							{ value: '', label: __( 'Default', 'zealblocks' ) },
							...OVERFLOW_VALUES.map( ( option ) => ( {
								value: option,
								label: {
									visible: __( 'Visible', 'zealblocks' ),
									hidden: __( 'Hidden', 'zealblocks' ),
									auto: __(
										'Scroll when needed',
										'zealblocks'
									),
									clip: __( 'Clip', 'zealblocks' ),
								}[ option ],
							} ) ),
						] }
						help={ __(
							'Hidden and Scroll stop a sticky block inside from sticking. Clip does not.',
							'zealblocks'
						) }
					/>
				) }
			</Item>
			<ZIndexItem { ...props } />
		</InspectorControls>
	);
}

/**
 * Hover lift, beside the hover shadow in the Border & Shadow panel.
 *
 * Moves the container up on hover and keyboard focus with `translate`, which
 * leaves `transform` to the entrance animation and to the theme.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function LiftControl( props ) {
	const { stateKey, device } = props;
	const units = useCustomUnits( { availableUnits: LIFT_UNITS } );
	const label = withDevice(
		__( 'Hover lift', 'zealblocks' ),
		stateKey,
		device
	);

	return (
		<InspectorControls
			group="border"
			resetAllFilter={ resetKeys( stateKey, [ KEYS.lift ] ) }
		>
			<Item { ...props } valueKey={ KEYS.lift } label={ label }>
				{ ( set, value ) => (
					<UnitControl
						__next40pxDefaultSize
						label={ label }
						labelPosition="top"
						value={ value }
						onChange={ ( next ) => set( next || undefined ) }
						units={ units }
						placeholder="4px"
						help={ __(
							'How far the container rises on hover. Negative values sink it.',
							'zealblocks'
						) }
					/>
				) }
			</Item>
		</InspectorControls>
	);
}

/**
 * Reverse order, in core's Layout panel, for a flex layout only.
 *
 * Shows what the previewed device actually does: a Mobile layer that says
 * nothing inherits the base, so the toggle reads the resolved value and writes
 * the edited layer. Turning it off on Mobile under a reversed base stores an
 * explicit false, which Reverse_Order keeps.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.layout        The block's `layout` attribute.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {?Element} The fill, or null for a layout that is not flex.
 */
export function ReverseControl( props ) {
	const { layout, style, stateKey, device } = props;

	if ( 'flex' !== layout?.type ) {
		return null;
	}

	const label = withDevice(
		__( 'Reverse order', 'zealblocks' ),
		stateKey,
		device
	);
	const resolved =
		true ===
		( null === stateKey
			? getStateValue( style, null, KEYS.reverse )
			: getResolvedValue( style, device, KEYS.reverse ) );

	return (
		<InspectorControls
			group="layout"
			resetAllFilter={ resetKeys( stateKey, [ KEYS.reverse ] ) }
		>
			<Item
				{ ...props }
				valueKey={ KEYS.reverse }
				label={ label }
				isShownByDefault
			>
				{ ( set ) => (
					<ToggleControl
						__nextHasNoMarginBottom
						label={ label }
						checked={ resolved }
						onChange={ ( next ) =>
							// The base stores only true; a device layer
							// stores false too, to undo a reversed base.
							set( next || null !== stateKey ? next : undefined )
						}
						help={ __(
							'Shows the blocks last to first. Screen readers and the Tab key still follow the original order.',
							'zealblocks'
						) }
					/>
				) }
			</Item>
		</InspectorControls>
	);
}
