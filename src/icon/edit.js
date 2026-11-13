/**
 * Icon — editor.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	BlockControls,
} from '@wordpress/block-editor';
import {
	Button,
	Notice,
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

import { useMemo, useState } from '@wordpress/element';

import IconControl, { IconPicker, useIcon, Icon } from '@/ui/icon-library';
import { useStyleState } from '../button/responsive-width/use-style-state';
import { HoverControls, getHoverPreview } from '../shared/hover';
import { LinkToolbar } from '../shared/link';
import { ZIndexControl, getZIndexPreview } from '../shared/z-index';
import {
	AnimationPanel,
	useAnimationPreview,
	getAnimationProps,
} from '../shared/animation';
import {
	DisplayConditionsPanel,
	hasConditions as hasAnyCondition,
} from '../shared/display-conditions';
import { HOVER_VAR_PREFIX } from './constants';
import { getSvgProps } from './svg-props';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	isSelected,
} ) {
	const {
		icon,
		isInline,
		flipHorizontal,
		flipVertical,
		rotation,
		label,
		flipForRTL,
		url,
		linkTarget,
		rel,
		style,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		displayConditions,
	} = attributes;

	// Which viewport state the inspector is editing; see use-style-state.js.
	const { device, stateKey, Probes } = useStyleState();

	// The block element, so the link popover opens beside the icon.
	const [ anchor, setAnchor ] = useState( null );

	/*
	 * One slug, not a list. The old hook fetched all 88 registered icons over
	 * REST just to find the one this block had; PHP now inlines whatever the
	 * post uses, so this is usually resolved before the first render.
	 */
	const iconData = useIcon( icon );

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

	/*
	 * The hover colours for the previewed device (I-01, I-02), as custom
	 * properties the editor stylesheet spends on :hover. render.php emits real
	 * per-band rules instead; see src/shared/hover/_hover.scss.
	 */
	const hoverPreview = useMemo(
		() => getHoverPreview( style, device, HOVER_VAR_PREFIX ),
		[ style, device ]
	);

	// Stacking order for the previewed device (S-07).
	const zIndexPreview = useMemo(
		() => getZIndexPreview( style, device ),
		[ style, device ]
	);

	// Entrance animation, shared: src/shared/animation/preview.js.
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );
	const animation = getAnimationProps(
		{ animationType, animationDuration, animationDelay, animationEasing },
		isPreviewing
	);

	const blockProps = useBlockProps( {
		ref: setAnchor,
		style: {
			...hoverPreview.style,
			...zIndexPreview.style,
			...animation.style,
		},
		...animation.data,
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
			// Mirrors render.php (I-03).
			flipForRTL ? 'has-rtl-flip' : '',
			...hoverPreview.classes,
			...zIndexPreview.classes,
			animation.className,
			// The canvas marks a block with display conditions; it never hides it.
			hasAnyCondition( displayConditions )
				? 'has-display-conditions'
				: '',
		]
			.filter( Boolean )
			.join( ' ' ),
	} );

	/*
	 * Flip classes go on the SVG, not here.
	 *
	 * style.scss selects `svg.is-flip-horizontal`, and render.php puts them
	 * there with the HTML API. The editor had them on the wrapper, where that
	 * selector cannot match — so flipping did nothing in the canvas while
	 * working perfectly once published.
	 */
	const svgProps = getSvgProps( { flipHorizontal, flipVertical, rotation } );

	const setIcon = ( value ) => setAttributes( { icon: value } );

	/*
	 * One picker for the whole block, opened from the toolbar and from the
	 * empty state. Driven rather than triggered, because neither of those
	 * buttons is safe to hand to Radix's `asChild`.
	 */
	const [ isPickerOpen, setIsPickerOpen ] = useState( false );

	const picker = (
		<IconPicker
			value={ icon }
			onChange={ setIcon }
			open={ isPickerOpen }
			onOpenChange={ setIsPickerOpen }
		/>
	);

	const toolbar = (
		<>
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

			{ /* The link (I-04): shared with the Button. */ }
			<LinkToolbar
				url={ url }
				linkTarget={ linkTarget }
				rel={ rel }
				setAttributes={ setAttributes }
				isSelected={ isSelected }
				anchor={ anchor }
			/>
		</>
	);

	const controls = (
		<>
			<Probes />

			{ /* Icon hover and background hover, per device, in Color. */ }
			<HoverControls
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				stateKey={ stateKey }
				device={ device }
				textLabel={ __( 'Icon hover', 'zealblocks' ) }
			/>

			{ /* Stacking order, per device, in Dimensions (S-07). */ }
			<ZIndexControl
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				stateKey={ stateKey }
				device={ device }
			/>

			<AnimationPanel
				clientId={ clientId }
				attributes={ attributes }
				setAttributes={ setAttributes }
				onPreview={ playPreview }
			/>
			<DisplayConditionsPanel
				clientId={ clientId }
				attributes={ attributes }
				setAttributes={ setAttributes }
			/>

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
							flipForRTL: false,
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
						{ /*
						 * The same control the button block uses. Two blocks
						 * rendering their own idea of an icon field is how they
						 * drift.
						 */ }
						<IconControl
							value={ icon }
							onChange={ setIcon }
							flipForRTL={ flipForRTL }
							onFlipForRTLChange={ ( value ) =>
								setAttributes( { flipForRTL: value } )
							}
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						hasValue={ () => !! isInline }
						label={ __( 'Inline', 'zealblocks' ) }
						onDeselect={ () =>
							setAttributes( { isInline: false } )
						}
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
						// A linked icon needs a name, so the field shows.
						isShownByDefault={ !! url }
						panelId={ clientId }
					>
						{ /*
						 * Not in Spectra: a link around an unlabelled icon has no
						 * accessible name of its own. render.php falls back to the
						 * icon's name, which says what it shows, not where it goes.
						 */ }
						{ !! url && ! label && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'This icon is a link. Add alternative text that says where it goes. Until then, screen readers announce the icon’s name.',
									'zealblocks'
								) }
							</Notice>
						) }
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Alternative text', 'zealblocks' ) }
							value={ label }
							onChange={ ( value ) =>
								setAttributes( { label: value } )
							}
							help={
								url
									? __(
											'Names the link for screen readers.',
											'zealblocks'
									  )
									: __(
											'Describe the icon only if it carries meaning of its own. Leave empty for decoration, and it will be hidden from screen readers.',
											'zealblocks'
									  )
							}
						/>
					</ToolsPanelItem>

					{ !! url && (
						<ToolsPanelItem
							hasValue={ () => !! rel }
							label={ __( 'Link rel', 'zealblocks' ) }
							onDeselect={ () => setAttributes( { rel: '' } ) }
							isShownByDefault
							panelId={ clientId }
						>
							<TextControl
								__next40pxDefaultSize
								__nextHasNoMarginBottom
								label={ __( 'Link rel', 'zealblocks' ) }
								value={ rel }
								onChange={ ( value ) =>
									setAttributes( { rel: value } )
								}
							/>
						</ToolsPanelItem>
					) }
				</ToolsPanel>
			</InspectorControls>
		</>
	);

	// Nothing chosen yet.
	if ( ! icon ) {
		return (
			<>
				{ toolbar }
				{ controls }
				{ picker }
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

	/*
	 * Chosen, but not resolved yet. Only reachable for a slug PHP did not
	 * inline — pasted content, or an icon picked in another session of the
	 * same page — so it is brief and rare. Showing the empty placeholder here
	 * would tell the user their icon had been lost.
	 */
	if ( ! iconData ) {
		return (
			<>
				{ toolbar }
				{ controls }
				{ picker }
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

	return (
		<>
			{ toolbar }
			{ controls }
			{ picker }
			<div { ...blockProps }>
				{ /*
				 * Drawn from the same data the front end uses, by a component
				 * that mirrors Icon_Library::render() — so the canvas cannot
				 * show something publishing would not produce. The old path
				 * injected registry markup with dangerouslySetInnerHTML,
				 * which this removes.
				 */ }
				<Icon
					icon={ iconData }
					{ ...svgProps }
					// Linked, the label names the link on the front end; the
					// canvas has no link, so it stays on the SVG here.
					label={ label }
				/>
			</div>
		</>
	);
}
