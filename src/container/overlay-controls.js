/**
 * Container — the overlay (P-42), in the Background panel.
 *
 * Fill (colour or gradient), opacity, blend mode and their hover values are
 * per device, under `style.zealblocks`, like every other style value. The
 * image is one for all devices, an attribute, and is offered only while
 * editing the base layer, so a Tablet view never seems to set it for Tablet.
 */

import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	Button,
	Flex,
	FocalPointPicker,
	RangeControl,
	SelectControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import {
	BLEND_MODES,
	KEYS,
	OVERLAY_IMAGE_SIZES,
	OVERLAY_KEYS,
} from './constants';
import { GRADIENT, fromPercent, setOverlayFill, toPercent } from './values';

/**
 * @param {Object}   props
 * @param {string}   props.clientId      Block client ID.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {?string}  props.stateKey      Layer being edited.
 * @param {string}   props.device        Core device name.
 * @return {Element} The fill.
 */
export function OverlayControls( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
} ) {
	const { style, overlayImage, overlayImageSize, overlayImagePosition } =
		attributes;
	const colorSettings = useMultipleOriginColorsAndGradients();
	const label = ( text ) => withDevice( text, stateKey, device );
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

	const reset =
		( ...keys ) =>
		( attrs ) => ( { style: clearKeys( attrs?.style, stateKey, keys ) } );

	const fillRow = ( key, text ) => {
		const current = value( key );
		const isGradient = GRADIENT.test( current || '' );
		const change = ( next ) =>
			setAttributes( {
				style: setOverlayFill(
					style,
					stateKey,
					key,
					next || undefined
				),
			} );

		return {
			label: label( text ),
			colorValue: isGradient ? undefined : current,
			gradientValue: isGradient ? current : undefined,
			onColorChange: change,
			onGradientChange: change,
			resetAllFilter: reset( key ),
			enableAlpha: true,
			clearable: true,
		};
	};

	const percentItem = ( key, text, help ) => (
		<ToolsPanelItem
			hasValue={ () => undefined !== value( key ) }
			label={ label( text ) }
			onDeselect={ () => set( key, undefined ) }
			resetAllFilter={ reset( key ) }
			panelId={ clientId }
		>
			<RangeControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ label( text ) }
				value={ toPercent( value( key ) ) }
				onChange={ ( next ) => set( key, fromPercent( next ) ) }
				min={ 0 }
				max={ 100 }
				step={ 5 }
				allowReset
				help={ help }
			/>
		</ToolsPanelItem>
	);

	const hasImage = !! overlayImage?.url;

	return (
		<InspectorControls
			group="background"
			resetAllFilter={ reset( ...OVERLAY_KEYS ) }
		>
			<ColorGradientSettingsDropdown
				__experimentalIsRenderedInSidebar
				panelId={ clientId }
				{ ...colorSettings }
				settings={ [
					fillRow( KEYS.overlay, __( 'Overlay', 'zealblocks' ) ),
					fillRow(
						KEYS.overlayHover,
						__( 'Overlay hover', 'zealblocks' )
					),
				] }
			/>

			{ percentItem(
				KEYS.overlayOpacity,
				__( 'Overlay opacity', 'zealblocks' ),
				__(
					'How much of the overlay shows. Text over a photo usually needs 40 to 70.',
					'zealblocks'
				)
			) }
			{ percentItem(
				KEYS.overlayHoverOpacity,
				__( 'Overlay hover opacity', 'zealblocks' )
			) }

			<ToolsPanelItem
				hasValue={ () => undefined !== value( KEYS.overlayBlend ) }
				label={ label( __( 'Overlay blend mode', 'zealblocks' ) ) }
				onDeselect={ () => set( KEYS.overlayBlend, undefined ) }
				resetAllFilter={ reset( KEYS.overlayBlend ) }
				panelId={ clientId }
			>
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ label( __( 'Overlay blend mode', 'zealblocks' ) ) }
					value={ value( KEYS.overlayBlend ) ?? 'normal' }
					options={ BLEND_MODES.map( ( mode ) => ( {
						value: mode,
						// The CSS keyword, readable: "color-dodge" as "Color dodge".
						label:
							mode.charAt( 0 ).toUpperCase() +
							mode.slice( 1 ).replace( '-', ' ' ),
					} ) ) }
					onChange={ ( next ) =>
						set(
							KEYS.overlayBlend,
							'normal' === next ? undefined : next
						)
					}
				/>
			</ToolsPanelItem>

			{ null === stateKey && (
				<ToolsPanelItem
					hasValue={ () => hasImage }
					label={ __( 'Overlay image', 'zealblocks' ) }
					onDeselect={ () =>
						setAttributes( {
							overlayImage: undefined,
							overlayImagePosition: undefined,
						} )
					}
					resetAllFilter={ () => ( {
						overlayImage: undefined,
						overlayImagePosition: undefined,
					} ) }
					panelId={ clientId }
				>
					<Flex direction="column" gap={ 3 } align="stretch">
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ overlayImage?.id }
								onSelect={ ( media ) =>
									setAttributes( {
										overlayImage: {
											id: media.id,
											url: media.url,
										},
									} )
								}
								render={ ( { open } ) => (
									<Button
										__next40pxDefaultSize
										variant="secondary"
										onClick={ open }
									>
										{ hasImage
											? __(
													'Replace overlay image',
													'zealblocks'
											  )
											: __(
													'Choose overlay image',
													'zealblocks'
											  ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						{ hasImage && (
							<>
								<FocalPointPicker
									__nextHasNoMarginBottom
									label={ __( 'Focal point', 'zealblocks' ) }
									url={ overlayImage.url }
									value={ overlayImagePosition }
									onChange={ ( next ) =>
										setAttributes( {
											overlayImagePosition: next,
										} )
									}
								/>
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={ __( 'Image size', 'zealblocks' ) }
									value={ overlayImageSize || 'cover' }
									options={ OVERLAY_IMAGE_SIZES.map(
										( size ) => ( {
											value: size,
											label: {
												cover: __(
													'Cover',
													'zealblocks'
												),
												contain: __(
													'Contain',
													'zealblocks'
												),
												repeat: __(
													'Tile',
													'zealblocks'
												),
											}[ size ],
										} )
									) }
									onChange={ ( next ) =>
										setAttributes( {
											overlayImageSize: next,
										} )
									}
									help={ __(
										'The same image on every device. It sits above the overlay colour.',
										'zealblocks'
									) }
								/>
							</>
						) }
					</Flex>
				</ToolsPanelItem>
			) }
		</InspectorControls>
	);
}
