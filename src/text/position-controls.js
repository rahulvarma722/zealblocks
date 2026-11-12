/**
 * Text — position, offsets, overflow and z-index, in the Dimensions panel.
 *
 * Per viewport like the other style controls, so they live in a group the
 * responsive view renders (see style-controls.js for why the group matters).
 * Values go to `style.zealblocks` in core's viewport-state shape; render.php
 * turns them into real declarations per band.
 */

import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	BaseControl,
	Flex,
	RangeControl,
	SelectControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';

import {
	KEYS,
	OFFSET_KEYS,
	OFFSET_UNITS,
	POSITION_KEYS,
	POSITION_OPTIONS,
	OVERFLOW_OPTIONS,
	Z_INDEX_RANGE,
} from './constants';
import { clearKeys } from './style-values';

/**
 * A label naming the device being edited. Same as style-controls.js.
 *
 * @param {string}  label    Base label.
 * @param {?string} stateKey Layer being edited.
 * @param {string}  device   Core device name.
 * @return {string} The label.
 */
function withDevice( label, stateKey, device ) {
	return stateKey
		? sprintf(
				/* translators: 1: control label, 2: device name, e.g. Tablet. */
				__( '%1$s (%2$s)', 'zealblocks' ),
				label,
				device
		  )
		: label;
}

const OFFSET_LABELS = {
	[ KEYS.top ]: __( 'Top', 'zealblocks' ),
	[ KEYS.right ]: __( 'Right', 'zealblocks' ),
	[ KEYS.bottom ]: __( 'Bottom', 'zealblocks' ),
	[ KEYS.left ]: __( 'Left', 'zealblocks' ),
};

const POSITION_ITEM_KEYS = [ KEYS.position, ...OFFSET_KEYS ];

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fills.
 */
export function PositionControls( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
} ) {
	const { style, positionPreview } = attributes;

	const units = useCustomUnits( { availableUnits: OFFSET_UNITS } );

	const value = ( key ) => getStateValue( style, stateKey, key );

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
		( attrs ) => ( {
			style: clearKeys( attrs?.style, stateKey, keys ),
		} );

	const position = value( KEYS.position ) || '';
	const zIndex = value( KEYS.zIndex );
	const overflow = value( KEYS.overflow ) || '';

	const positionLabel = withDevice(
		__( 'Position', 'zealblocks' ),
		stateKey,
		device
	);
	const zIndexLabel = withDevice(
		__( 'Z-index', 'zealblocks' ),
		stateKey,
		device
	);
	const overflowLabel = withDevice(
		__( 'Overflow', 'zealblocks' ),
		stateKey,
		device
	);

	let positionHelp = __(
		'Absolute is placed against the nearest positioned parent, Fixed against the browser window.',
		'zealblocks'
	);

	if ( 'relative' === position ) {
		positionHelp = __(
			'Offsets nudge the block from where it would normally sit.',
			'zealblocks'
		);
	}

	return (
		<InspectorControls
			group="dimensions"
			resetAllFilter={ reset( KEYS.zIndex, ...POSITION_KEYS ) }
		>
			<ToolsPanelItem
				hasValue={ () =>
					POSITION_ITEM_KEYS.some(
						( key ) => undefined !== value( key )
					)
				}
				label={ positionLabel }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, POSITION_ITEM_KEYS ),
					} )
				}
				resetAllFilter={ reset( ...POSITION_ITEM_KEYS ) }
				panelId={ clientId }
			>
				<Flex direction="column" gap={ 3 } align="stretch">
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ positionLabel }
						value={ position }
						options={ POSITION_OPTIONS }
						onChange={ ( next ) => set( KEYS.position, next ) }
						help={ position ? positionHelp : undefined }
					/>

					{ !! position && (
						<>
							<BaseControl.VisualLabel>
								{ __( 'Offsets', 'zealblocks' ) }
							</BaseControl.VisualLabel>
							<div
								// Inline: the inspector lives outside the
								// canvas iframe, where editor.scss may not load.
								style={ {
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: '8px',
								} }
							>
								{ OFFSET_KEYS.map( ( key ) => (
									<UnitControl
										key={ key }
										__next40pxDefaultSize
										label={ OFFSET_LABELS[ key ] }
										labelPosition="top"
										value={ value( key ) }
										onChange={ ( next ) =>
											set( key, next )
										}
										units={ units }
										min={ -9999 }
										max={ 9999 }
									/>
								) ) }
							</div>
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __(
									'Preview in editor',
									'zealblocks'
								) }
								checked={ false !== positionPreview }
								onChange={ ( next ) =>
									setAttributes( { positionPreview: next } )
								}
								help={ __(
									'Turn off if the block covers others and is hard to select. The live page is not affected.',
									'zealblocks'
								) }
							/>
						</>
					) }
				</Flex>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () => undefined !== zIndex }
				label={ zIndexLabel }
				onDeselect={ () => set( KEYS.zIndex, undefined ) }
				resetAllFilter={ reset( KEYS.zIndex ) }
				panelId={ clientId }
			>
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ zIndexLabel }
					value={
						undefined === zIndex ? undefined : Number( zIndex )
					}
					onChange={ ( next ) =>
						set(
							KEYS.zIndex,
							undefined === next || Number.isNaN( next )
								? undefined
								: String( Math.round( next ) )
						)
					}
					min={ Z_INDEX_RANGE.min }
					max={ Z_INDEX_RANGE.max }
					initialPosition={ 0 }
					allowReset
					help={ __(
						'Stacking order against overlapping blocks. Higher sits on top.',
						'zealblocks'
					) }
				/>
			</ToolsPanelItem>

			<ToolsPanelItem
				hasValue={ () => undefined !== value( KEYS.overflow ) }
				label={ overflowLabel }
				onDeselect={ () => set( KEYS.overflow, undefined ) }
				resetAllFilter={ reset( KEYS.overflow ) }
				panelId={ clientId }
			>
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ overflowLabel }
					value={ overflow }
					options={ OVERFLOW_OPTIONS }
					onChange={ ( next ) => set( KEYS.overflow, next ) }
					help={ __(
						'What happens to text that does not fit, for example with a fixed height.',
						'zealblocks'
					) }
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);
}
