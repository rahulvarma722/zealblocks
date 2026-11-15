/**
 * Position — the per-device Position item: type, offsets and the editor
 * preview switch. A ToolsPanelItem, for a block to put in its own Dimensions
 * fill (WordPress 7.1 renders that group on Tablet and Mobile).
 */

import { __ } from '@wordpress/i18n';
import {
	BaseControl,
	Flex,
	SelectControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../../button/responsive-width/style-value';
import { withDevice } from '../device-label';
import {
	OFFSET_KEYS,
	OFFSET_UNITS,
	POSITION_ITEM_KEYS,
	POSITION_KEY,
	POSITION_OPTIONS,
} from './constants';

const OFFSET_LABELS = {
	positionTop: __( 'Top', 'zealblocks' ),
	positionRight: __( 'Right', 'zealblocks' ),
	positionBottom: __( 'Bottom', 'zealblocks' ),
	positionLeft: __( 'Left', 'zealblocks' ),
};

/**
 * Clears the position keys on one layer.
 *
 * @param {?Object} style    The block's `style` attribute.
 * @param {?string} stateKey Layer being edited, null for the base.
 * @return {Object|undefined} The new `style`.
 */
export function clearPosition( style, stateKey ) {
	return POSITION_ITEM_KEYS.reduce(
		( next, key ) => setStateValue( next, stateKey, undefined, key ),
		style
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId        Block client ID.
 * @param {?Object}  props.style           The block's `style` attribute.
 * @param {Function} props.setAttributes   Attribute setter.
 * @param {?string}  props.stateKey        Layer being edited, null for the base.
 * @param {string}   props.device          Core device name.
 * @param {boolean}  props.positionPreview The `positionPreview` attribute.
 * @param {string}   [props.absoluteHelp]  Help for Absolute, when the block
 *                                         knows what it is placed against.
 * @return {Element} The item.
 */
export function PositionItem( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
	positionPreview,
	absoluteHelp,
} ) {
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

	const position = value( POSITION_KEY ) || '';
	const label = withDevice(
		__( 'Position', 'zealblocks' ),
		stateKey,
		device
	);

	let help = __(
		'Absolute is placed against the nearest positioned parent, Fixed against the browser window.',
		'zealblocks'
	);

	if ( 'relative' === position ) {
		help = __(
			'Offsets nudge the block from where it would normally sit.',
			'zealblocks'
		);
	} else if ( 'absolute' === position && absoluteHelp ) {
		help = absoluteHelp;
	}

	return (
		<ToolsPanelItem
			hasValue={ () =>
				POSITION_ITEM_KEYS.some( ( key ) => undefined !== value( key ) )
			}
			label={ label }
			onDeselect={ () =>
				setAttributes( { style: clearPosition( style, stateKey ) } )
			}
			resetAllFilter={ ( attrs ) => ( {
				style: clearPosition( attrs?.style, stateKey ),
			} ) }
			panelId={ clientId }
		>
			<Flex direction="column" gap={ 3 } align="stretch">
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ label }
					value={ position }
					options={ POSITION_OPTIONS }
					onChange={ ( next ) => set( POSITION_KEY, next ) }
					help={ position ? help : undefined }
				/>

				{ !! position && (
					<>
						<BaseControl.VisualLabel>
							{ __( 'Offsets', 'zealblocks' ) }
						</BaseControl.VisualLabel>
						<div
							// Inline: the inspector lives outside the canvas
							// iframe, where editor.scss may not load.
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
									onChange={ ( next ) => set( key, next ) }
									units={ units }
									min={ -9999 }
									max={ 9999 }
								/>
							) ) }
						</div>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Preview in editor', 'zealblocks' ) }
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
	);
}
