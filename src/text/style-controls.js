/**
 * Text — the per-viewport style controls.
 *
 * Every value here is stored in core's `style` attribute under `zealblocks`,
 * in core's viewport-state shape, through the same helpers the Button's width
 * uses. The state being edited — base, `@tablet` or `@mobile` — comes from
 * `useStyleState()` in edit.js and is passed down as `stateKey`.
 *
 * WHICH GROUP EACH CONTROL FILLS IS NOT COSMETIC. Core's responsive view
 * renders only seven inspector groups (typography, color, background, layout,
 * dimensions, border, elements). A fill anywhere else shows on Desktop and
 * vanishes on Tablet/Mobile — see docs/responsive-styles/experiment.md. So:
 *
 *   column gap, drop cap   →  typography
 *   hover colours          →  color
 *   text shadow            →  border  (core's "Border & Shadow" panel)
 *
 * Each of those groups is LABELLED by core, so the fills are bare
 * ToolsPanelItems: the panel heading is already there.
 */

import { __, sprintf, isRTL } from '@wordpress/i18n';
import {
	InspectorControls,
	useSettings,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	BaseControl,
	ColorPalette,
	Flex,
	RangeControl,
	ToggleControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';

import { KEYS, SHADOW_KEYS, GAP_UNITS, DROP_CAP_TAGS } from './constants';
import { clearKeys, setShadowValue } from './style-values';

/**
 * `12px` → 12. RangeControl works in numbers; the store holds lengths.
 *
 * @param {string|undefined} value Stored length.
 * @return {number|undefined} The number, or undefined.
 */
function toNumber( value ) {
	const number = parseFloat( value );

	return Number.isFinite( number ) ? number : undefined;
}

/**
 * A label that names the device when a viewport layer is being edited, so the
 * author can see which layer a value is going into.
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

/**
 * Column gap and drop cap, in the Typography panel.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fills.
 */
export function TypographyControls( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
} ) {
	const { style, tagName, dropCap } = attributes;

	const [ isDropCapEnabled ] = useSettings( 'typography.dropCap' );

	const units = useCustomUnits( { availableUnits: GAP_UNITS } );

	const columnGap = getStateValue( style, stateKey, KEYS.columnGap );

	const align = style?.typography?.textAlign || '';
	const isDropCapBlocked =
		! DROP_CAP_TAGS.includes( tagName || 'p' ) ||
		align === 'center' ||
		align === ( isRTL() ? 'left' : 'right' );

	let dropCapHelp = __( 'Show a large initial letter.', 'zealblocks' );

	if ( ! DROP_CAP_TAGS.includes( tagName || 'p' ) ) {
		dropCapHelp = __(
			'Not available for headings or span. Use Paragraph, Div or Blockquote.',
			'zealblocks'
		);
	} else if ( isDropCapBlocked ) {
		dropCapHelp = __( 'Not available for aligned text.', 'zealblocks' );
	}

	return (
		<InspectorControls
			group="typography"
			resetAllFilter={ ( attrs ) => ( {
				style: clearKeys( attrs?.style, stateKey, [ KEYS.columnGap ] ),
				// Drop cap is not per-viewport, so it is only reset with the
				// base layer — resetting Tablet must not switch it off.
				...( stateKey ? {} : { dropCap: false } ),
			} ) }
		>
			<ToolsPanelItem
				hasValue={ () => undefined !== columnGap }
				label={ withDevice(
					__( 'Column gap', 'zealblocks' ),
					stateKey,
					device
				) }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, [ KEYS.columnGap ] ),
					} )
				}
				resetAllFilter={ ( attrs ) => ( {
					style: clearKeys( attrs?.style, stateKey, [
						KEYS.columnGap,
					] ),
				} ) }
				panelId={ clientId }
			>
				<UnitControl
					__next40pxDefaultSize
					label={ withDevice(
						__( 'Column gap', 'zealblocks' ),
						stateKey,
						device
					) }
					labelPosition="top"
					value={ columnGap }
					onChange={ ( next ) =>
						setAttributes( {
							style: setStateValue(
								style,
								stateKey,
								next || undefined,
								KEYS.columnGap
							),
						} )
					}
					units={ units }
					min={ 0 }
					help={ __(
						'Space between text columns. Applies when Columns is 2 or more.',
						'zealblocks'
					) }
				/>
			</ToolsPanelItem>

			{ isDropCapEnabled && ! stateKey && (
				<ToolsPanelItem
					hasValue={ () => !! dropCap }
					label={ __( 'Drop cap', 'zealblocks' ) }
					onDeselect={ () => setAttributes( { dropCap: false } ) }
					resetAllFilter={ () => ( { dropCap: false } ) }
					panelId={ clientId }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Drop cap', 'zealblocks' ) }
						checked={ !! dropCap }
						onChange={ () =>
							setAttributes( { dropCap: ! dropCap } )
						}
						disabled={ isDropCapBlocked && ! dropCap }
						help={ dropCapHelp }
					/>
				</ToolsPanelItem>
			) }
		</InspectorControls>
	);
}

