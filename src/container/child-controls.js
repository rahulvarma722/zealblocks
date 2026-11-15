/**
 * Container — child settings (CH-04 to CH-06), for a Container placed inside
 * another block: align self and order inside a flex or grid parent, and the
 * shared position anywhere. In the Dimensions panel, where core puts its own
 * child sizing, and per device like every other style value.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	SelectControl,
	TextControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import { PositionItem, POSITION_ITEM_KEYS } from '../shared/position';
import { ALIGN_SELF_VALUES, KEYS, ORDER_FIRST, ORDER_LAST } from './constants';
import { orderMode } from './values';

const CHILD_KEYS = [ KEYS.alignSelf, KEYS.order, ...POSITION_ITEM_KEYS ];

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @param {?string}  props.parentLayout  The parent's layout type, or null at
 *                                       the top level.
 * @return {?Element} The fill, or null with nothing to offer.
 */
export function ChildControls( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
	parentLayout,
} ) {
	const { style, positionPreview } = attributes;
	const value = ( key ) => getStateValue( style, stateKey, key );
	const hasAny = ( keys ) =>
		[ null, '@tablet', '@mobile' ].some( ( layer ) =>
			keys.some(
				( key ) => undefined !== getStateValue( style, layer, key )
			)
		);

	// Offered where they mean something, and wherever a value is stored, so a
	// Container moved out of its parent never keeps a setting nobody can see.
	const isItem = [ 'flex', 'grid' ].includes( parentLayout );
	const showAlign = isItem || hasAny( [ KEYS.alignSelf, KEYS.order ] );
	const showPosition = null !== parentLayout || hasAny( POSITION_ITEM_KEYS );

	if ( ! showAlign && ! showPosition ) {
		return null;
	}

	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue(
				style,
				stateKey,
				'' === next || undefined === next ? undefined : next,
				key
			),
		} );

	const reset =
		( ...keys ) =>
		( attrs ) => ( { style: clearKeys( attrs?.style, stateKey, keys ) } );

	const alignLabel = withDevice(
		__( 'Align self', 'zealblocks' ),
		stateKey,
		device
	);
	const orderLabel = withDevice(
		__( 'Order', 'zealblocks' ),
		stateKey,
		device
	);
	const order = value( KEYS.order );
	const mode = orderMode( order );

	return (
		<InspectorControls
			group="dimensions"
			resetAllFilter={ reset( ...CHILD_KEYS ) }
		>
			{ showAlign && (
				<ToolsPanelItem
					hasValue={ () => undefined !== value( KEYS.alignSelf ) }
					label={ alignLabel }
					onDeselect={ () => set( KEYS.alignSelf, undefined ) }
					resetAllFilter={ reset( KEYS.alignSelf ) }
					panelId={ clientId }
				>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ alignLabel }
						value={ value( KEYS.alignSelf ) ?? '' }
						options={ [
							{ value: '', label: __( 'Default', 'zealblocks' ) },
							...ALIGN_SELF_VALUES.map( ( option ) => ( {
								value: option,
								label: {
									start: __( 'Start', 'zealblocks' ),
									center: __( 'Centre', 'zealblocks' ),
									end: __( 'End', 'zealblocks' ),
									stretch: __( 'Stretch', 'zealblocks' ),
								}[ option ],
							} ) ),
						] }
						onChange={ ( next ) => set( KEYS.alignSelf, next ) }
						help={ __(
							'Across the parent: top to bottom in a row, side to side in a stack.',
							'zealblocks'
						) }
					/>
				</ToolsPanelItem>
			) }

			{ showAlign && (
				<ToolsPanelItem
					hasValue={ () => undefined !== order }
					label={ orderLabel }
					onDeselect={ () => set( KEYS.order, undefined ) }
					resetAllFilter={ reset( KEYS.order ) }
					panelId={ clientId }
				>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ orderLabel }
						value={ mode }
						options={ [
							{ value: '', label: __( 'Default', 'zealblocks' ) },
							{
								value: 'first',
								label: __( 'First', 'zealblocks' ),
							},
							{
								value: 'last',
								label: __( 'Last', 'zealblocks' ),
							},
							{
								value: 'custom',
								label: __( 'Custom', 'zealblocks' ),
							},
						] }
						onChange={ ( next ) =>
							set(
								KEYS.order,
								{
									first: ORDER_FIRST,
									last: ORDER_LAST,
									custom: '1',
								}[ next ]
							)
						}
						help={ __(
							'Moves this block on screen only. Screen readers and the Tab key keep the original order.',
							'zealblocks'
						) }
					/>
					{ 'custom' === mode && (
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							type="number"
							label={ __(
								'Position in the order',
								'zealblocks'
							) }
							value={ order ?? '' }
							onChange={ ( next ) =>
								set(
									KEYS.order,
									/^-?\d{1,4}$/.test( String( next ) )
										? String( next )
										: undefined
								)
							}
							min={ -999 }
							max={ 999 }
							step={ 1 }
						/>
					) }
				</ToolsPanelItem>
			) }

			{ showPosition && (
				<PositionItem
					clientId={ clientId }
					style={ style }
					setAttributes={ setAttributes }
					stateKey={ stateKey }
					device={ device }
					positionPreview={ positionPreview }
					absoluteHelp={ __(
						'Placed against the parent Container, out of the flow: for a badge or a decoration. Set a Z-index to bring it in front of the blocks after it.',
						'zealblocks'
					) }
				/>
			) }
		</InspectorControls>
	);
}
