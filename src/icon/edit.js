/**
 * Icon — editor.
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	BlockControls,
} from '@wordpress/block-editor';
import {
	Button,
	Modal,
	ToggleControl,
	RangeControl,
	TextControl,
	Placeholder,
	Spinner,
	ToolbarGroup,
	ToolbarButton,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

import { useIcons, findIcon } from './use-icons';
import IconPicker from './icon-picker';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { icon, isInline, flipHorizontal, flipVertical, rotation, label } =
		attributes;

	const { icons, isLoading } = useIcons();
	const selected = findIcon( icons, icon );

	/*
	 * The picker opens in a MODAL, not inline in the sidebar.
	 *
	 * A grid of 88 glyphs in a 280px inspector panel is about four per row and
	 * a lot of scrolling — you cannot scan it, which is the one thing a visual
	 * picker has to allow. The modal also leaves room for search and the
	 * collection filter without them squeezing the grid.
	 */
	const [ isPickerOpen, setIsPickerOpen ] = useState( false );

	const choose = ( name ) => {
		setAttributes( { icon: name } );
		setIsPickerOpen( false );
	};

	/*
	 * `is-placeholder` exists because blockProps HAS to sit on the outermost
	 * element for the editor to work — selection, the toolbar and the block
	 * outline all key off it — so the empty state renders inside the same
	 * wrapper the icon does.
	 *
	 * That wrapper is sized like an icon: `width: 1.5rem`, `display:
	 * inline-block`, `line-height: 0`. A Placeholder inside it gets crushed
	 * into a 24px box with no line-height, which is unreadable. The class lets
	 * editor.scss undo the icon sizing for exactly the states that are not an
	 * icon yet.
	 */
	const hasIcon = !! icon;

	const blockProps = useBlockProps( {
		className: [
			! hasIcon ? 'is-placeholder' : '',
			/*
			 * `is-inline` only while there IS an icon.
			 *
			 * Both classes set `display`, and at equal specificity, so which
			 * won would come down to stylesheet order — editor.scss happening
			 * to load after style.scss. Not emitting the conflict is more
			 * robust than relying on that, and the placeholder is never inline
			 * regardless of the setting.
			 */
			hasIcon && isInline ? 'is-inline' : '',
			flipHorizontal ? 'is-flip-horizontal' : '',
			flipVertical ? 'is-flip-vertical' : '',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );

	const modal = isPickerOpen && (
		<Modal
			title={ __( 'Icon library', 'zealblocks' ) }
			onRequestClose={ () => setIsPickerOpen( false ) }
			size="medium"
			className="zealblocks-icon-picker__modal"
		>
			<IconPicker value={ icon } onSelect={ choose } />
		</Modal>
	);

	const toolbar = (
		<BlockControls group="block">
			<ToolbarGroup>
				<ToolbarButton
					icon="star-filled"
					label={ __( 'Select an icon', 'zealblocks' ) }
					onClick={ () => setIsPickerOpen( true ) }
					aria-haspopup="dialog"
				/>
			</ToolbarGroup>
		</BlockControls>
	);

	const controls = (
		<InspectorControls group="settings">
			<ToolsPanel
				label={ __( 'Icon', 'zealblocks' ) }
				resetAll={ () =>
					setAttributes( {
						isInline: false,
						flipHorizontal: false,
						flipVertical: false,
						rotation: 0,
						label: '',
					} )
				}
				panelId={ clientId }
			>
				<ToolsPanelItem
					hasValue={ () => !! icon }
					label={ __( 'Icon', 'zealblocks' ) }
					onDeselect={ () => setAttributes( { icon: '' } ) }
					isShownByDefault
					panelId={ clientId }
				>
					<Button
						__next40pxDefaultSize
						variant="secondary"
						onClick={ () => setIsPickerOpen( true ) }
						disabled={ isLoading }
						aria-haspopup="dialog"
					>
						{ selected
							? sprintf(
									/* translators: %s: the selected icon's name. */
									__( 'Change icon: %s', 'zealblocks' ),
									selected.label || selected.name
							  )
							: __( 'Select an icon', 'zealblocks' ) }
					</Button>
				</ToolsPanelItem>

				<ToolsPanelItem
					hasValue={ () => !! isInline }
					label={ __( 'Inline', 'zealblocks' ) }
					onDeselect={ () => setAttributes( { isInline: false } ) }
					isShownByDefault
					panelId={ clientId }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Display inline', 'zealblocks' ) }
						checked={ !! isInline }
						onChange={ ( value ) =>
							setAttributes( { isInline: value } )
						}
						help={
							isInline
								? __(
										'The icon flows with surrounding text.',
										'zealblocks'
								  )
								: __(
										'The icon sits on its own line.',
										'zealblocks'
								  )
						}
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					hasValue={ () => flipHorizontal || flipVertical }
					label={ __( 'Flip', 'zealblocks' ) }
					onDeselect={ () =>
						setAttributes( {
							flipHorizontal: false,
							flipVertical: false,
						} )
					}
					isShownByDefault
					panelId={ clientId }
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Flip horizontally', 'zealblocks' ) }
						checked={ !! flipHorizontal }
						onChange={ ( value ) =>
							setAttributes( { flipHorizontal: value } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Flip vertically', 'zealblocks' ) }
						checked={ !! flipVertical }
						onChange={ ( value ) =>
							setAttributes( { flipVertical: value } )
						}
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					hasValue={ () => !! rotation }
					label={ __( 'Rotation', 'zealblocks' ) }
					onDeselect={ () => setAttributes( { rotation: 0 } ) }
					panelId={ clientId }
				>
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Rotation', 'zealblocks' ) }
						value={ rotation }
						onChange={ ( value ) =>
							setAttributes( { rotation: value ?? 0 } )
						}
						min={ 0 }
						max={ 359 }
						step={ 1 }
						/*
						 * The quarter turns cover almost every real use, but a
						 * free range is what makes the control worth having
						 * over four preset buttons.
						 */
						marks={ [
							{ value: 0, label: '0°' },
							{ value: 90, label: '90°' },
							{ value: 180, label: '180°' },
							{ value: 270, label: '270°' },
						] }
					/>
				</ToolsPanelItem>

				<ToolsPanelItem
					hasValue={ () => !! label }
					label={ __( 'Alternative text', 'zealblocks' ) }
					onDeselect={ () => setAttributes( { label: '' } ) }
					panelId={ clientId }
				>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Alternative text', 'zealblocks' ) }
						value={ label }
						onChange={ ( value ) =>
							setAttributes( { label: value } )
						}
						help={ __(
							'Describe the icon only if it carries meaning of its own. Leave empty for decoration, and it will be hidden from screen readers.',
							'zealblocks'
						) }
					/>
				</ToolsPanelItem>
			</ToolsPanel>
		</InspectorControls>
	);

	if ( isLoading && ! icon ) {
		return (
			<>
				{ toolbar }
				{ controls }
				{ modal }
				<div { ...blockProps }>
					<Placeholder
						icon="star-filled"
						label={ __( 'Icon', 'zealblocks' ) }
					>
						<Spinner />
					</Placeholder>
				</div>
			</>
		);
	}

	if ( ! selected ) {
		return (
			<>
				{ toolbar }
				{ controls }
				{ modal }
				<div { ...blockProps }>
					<Placeholder
						icon="star-filled"
						label={ __( 'Icon', 'zealblocks' ) }
						instructions={ __(
							'Choose an icon to get started.',
							'zealblocks'
						) }
					>
						<Button
							__next40pxDefaultSize
							variant="primary"
							onClick={ () => setIsPickerOpen( true ) }
							aria-haspopup="dialog"
						>
							{ __( 'Browse the icon library', 'zealblocks' ) }
						</Button>
					</Placeholder>
				</div>
			</>
		);
	}

	return (
		<>
			{ toolbar }
			{ controls }
			{ modal }
			<div { ...blockProps }>
				{ /*
				 * The SVG markup comes from core's icon registry over an
				 * authenticated REST endpoint (`edit_posts`), and is the same
				 * markup wp_get_icon() prints on the front end. There is no
				 * React equivalent — the registry stores markup, not
				 * components — so this is the only way to preview it, and
				 * rendering anything else here would mean the canvas showing
				 * something the front end does not produce.
				 */ }
				<span
					className="wp-block-zealblocks-icon__svg"
					style={
						rotation
							? { rotate: `${ rotation % 360 }deg` }
							: undefined
					}
					// eslint-disable-next-line react/no-danger
					dangerouslySetInnerHTML={ { __html: selected.content } }
				/>
			</div>
		</>
	);
}
