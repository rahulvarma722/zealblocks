/**
 * Text — position, offsets, overflow and z-index, in the Dimensions panel.
 * The Position item itself is shared: src/shared/position.
 *
 * Per viewport like the other style controls, so they live in a group the
 * responsive view renders (see style-controls.js for why the group matters).
 * Values go to `style.zealblocks` in core's viewport-state shape; render.php
 * turns them into real declarations per band.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { withDevice } from '../shared/device-label';
import { ZIndexItem } from '../shared/z-index';
import { PositionItem } from '../shared/position';

import { KEYS, POSITION_KEYS, OVERFLOW_OPTIONS } from './constants';
import { clearKeys } from './style-values';

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

	const overflow = value( KEYS.overflow ) || '';

	const overflowLabel = withDevice(
		__( 'Overflow', 'zealblocks' ),
		stateKey,
		device
	);

	return (
		<InspectorControls
			group="dimensions"
			resetAllFilter={ reset( KEYS.zIndex, ...POSITION_KEYS ) }
		>
			<PositionItem
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				stateKey={ stateKey }
				device={ device }
				positionPreview={ positionPreview }
			/>

			<ZIndexItem
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				stateKey={ stateKey }
				device={ device }
			/>

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
