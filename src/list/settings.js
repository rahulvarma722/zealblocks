/**
 * List — the Settings panel: bullets or numbers; for numbers their style,
 * start and direction, all native; for bullets the icon, picked from presets
 * or the library, and how it lines up with the text.
 */

import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	Button,
	Flex,
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';

import IconControl, { useIcon, Icon } from '@/ui/icon-library';
import { ICON_PRESETS, ORDERED_TYPES } from './constants';

/**
 * One preset: a button showing the icon, pressed when it is the list's.
 *
 * @param {Object}   props
 * @param {string}   props.slug     Icon slug.
 * @param {boolean}  props.isActive Whether it is the list's icon.
 * @param {Function} props.onPick   Called with the slug.
 * @return {Element} The button.
 */
function Preset( { slug, isActive, onPick } ) {
	const icon = useIcon( slug );

	return (
		<Button
			__next40pxDefaultSize
			className="zealblocks-list-preset"
			icon={ <Icon icon={ icon } style={ { width: 20, height: 20 } } /> }
			label={ sprintf(
				/* translators: %s: icon name. */
				__( 'Icon: %s', 'zealblocks' ),
				icon?.label ?? slug
			) }
			showTooltip
			isPressed={ isActive }
			onClick={ () => onPick( slug ) }
		/>
	);
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {Element} The panel.
 */
export function ListSettings( { attributes, setAttributes } ) {
	const { ordered, type, start, reversed, icon, iconAlign } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'List', 'zealblocks' ) }>
				<Flex direction="column" gap={ 4 } align="stretch">
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'List type', 'zealblocks' ) }
						value={ ordered ? 'ordered' : 'unordered' }
						options={ [
							{
								value: 'unordered',
								label: __( 'Bullets or icons', 'zealblocks' ),
							},
							{
								value: 'ordered',
								label: __( 'Numbers', 'zealblocks' ),
							},
						] }
						onChange={ ( next ) =>
							setAttributes( { ordered: 'ordered' === next } )
						}
					/>

					{ ordered && (
						<>
							<SelectControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Numbering', 'zealblocks' ) }
								value={ type || 'decimal' }
								options={ ORDERED_TYPES }
								onChange={ ( next ) =>
									setAttributes( {
										type:
											'decimal' === next
												? undefined
												: next,
									} )
								}
							/>
							<TextControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								type="number"
								label={ __( 'Start at', 'zealblocks' ) }
								value={ start ?? '' }
								onChange={ ( next ) =>
									setAttributes( {
										start:
											'' === next ||
											Number.isNaN( Number( next ) )
												? undefined
												: Math.round( Number( next ) ),
									} )
								}
								placeholder="1"
							/>
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __( 'Count down', 'zealblocks' ) }
								checked={ !! reversed }
								onChange={ ( next ) =>
									setAttributes( {
										reversed: next || undefined,
									} )
								}
							/>
						</>
					) }

					{ ! ordered && (
						<>
							<div>
								<p
									// Inline: the inspector is outside the
									// canvas, where editor.scss is not loaded.
									style={ {
										margin: '0 0 8px',
										fontSize: '11px',
										fontWeight: 500,
										textTransform: 'uppercase',
									} }
								>
									{ __( 'Icon', 'zealblocks' ) }
								</p>
								<Flex wrap gap={ 1 } justify="flex-start">
									<Button
										__next40pxDefaultSize
										variant={
											icon ? 'tertiary' : 'secondary'
										}
										isPressed={ ! icon }
										onClick={ () =>
											setAttributes( { icon: '' } )
										}
									>
										{ __( 'Bullets', 'zealblocks' ) }
									</Button>
									{ ICON_PRESETS.map( ( slug ) => (
										<Preset
											key={ slug }
											slug={ slug }
											isActive={ slug === icon }
											onPick={ ( next ) =>
												setAttributes( { icon: next } )
											}
										/>
									) ) }
								</Flex>
							</div>
							<IconControl
								label={ __( 'Or any icon', 'zealblocks' ) }
								value={ icon }
								onChange={ ( next ) =>
									setAttributes( { icon: next || '' } )
								}
							/>
							{ !! icon && (
								<SelectControl
									__next40pxDefaultSize
									__nextHasNoMarginBottom
									label={ __(
										'Icon position',
										'zealblocks'
									) }
									value={ iconAlign || 'top' }
									options={ [
										{
											value: 'top',
											label: __(
												'With the first line',
												'zealblocks'
											),
										},
										{
											value: 'center',
											label: __(
												'Centred on the item',
												'zealblocks'
											),
										},
									] }
									onChange={ ( next ) =>
										setAttributes( { iconAlign: next } )
									}
								/>
							) }
						</>
					) }
				</Flex>
			</PanelBody>
		</InspectorControls>
	);
}
