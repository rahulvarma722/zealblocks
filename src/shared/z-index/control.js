/**
 * Z-index — the per-device control, for every block that opts in.
 *
 * In the Dimensions panel, because WordPress 7.1 renders only its labelled
 * inspector groups on Tablet and Mobile; a control in `group="styles"` would
 * vanish there. The value goes to `style.zealblocks.zIndex` in core's
 * viewport-state shape, and Z_Index on the server turns it into a real
 * declaration per band.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	RangeControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../../button/responsive-width/style-value';
import { withDevice } from '../device-label';
import { Z_INDEX_KEY, Z_INDEX_RANGE } from './constants';

/**
 * Clears the z-index on one layer, for ToolsPanel reset filters.
 *
 * @param {?string} stateKey Layer being edited, null for the base.
 * @return {Function} A resetAllFilter.
 */
const resetZIndex = ( stateKey ) => ( attributes ) => ( {
	style: setStateValue( attributes?.style, stateKey, undefined, Z_INDEX_KEY ),
} );

/**
 * The z-index item alone, for a block that already has a Dimensions fill of
 * its own to put it in (Text's Position controls).
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited, null for the base.
 * @param {string}   props.device        Core device name.
 * @return {Element} The item.
 */
export function ZIndexItem( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
} ) {
	const zIndex = getStateValue( style, stateKey, Z_INDEX_KEY );
	const label = withDevice( __( 'Z-index', 'zealblocks' ), stateKey, device );

	const set = ( next ) =>
		setAttributes( {
			style: setStateValue( style, stateKey, next, Z_INDEX_KEY ),
		} );

	return (
		<ToolsPanelItem
			hasValue={ () => undefined !== zIndex }
			label={ label }
			onDeselect={ () => set( undefined ) }
			resetAllFilter={ resetZIndex( stateKey ) }
			panelId={ clientId }
		>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ label }
				value={ undefined === zIndex ? undefined : Number( zIndex ) }
				onChange={ ( next ) =>
					set(
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
	);
}

/**
 * The z-index control on its own Dimensions fill, for a block with no
 * Position panel (Button, Icon, Buttons). Spectra Free offers z-index alone
 * on these blocks; Position is a Pro feature.
 *
 * @param {Object} props Same as ZIndexItem.
 * @return {Element} The fill.
 */
export function ZIndexControl( props ) {
	return (
		<InspectorControls
			group="dimensions"
			resetAllFilter={ resetZIndex( props.stateKey ) }
		>
			<ZIndexItem { ...props } />
		</InspectorControls>
	);
}
