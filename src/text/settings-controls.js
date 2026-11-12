/**
 * Text — the Animation and Display conditions panels, in the Settings tab.
 *
 * Neither is per viewport, so both are ordinary attributes and ordinary
 * Settings-tab panels. (Per-device hiding is not here: core's block
 * visibility already does it, from the block toolbar.)
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	Button,
	CheckboxControl,
	RangeControl,
	SelectControl,
	ToggleControl,
	BaseControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	ANIMATION_GROUPS,
	ANIMATION_DEFAULTS,
	EASING_OPTIONS,
	BROWSER_OPTIONS,
	OS_OPTIONS,
	DAY_OPTIONS,
} from './constants';
import { setCondition } from './style-values';

const CACHE_HELP = __(
	'Checked when the page is generated. With a page cache, every visitor may see the same result.',
	'zealblocks'
);

/**
 * A SelectControl whose options are grouped.
 *
 * @param {Object}   props
 * @param {Object[]} props.groups `{ label, options }` groups.
 * @param {string}   [props.none] Label of an ungrouped empty option.
 * @param {Object}   props.rest   Remaining SelectControl props.
 * @return {Element} The control.
 */
export function GroupedSelect( { groups, none, ...rest } ) {
	return (
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			{ ...rest }
		>
			{ none && <option value="">{ none }</option> }
			{ groups.map( ( group ) => (
				<optgroup key={ group.label } label={ group.label }>
					{ group.options.map( ( option ) => (
						<option key={ option.value } value={ option.value }>
							{ option.label }
						</option>
					) ) }
				</optgroup>
			) ) }
		</SelectControl>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {Function} props.onPreview     Replays the animation on the canvas.
 * @return {Element} The panel.
 */
export function AnimationPanel( {
	clientId,
	attributes,
	setAttributes,
	onPreview,
} ) {
	const {
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		animationRepeat,
	} = attributes;

	const has = ( key ) => attributes[ key ] !== ANIMATION_DEFAULTS[ key ];
	const resetKey = ( key ) => () =>
		setAttributes( { [ key ]: ANIMATION_DEFAULTS[ key ] } );

	return (
		<InspectorControls group="settings">
			<ToolsPanel
				label={ __( 'Animation', 'zealblocks' ) }
				resetAll={ () => setAttributes( { ...ANIMATION_DEFAULTS } ) }
				panelId={ clientId }
			>
				<ToolsPanelItem
					hasValue={ () => !! animationType }
					label={ __( 'Entrance animation', 'zealblocks' ) }
					onDeselect={ () =>
						setAttributes( { ...ANIMATION_DEFAULTS } )
					}
					isShownByDefault
					panelId={ clientId }
				>
					<GroupedSelect
						label={ __( 'Entrance animation', 'zealblocks' ) }
						value={ animationType }
						groups={ ANIMATION_GROUPS }
						none={ __( 'None', 'zealblocks' ) }
						onChange={ ( next ) =>
							setAttributes( { animationType: next } )
						}
						help={ __(
							'Plays when the block scrolls into view. Skipped for visitors who prefer reduced motion.',
							'zealblocks'
						) }
					/>
					{ !! animationType && (
						<Button
							variant="secondary"
							size="compact"
							onClick={ onPreview }
							style={ { marginTop: '8px' } }
						>
							{ __( 'Preview', 'zealblocks' ) }
						</Button>
					) }
				</ToolsPanelItem>

				{ !! animationType && (
					<>
						<ToolsPanelItem
							hasValue={ () => has( 'animationDuration' ) }
							label={ __( 'Duration', 'zealblocks' ) }
							onDeselect={ resetKey( 'animationDuration' ) }
							isShownByDefault
							panelId={ clientId }
						>
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Duration (ms)', 'zealblocks' ) }
								value={ animationDuration }
								onChange={ ( next ) =>
									setAttributes( {
										animationDuration:
											next ??
											ANIMATION_DEFAULTS.animationDuration,
									} )
								}
								min={ 100 }
								max={ 3000 }
								step={ 50 }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							hasValue={ () => has( 'animationDelay' ) }
							label={ __( 'Delay', 'zealblocks' ) }
							onDeselect={ resetKey( 'animationDelay' ) }
							isShownByDefault
							panelId={ clientId }
						>
							<RangeControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Delay (ms)', 'zealblocks' ) }
								value={ animationDelay }
								onChange={ ( next ) =>
									setAttributes( {
										animationDelay:
											next ??
											ANIMATION_DEFAULTS.animationDelay,
									} )
								}
								min={ 0 }
								max={ 3000 }
								step={ 50 }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							hasValue={ () => has( 'animationEasing' ) }
							label={ __( 'Easing', 'zealblocks' ) }
							onDeselect={ resetKey( 'animationEasing' ) }
							isShownByDefault
							panelId={ clientId }
						>
							<SelectControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Easing', 'zealblocks' ) }
								value={ animationEasing }
								options={ EASING_OPTIONS }
								onChange={ ( next ) =>
									setAttributes( { animationEasing: next } )
								}
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							hasValue={ () => has( 'animationRepeat' ) }
							label={ __( 'Repeat', 'zealblocks' ) }
							onDeselect={ resetKey( 'animationRepeat' ) }
							isShownByDefault
							panelId={ clientId }
						>
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __(
									'Play every time it scrolls into view',
									'zealblocks'
								) }
								checked={ !! animationRepeat }
								onChange={ ( next ) =>
									setAttributes( { animationRepeat: next } )
								}
							/>
						</ToolsPanelItem>
					</>
				) }
			</ToolsPanel>
		</InspectorControls>
	);
}

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
