/**
 * Button — editor component.
 *
 * `useBlockProps()` carries everything core generates from the block's
 * `supports`, including its responsive and pseudo-state rules. It is
 * spread onto the same element render.php uses as the block root, so the
 * editor and the front end style the same node.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useMemo } from '@wordpress/element';

import IconControl, { useIcon, Icon } from '@/ui/icon-library';
import ResponsiveWidthControl from './responsive-width';
import { useStyleState } from './responsive-width/use-style-state';
import { getResolvedValue } from './responsive-width/style-value';
import { ICON_SIZE_KEY, CSS_VARS } from './responsive-width/constants';
import { HoverControls } from '../shared/hover';
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
import { getStylePreview } from './preview';
import {
	ButtonColorControls,
	IconGapControl,
	ShadowHoverControl,
} from './style-controls';
import { getIconClasses, getIconProps, hidesText } from './icon-options';
import { HoverIconPanel, IconTextSettings, SideControl } from './icon-settings';

export default function Edit( {
	attributes,
	setAttributes,
	isSelected,
	clientId,
} ) {
	const {
		text,
		url,
		linkTarget,
		rel,
		title,
		style,
		icon,
		iconPosition,
		flipForRTL,
		iconRotation,
		showText,
		showIconOnHover,
		hoverIcon,
		hoverIconPosition,
		hoverIconRotation,
		hoverIconFlipForRTL,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		displayConditions,
	} = attributes;

	// The canvas marks a block with display conditions; it never hides it.
	const hasConditions = hasAnyCondition( displayConditions );

	// Entrance animation, shared: src/shared/animation/preview.js.
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );

	// Resolves the saved slugs. Preloaded by PHP, so this costs nothing on load.
	const iconData = useIcon( icon );
	const hoverIconData = useIcon( showIconOnHover ? hoverIcon : '' );
	const isIconOnly = hidesText( { icon, showText } );

	// Which viewport state the inspector is editing, and the probe that makes
	// the answer knowable at all. See responsive-width/use-style-state.js.
	const { device, stateKey, diagnostics, Probes } = useStyleState();

	/*
	 * Preview the width for the device being previewed, not for the state
	 * being edited. Those differ: with Responsive styles off on Tablet the
	 * canvas is narrow (so the front end would apply any tablet override) while
	 * the control is editing the base. Resolving by DEVICE keeps the canvas
	 * honest about what a visitor at that width would see.
	 *
	 * Inline rather than a media query because the editor canvas is already
	 * sized to the device; render.php emits the real media queries.
	 */
	const previewWidth = getResolvedValue( style, device );

	/*
	 * The icon size resolves exactly like the width — same layer, same
	 * fallback — but lands on the root as a CUSTOM PROPERTY rather than as a
	 * real declaration, because the element it styles is a child.
	 *
	 * This is the whole descendant technique: the platform lets us write to the
	 * block root, so the root carries a variable and the stylesheet spends it on
	 * `.wp-block-zealblocks-button__icon`. No selector plumbing, and it behaves
	 * identically in the canvas and on the front end because both read the same
	 * rule from style.scss.
	 */
	const previewIconSize = getResolvedValue( style, device, ICON_SIZE_KEY );

	/*
	 * Memoised deliberately. `useBlockProps()` feeds whatever it is given into
	 * `useMergeRefs()`, so handing it a fresh object literal on every render
	 * churns the block root's ref and the props RichText spreads onto its
	 * contentEditable — which is enough to disturb typing. A stable object
	 * means the identity only changes when the previewed width actually does.
	 */
	const extraBlockProps = useMemo( () => {
		// Hover, icon colours, gap and shadow hover: see preview.js.
		const preview = getStylePreview( style, device );
		// Stacking order for the previewed device (S-07).
		const zIndex = getZIndexPreview( style, device );
		const animation = getAnimationProps(
			{
				animationType,
				animationDuration,
				animationDelay,
				animationEasing,
			},
			isPreviewing
		);
		const inline = {
			...preview.style,
			...zIndex.style,
			...animation.style,
		};

		if ( previewWidth ) {
			inline.width = previewWidth;
		}

		if ( previewIconSize ) {
			inline[ CSS_VARS.iconSize ] = previewIconSize;
		}

		// Mirrors render.php, so the canvas and the front end agree.
		const classes = [
			...getIconClasses( {
				icon,
				iconPosition,
				flipForRTL,
				showText,
				showIconOnHover,
				hoverIcon,
				hoverIconPosition,
				hoverIconFlipForRTL,
			} ),
			...preview.classes,
			...zIndex.classes,
			animation.className,
			hasConditions ? 'has-display-conditions' : '',
		].filter( Boolean );

		return {
			...( Object.keys( inline ).length ? { style: inline } : {} ),
			...( classes.length ? { className: classes.join( ' ' ) } : {} ),
			...animation.data,
		};
	}, [
		style,
		device,
		previewWidth,
		previewIconSize,
		icon,
		iconPosition,
		flipForRTL,
		showText,
		showIconOnHover,
		hoverIcon,
		hoverIconPosition,
		hoverIconFlipForRTL,
		isPreviewing,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		hasConditions,
	] );

	// The block root. render.php puts the same classes on its <a>.
	const blockProps = useBlockProps( extraBlockProps );

	// What every per-viewport style control needs.
	const styleControlProps = {
		clientId,
		style,
		setAttributes,
		stateKey,
		device,
	};

	return (
		<>
			{ /* Link and Unlink, and the link popover: shared with the Icon. */ }
			<LinkToolbar
				url={ url }
				linkTarget={ linkTarget }
				rel={ rel }
				setAttributes={ setAttributes }
				isSelected={ isSelected }
			/>

			<Probes />

			<ResponsiveWidthControl
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				device={ device }
				stateKey={ stateKey }
				diagnostics={ diagnostics }
			/>

			<HoverControls { ...styleControlProps } />
			<ButtonColorControls { ...styleControlProps } hasIcon={ !! icon } />
			<IconGapControl { ...styleControlProps } hasIcon={ !! icon } />
			<ShadowHoverControl { ...styleControlProps } />
			<ZIndexControl { ...styleControlProps } />

			<InspectorControls>
				<PanelBody title={ __( 'Settings', 'zealblocks' ) }>
					<IconControl
						value={ icon }
						onChange={ ( value ) =>
							/*
							 * Removing the icon brings the text back, as in
							 * Spectra: an icon-only button with no icon would
							 * be empty. render.php shows the text anyway.
							 */
							setAttributes( {
								icon: value,
								...( value ? {} : { showText: true } ),
							} )
						}
						flipForRTL={ flipForRTL }
						onFlipForRTLChange={ ( value ) =>
							setAttributes( { flipForRTL: value } )
						}
					/>

					{ !! icon && ! isIconOnly && (
						<SideControl
							label={ __( 'Icon position', 'zealblocks' ) }
							value={ iconPosition }
							onChange={ ( value ) =>
								setAttributes( { iconPosition: value } )
							}
						/>
					) }

					<IconTextSettings
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>

					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Link rel', 'zealblocks' ) }
						value={ rel }
						onChange={ ( value ) =>
							setAttributes( { rel: value } )
						}
					/>
					<TextControl
						__nextHasNoMarginBottom
						__next40pxDefaultSize
						label={ __( 'Title attribute', 'zealblocks' ) }
						value={ title }
						onChange={ ( value ) =>
							setAttributes( { title: value } )
						}
						help={ __(
							'Describes the link destination for assistive technology.',
							'zealblocks'
						) }
					/>
				</PanelBody>

				<HoverIconPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

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

			{ /*
			 * A span in the editor rather than an anchor, so a click
			 * selects the block instead of following the link.
			 */ }
			{ /*
			 * RichText can no longer BE the block root: the root now holds two
			 * children, the text and the icon. So blockProps moves to a
			 * wrapping span and RichText becomes an ordinary child — which is
			 * also what render.php does.
			 */ }
			<span { ...blockProps }>
				{ ! isIconOnly && (
					<RichText
						tagName="span"
						value={ text }
						onChange={ ( value ) =>
							setAttributes( { text: value } )
						}
						placeholder={ __( 'Add text…', 'zealblocks' ) }
						allowedFormats={ [] }
						identifier="text"
					/>
				) }
				<Icon
					icon={ iconData }
					{ ...getIconProps(
						'wp-block-zealblocks-button__icon',
						iconRotation
					) }
				/>
				{ /* Shown on hover by style.scss, as on the front end. */ }
				<Icon
					icon={ hoverIconData }
					{ ...getIconProps(
						'wp-block-zealblocks-button__hover-icon',
						hoverIconRotation
					) }
				/>
			</span>
		</>
	);
}