/**
 * Text shadow, in the Border & Shadow panel.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function TextShadowControl( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
} ) {
	const [ palette ] = useSettings( 'color.palette' );

	const value = ( key ) => getStateValue( style, stateKey, key );
	const hasShadow = SHADOW_KEYS.some( ( key ) => undefined !== value( key ) );

	const set = ( key, next ) =>
		setAttributes( {
			style: setShadowValue( style, stateKey, key, next ),
		} );

	const setLength = ( key ) => ( next ) =>
		set( key, undefined === next ? undefined : `${ next }px` );

	const label = withDevice(
		__( 'Text shadow', 'zealblocks' ),
		stateKey,
		device
	);

	return (
		<InspectorControls
			group="border"
			resetAllFilter={ ( attrs ) => ( {
				style: clearKeys( attrs?.style, stateKey, SHADOW_KEYS ),
			} ) }
		>
			<ToolsPanelItem
				hasValue={ () => hasShadow }
				label={ label }
				onDeselect={ () =>
					setAttributes( {
						style: clearKeys( style, stateKey, SHADOW_KEYS ),
					} )
				}
				resetAllFilter={ ( attrs ) => ( {
					style: clearKeys( attrs?.style, stateKey, SHADOW_KEYS ),
				} ) }
				isShownByDefault
				panelId={ clientId }
			>
				<Flex direction="column" gap={ 3 } align="stretch">
					<BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel>
					<ColorPalette
						__experimentalIsRenderedInSidebar
						aria-label={ __( 'Text shadow color', 'zealblocks' ) }
						colors={ palette || [] }
						value={ value( KEYS.shadowColor ) }
						onChange={ ( next ) =>
							set( KEYS.shadowColor, next || undefined )
						}
						enableAlpha
						clearable
					/>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Horizontal offset', 'zealblocks' ) }
						value={ toNumber( value( KEYS.shadowX ) ) }
						onChange={ setLength( KEYS.shadowX ) }
						min={ -20 }
						max={ 20 }
						initialPosition={ 0 }
						allowReset
					/>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Vertical offset', 'zealblocks' ) }
						value={ toNumber( value( KEYS.shadowY ) ) }
						onChange={ setLength( KEYS.shadowY ) }
						min={ -20 }
						max={ 20 }
						initialPosition={ 0 }
						allowReset
					/>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Blur', 'zealblocks' ) }
						value={ toNumber( value( KEYS.shadowBlur ) ) }
						onChange={ setLength( KEYS.shadowBlur ) }
						min={ 0 }
						max={ 40 }
						initialPosition={ 0 }
						allowReset
					/>
				</Flex>
			</ToolsPanelItem>
		</InspectorControls>
	);
}

/**
 * Hover colours and transition, in the Color panel.
 *
 * Background hover takes a colour OR a gradient into one key: the front end
 * emits it as the `background` shorthand, which also clears a gradient set for
 * the normal state — a solid hover colour would otherwise sit under it.
 *
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {?Object}  props.style         The block's `style` attribute.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function HoverControls( {
	clientId,
	style,
	setAttributes,
	stateKey,
	device,
} ) {
	const colorSettings = useMultipleOriginColorsAndGradients();

	const textHover = getStateValue( style, stateKey, KEYS.textHover );
	const backgroundHover = getStateValue(
		style,
		stateKey,
		KEYS.backgroundHover
	);
	const isGradient = !! backgroundHover?.includes( 'gradient' );
	const duration = getStateValue( style, stateKey, KEYS.hoverDuration );

	const set = ( key, next ) =>
		setAttributes( {
			style: setStateValue( style, stateKey, next || undefined, key ),
		} );

	const resetKey =
		( ...keys ) =>
		( attrs ) => ( {
			style: clearKeys( attrs?.style, stateKey, keys ),
		} );

	return (
		<InspectorControls
			group="color"
			resetAllFilter={ resetKey(
				KEYS.textHover,
				KEYS.backgroundHover,
				KEYS.hoverDuration
			) }
		>
			<ColorGradientSettingsDropdown
				__experimentalIsRenderedInSidebar
				panelId={ clientId }
				{ ...colorSettings }
				settings={ [
					{
						label: withDevice(
							__( 'Text hover', 'zealblocks' ),
							stateKey,
							device
						),
						colorValue: textHover,
						onColorChange: ( next ) => set( KEYS.textHover, next ),
						resetAllFilter: resetKey( KEYS.textHover ),
						enableAlpha: true,
						clearable: true,
					},
					{
						label: withDevice(
							__( 'Background hover', 'zealblocks' ),
							stateKey,
							device
						),
						colorValue: isGradient ? undefined : backgroundHover,
						gradientValue: isGradient ? backgroundHover : undefined,
						onColorChange: ( next ) =>
							set( KEYS.backgroundHover, next ),
						onGradientChange: ( next ) =>
							set( KEYS.backgroundHover, next ),
						resetAllFilter: resetKey( KEYS.backgroundHover ),
						enableAlpha: true,
						clearable: true,
					},
				] }
			/>

			<ToolsPanelItem
				hasValue={ () => undefined !== duration }
				label={ withDevice(
					__( 'Hover transition', 'zealblocks' ),
					stateKey,
					device
				) }
				onDeselect={ () => set( KEYS.hoverDuration, undefined ) }
				resetAllFilter={ resetKey( KEYS.hoverDuration ) }
				panelId={ clientId }
			>
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ withDevice(
						__( 'Hover transition (ms)', 'zealblocks' ),
						stateKey,
						device
					) }
					value={ toNumber( duration ) }
					onChange={ ( next ) =>
						set(
							KEYS.hoverDuration,
							undefined === next ? undefined : `${ next }ms`
						)
					}
					min={ 0 }
					max={ 2000 }
					step={ 50 }
					initialPosition={ 200 }
					allowReset
					help={ __(
						'How long the hover colours take to change.',
						'zealblocks'
					) }
				/>
			</ToolsPanelItem>
		</InspectorControls>
	);
}
