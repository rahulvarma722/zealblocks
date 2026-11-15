/**
 * Container — parent hover (P-65), for a Container inside another Container:
 * how it changes while its parent is hovered or holds keyboard focus. In the
 * Border & Shadow panel, beside the block's own hover shadow and lift, per
 * device.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	ColorPalette,
	Flex,
	RangeControl,
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
import { KEYS, LIFT_UNITS, PARENT_HOVER_KEYS } from './constants';
import { fromPercent, toPercent } from './values';

const ITEM_KEYS = [ KEYS.parentHoverRestOpacity, ...PARENT_HOVER_KEYS ];

/**
 * @param {Object}   props
 * @param {string}   props.clientId          Block client ID.
 * @param {?Object}  props.style             The block's `style` attribute.
 * @param {Function} props.setAttributes     Attribute setter.
 * @param {?string}  props.stateKey          Layer being edited.
 * @param {string}   props.device            Core device name.
 * @param {boolean}  props.parentIsContainer Whether the parent is a Container.
 * @return {?Element} The fill, or null outside a Container.
 */
export function ParentHoverControls( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	parentIsContainer,
} ) {
	const [ palette ] = useSettings( 'color.palette' );
	const units = useCustomUnits( { availableUnits: LIFT_UNITS } );
	const value = ( key ) => getStateValue( style, stateKey, key );
	const hasStored = [ null, '@tablet', '@mobile' ].some( ( layer ) =>
		ITEM_KEYS.some(
			( key ) => undefined !== getStateValue( style, layer, key )
		)
	);

	// Inside a Container, or wherever a value is stored, so a Container moved
	// out of one never keeps a setting nobody can see.
	if ( ! parentIsContainer && ! hasStored ) {
		return null;
	}

	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue(
				style,
				stateKey,
				'' === next ? undefined : next,
				key
			),
		} );
	const label = withDevice(
		__( 'When the parent is hovered', 'zealblocks' ),
		stateKey,
		device
	);
	const percent = ( key, text, help ) => (
		<RangeControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			label={ text }
			value={ toPercent( value( key ) ) }
			onChange={ ( next ) => set( key, fromPercent( next ) ) }
			min={ 0 }
			max={ 100 }
			step={ 5 }
			allowReset
			help={ help }
		/>
	);
	const color = ( key, text ) => (
		<>
			<BaseControl.VisualLabel>{ text }</BaseControl.VisualLabel>
			<ColorPalette
				__experimentalIsRenderedInSidebar
				aria-label={ text }
				colors={ palette || [] }
				value={ value( key ) }
				onChange={ ( next ) => set( key, next || undefined ) }
				enableAlpha
				clearable
			/>
		</>
	);
	const reset = ( attrs ) => ( {
		style: clearKeys( attrs?.style, stateKey, ITEM_KEYS ),
	} );

	return (
		<InspectorControls group="border" resetAllFilter={ reset }>
			<ToolsPanelItem
				hasValue={ () =>
					ITEM_KEYS.some( ( key ) => undefined !== value( key ) )
				}
				label={ label }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, ITEM_KEYS ),
					} )
				}
				resetAllFilter={ reset }
				panelId={ clientId }
			>
				<Flex direction="column" gap={ 3 } align="stretch">
					<BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel>
					{ percent(
						KEYS.parentHoverRestOpacity,
						__( 'Opacity before', 'zealblocks' ),
						__(
							'0 hides it until the parent is hovered. Phones and tablets without a mouse always show it.',
							'zealblocks'
						)
					) }
					{ percent(
						KEYS.parentHoverOpacity,
						__( 'Opacity on hover', 'zealblocks' )
					) }
					<UnitControl
						__next40pxDefaultSize
						label={ __( 'Move up on hover', 'zealblocks' ) }
						labelPosition="top"
						value={ value( KEYS.parentHoverMove ) }
						onChange={ ( next ) =>
							set( KEYS.parentHoverMove, next || undefined )
						}
						units={ units }
						placeholder="0px"
					/>
					{ color(
						KEYS.parentHoverColor,
						__( 'Text colour on hover', 'zealblocks' )
					) }
					{ color(
						KEYS.parentHoverBackground,
						__( 'Background on hover', 'zealblocks' )
					) }
				</Flex>
			</ToolsPanelItem>
		</InspectorControls>
	);
}
