/**
 * Container — shape dividers (P-75), in the Background panel.
 *
 * Shape, flip, invert and "bring to front" are one choice for every device, a
 * block attribute, offered while editing the base layer. Colour, height and
 * width are per device, under `style.zealblocks`, and offered on every device
 * once a side has a shape.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	BaseControl,
	ColorPalette,
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
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import { DIVIDER_HEIGHT_UNITS, DIVIDER_KEYS, KEYS } from './constants';
import { DIVIDER_LABELS, DIVIDER_SHAPES } from './dividers';

const SIDES = {
	top: {
		attribute: 'dividerTop',
		label: __( 'Top divider', 'zealblocks' ),
		color: KEYS.dividerTopColor,
		height: KEYS.dividerTopHeight,
		width: KEYS.dividerTopWidth,
	},
	bottom: {
		attribute: 'dividerBottom',
		label: __( 'Bottom divider', 'zealblocks' ),
		color: KEYS.dividerBottomColor,
		height: KEYS.dividerBottomHeight,
		width: KEYS.dividerBottomWidth,
	},
};

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @param {string}   props.side          'top' or 'bottom'.
 * @return {?Element} The item.
 */
function DividerItem( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
	side,
} ) {
	const [ palette ] = useSettings( 'color.palette' );
	const units = useCustomUnits( { availableUnits: DIVIDER_HEIGHT_UNITS } );
	const { attribute, label, color, height, width } = SIDES[ side ];
	const config = attributes[ attribute ] || {};
	const { style } = attributes;
	const isBase = null === stateKey;

	// On Tablet and Mobile only the per-device parts, and only with a shape.
	if ( ! isBase && ! config.shape ) {
		return null;
	}

	const value = ( key ) => getStateValue( style, stateKey, key );
	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue(
				style,
				stateKey,
				'' === next ? undefined : next,
				key
			),
		} );
	const setConfig = ( next ) =>
		setAttributes( {
			[ attribute ]: next.shape ? { ...config, ...next } : undefined,
		} );
	const perDevice = ( text ) => withDevice( text, stateKey, device );
	const keys = DIVIDER_KEYS[ side ];
	const widthValue = parseFloat( value( width ) );

	return (
		<ToolsPanelItem
			hasValue={ () =>
				isBase
					? !! config.shape
					: keys.some( ( key ) => undefined !== value( key ) )
			}
			label={ isBase ? label : perDevice( label ) }
			onDeselect={ () =>
				isBase
					? setAttributes( {
							[ attribute ]: undefined,
							style: clearKeys( style, null, keys ),
					  } )
					: setAttributes( {
							style: clearKeys( style, stateKey, keys ),
					  } )
			}
			resetAllFilter={ ( attrs ) =>
				isBase
					? {
							[ attribute ]: undefined,
							style: clearKeys( attrs?.style, null, keys ),
					  }
					: { style: clearKeys( attrs?.style, stateKey, keys ) }
			}
			panelId={ clientId }
		>
			<Flex direction="column" gap={ 3 } align="stretch">
				{ isBase && (
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ label }
						value={ config.shape || '' }
						options={ [
							{ value: '', label: __( 'None', 'zealblocks' ) },
							...DIVIDER_SHAPES.map( ( shape ) => ( {
								value: shape,
								label: DIVIDER_LABELS[ shape ] || shape,
							} ) ),
						] }
						onChange={ ( next ) => setConfig( { shape: next } ) }
					/>
				) }

				{ !! config.shape && (
					<>
						<BaseControl.VisualLabel>
							{ perDevice( __( 'Colour', 'zealblocks' ) ) }
						</BaseControl.VisualLabel>
						<ColorPalette
							__experimentalIsRenderedInSidebar
							aria-label={ perDevice(
								__( 'Divider colour', 'zealblocks' )
							) }
							colors={ palette || [] }
							value={ value( color ) }
							onChange={ ( next ) =>
								set( color, next || undefined )
							}
							enableAlpha
							clearable
						/>
						<UnitControl
							__next40pxDefaultSize
							label={ perDevice( __( 'Height', 'zealblocks' ) ) }
							labelPosition="top"
							value={ value( height ) }
							onChange={ ( next ) =>
								set( height, next || undefined )
							}
							units={ units }
							min={ 0 }
							placeholder="80px"
						/>
						<RangeControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ perDevice( __( 'Width', 'zealblocks' ) ) }
							value={
								Number.isFinite( widthValue )
									? widthValue
									: undefined
							}
							onChange={ ( next ) =>
								set(
									width,
									undefined === next
										? undefined
										: `${ next }%`
								)
							}
							min={ 100 }
							max={ 300 }
							step={ 10 }
							initialPosition={ 100 }
							allowReset
							help={ __(
								'In percent of the container. Wider stretches the shape.',
								'zealblocks'
							) }
						/>
					</>
				) }

				{ isBase && !! config.shape && (
					<>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Flip', 'zealblocks' ) }
							checked={ !! config.flip }
							onChange={ ( next ) =>
								setConfig( { flip: next || undefined } )
							}
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Invert', 'zealblocks' ) }
							checked={ !! config.invert }
							onChange={ ( next ) =>
								setConfig( { invert: next || undefined } )
							}
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Bring to front', 'zealblocks' ) }
							checked={ !! config.front }
							onChange={ ( next ) =>
								setConfig( { front: next || undefined } )
							}
							help={ __(
								'Over the content, not behind it. Clicks still go through.',
								'zealblocks'
							) }
						/>
					</>
				) }
			</Flex>
		</ToolsPanelItem>
	);
}

/**
 * @param {Object} props Same as DividerItem, without `side`.
 * @return {Element} The fill.
 */
export function DividerControls( props ) {
	return (
		<InspectorControls group="background">
			<DividerItem { ...props } side="top" />
			<DividerItem { ...props } side="bottom" />
		</InspectorControls>
	);
}
