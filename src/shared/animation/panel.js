/**
 * Entrance animation — the Settings-tab panel, for every block that opts in.
 *
 * Not per viewport, so these are ordinary attributes in an ordinary panel.
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	Button,
	RangeControl,
	SelectControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import { GroupedSelect } from '../grouped-select';
import {
	ANIMATION_GROUPS,
	ANIMATION_DEFAULTS,
	EASING_OPTIONS,
} from './constants';

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
