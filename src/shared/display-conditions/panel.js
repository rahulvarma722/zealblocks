/**
 * Display conditions — the Settings-tab panel, for every block that opts in.
 *
 * Not per viewport, so these are ordinary attributes in an ordinary panel.
 * Per-device hiding is not here: core's block visibility already does it,
 * from the block toolbar.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	CheckboxControl,
	SelectControl,
	ToggleControl,
	BaseControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import { BROWSER_OPTIONS, OS_OPTIONS, DAY_OPTIONS } from './constants';
import { setCondition } from './values';

const CACHE_HELP = __(
	'Checked when the page is generated. With a page cache, every visitor may see the same result.',
	'zealblocks'
);

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function DisplayConditionsPanel( {
	clientId,
	attributes,
	setAttributes,
} ) {
	const conditions = attributes.displayConditions || {};

	const set = ( key, value ) =>
		setAttributes( {
			displayConditions: setCondition( conditions, key, value ),
		} );

	const item = ( key, label, control, isShownByDefault = false ) => (
		<ToolsPanelItem
			key={ key }
			hasValue={ () => undefined !== conditions[ key ] }
			label={ label }
			onDeselect={ () => set( key, undefined ) }
			isShownByDefault={ isShownByDefault }
			panelId={ clientId }
		>
			{ control }
		</ToolsPanelItem>
	);

	const roles = [
		{ value: '', label: __( 'None', 'zealblocks' ) },
		...( window.zealblocksRoles || [] ),
	];

	const days = conditions.hideOnDays || [];

	return (
		<InspectorControls group="settings">
			<ToolsPanel
				label={ __( 'Display conditions', 'zealblocks' ) }
				resetAll={ () => setAttributes( { displayConditions: {} } ) }
				panelId={ clientId }
			>
				{ item(
					'hideWhenLoggedIn',
					__( 'Hide from logged-in users', 'zealblocks' ),
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Hide from logged-in users',
							'zealblocks'
						) }
						checked={ !! conditions.hideWhenLoggedIn }
						onChange={ ( next ) => set( 'hideWhenLoggedIn', next ) }
					/>,
					true
				) }
				{ item(
					'hideWhenLoggedOut',
					__( 'Hide from logged-out users', 'zealblocks' ),
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __(
							'Hide from logged-out users',
							'zealblocks'
						) }
						checked={ !! conditions.hideWhenLoggedOut }
						onChange={ ( next ) =>
							set( 'hideWhenLoggedOut', next )
						}
					/>,
					true
				) }
				{ item(
					'hideForRole',
					__( 'Hide for user role', 'zealblocks' ),
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Hide for user role', 'zealblocks' ) }
						value={ conditions.hideForRole || '' }
						options={ roles }
						onChange={ ( next ) => set( 'hideForRole', next ) }
					/>
				) }
				{ item(
					'hideForBrowser',
					__( 'Hide for browser', 'zealblocks' ),
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Hide for browser', 'zealblocks' ) }
						value={ conditions.hideForBrowser || '' }
						options={ BROWSER_OPTIONS }
						onChange={ ( next ) => set( 'hideForBrowser', next ) }
						help={ CACHE_HELP }
					/>
				) }
				{ item(
					'hideForOS',
					__( 'Hide for operating system', 'zealblocks' ),
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __(
							'Hide for operating system',
							'zealblocks'
						) }
						value={ conditions.hideForOS || '' }
						options={ OS_OPTIONS }
						onChange={ ( next ) => set( 'hideForOS', next ) }
						help={ CACHE_HELP }
					/>
				) }
				{ item(
					'hideOnDays',
					__( 'Hide on days', 'zealblocks' ),
					<BaseControl __nextHasNoMarginBottom help={ CACHE_HELP }>
						<BaseControl.VisualLabel>
							{ __( 'Hide on days', 'zealblocks' ) }
						</BaseControl.VisualLabel>
						{ DAY_OPTIONS.map( ( day ) => (
							<CheckboxControl
								key={ day.value }
								__nextHasNoMarginBottom
								label={ day.label }
								checked={ days.includes( day.value ) }
								onChange={ ( checked ) =>
									set(
										'hideOnDays',
										checked
											? [ ...days, day.value ]
											: days.filter(
													( value ) =>
														value !== day.value
											  )
									)
								}
							/>
						) ) }
					</BaseControl>
				) }
			</ToolsPanel>
		</InspectorControls>
	);
}
