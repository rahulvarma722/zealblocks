/**
 * Button — icon rotation, icon-only buttons and the hover icon (B-08 to B-10).
 *
 * Plain attributes, not per-device styles: Spectra keeps these in Settings
 * and does not vary them by device, and nor does the Icon block's rotation.
 */

import { __ } from '@wordpress/i18n';
import {
	AnglePickerControl,
	PanelBody,
	TextControl,
	ToggleControl,
	Flex,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';

import IconControl from '@/ui/icon-library';
import { hidesText, toPlainText, toRichText } from './icon-options';

/**
 * Left / Right, for the icon and the hover icon.
 *
 * @param {Object}   props
 * @param {string}   props.label    Control label.
 * @param {string}   props.value    'left' or 'right'.
 * @param {Function} props.onChange Called with the new side.
 * @return {Element} The control.
 */
export function SideControl( { label, value, onChange } ) {
	return (
		<ToggleGroupControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={ label }
			value={ value }
			onChange={ onChange }
			isBlock
		>
			<ToggleGroupControlOption
				value="left"
				label={ __( 'Left', 'zealblocks' ) }
			/>
			<ToggleGroupControlOption
				value="right"
				label={ __( 'Right', 'zealblocks' ) }
			/>
		</ToggleGroupControl>
	);
}

/**
 * Show text, the aria label that replaces it, and the icon's rotation. Goes in
 * the Settings panel, under the icon; renders nothing without an icon.
 *
 * Spectra shows Rotation only while the text shows. Here it shows whenever
 * there is an icon: rotating the icon of an icon-only button is as useful,
 * and render.php applies the rotation either way.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {?Element} The controls.
 */
export function IconTextSettings( { attributes, setAttributes } ) {
	const { icon, showText, text, iconRotation } = attributes;

	if ( ! icon ) {
		return null;
	}

	const label = toPlainText( text );

	return (
		<Flex direction="column" gap={ 4 } align="stretch">
			<ToggleControl
				__nextHasNoMarginBottom
				label={ __( 'Show text', 'zealblocks' ) }
				checked={ false !== showText }
				onChange={ ( value ) => setAttributes( { showText: value } ) }
				help={
					false === showText
						? __(
								'Only the icon shows. The text below names the button for screen readers.',
								'zealblocks'
						  )
						: undefined
				}
			/>

			{ hidesText( attributes ) && (
				<TextControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={ __( 'Aria label', 'zealblocks' ) }
					value={ label }
					onChange={ ( value ) =>
						setAttributes( { text: toRichText( value ) } )
					}
					help={
						label
							? __(
									'Read out in place of the hidden text.',
									'zealblocks'
							  )
							: __(
									'Add a label. Without one, screen readers announce only "link" or "button".',
									'zealblocks'
							  )
					}
				/>
			) }

			<AnglePickerControl
				label={ __( 'Icon rotation', 'zealblocks' ) }
				value={ iconRotation || 0 }
				onChange={ ( value ) =>
					setAttributes( { iconRotation: value || 0 } )
				}
			/>
		</Flex>
	);
}

/**
 * The Hover icon panel: an icon that replaces the button's icon while it is
 * hovered or has keyboard focus, or appears beside the text when there is no
 * icon.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function HoverIconPanel( { attributes, setAttributes } ) {
	const {
		showIconOnHover,
		hoverIcon,
		hoverIconPosition,
		hoverIconRotation,
		hoverIconFlipForRTL,
		hoverIconAriaLabel,
	} = attributes;
	const isIconOnly = hidesText( attributes );

	return (
		<PanelBody
			title={ __( 'Hover icon', 'zealblocks' ) }
			initialOpen={ !! showIconOnHover }
		>
			<Flex direction="column" gap={ 4 } align="stretch">
				<ToggleControl
					__nextHasNoMarginBottom
					label={ __( 'Show icon on hover', 'zealblocks' ) }
					checked={ !! showIconOnHover }
					onChange={ ( value ) =>
						setAttributes( { showIconOnHover: value } )
					}
					help={ __(
						'Shows another icon while the button is hovered or focused with the keyboard.',
						'zealblocks'
					) }
				/>

				{ !! showIconOnHover && (
					<IconControl
						label={ __( 'Hover icon', 'zealblocks' ) }
						value={ hoverIcon }
						onChange={ ( value ) =>
							setAttributes( { hoverIcon: value } )
						}
						flipForRTL={ hoverIconFlipForRTL }
						onFlipForRTLChange={ ( value ) =>
							setAttributes( { hoverIconFlipForRTL: value } )
						}
					/>
				) }

				{ !! showIconOnHover && !! hoverIcon && ! isIconOnly && (
					<SideControl
						label={ __( 'Hover icon position', 'zealblocks' ) }
						value={ hoverIconPosition }
						onChange={ ( value ) =>
							setAttributes( { hoverIconPosition: value } )
						}
					/>
				) }

				{ !! showIconOnHover && !! hoverIcon && (
					<AnglePickerControl
						label={ __( 'Hover icon rotation', 'zealblocks' ) }
						value={ hoverIconRotation || 0 }
						onChange={ ( value ) =>
							setAttributes( { hoverIconRotation: value || 0 } )
						}
					/>
				) }

				{ !! showIconOnHover && !! hoverIcon && isIconOnly && (
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Hover aria label', 'zealblocks' ) }
						value={ hoverIconAriaLabel }
						onChange={ ( value ) =>
							setAttributes( { hoverIconAriaLabel: value } )
						}
						help={ __(
							'Read out instead of the aria label while the hover icon shows. Leave empty to keep the aria label.',
							'zealblocks'
						) }
					/>
				) }
			</Flex>
		</PanelBody>
	);
}
