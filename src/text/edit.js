/**
 * Text — editor.
 */

import { __, isRTL } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
	BlockControls,
} from '@wordpress/block-editor';
import {
	SelectControl,
	ToolbarDropdownMenu,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useMemo } from '@wordpress/element';

import { useStyleState } from '../button/responsive-width/use-style-state';
import {
	AnimationPanel,
	useAnimationPreview,
	getAnimationProps,
} from '../shared/animation';
import {
	DisplayConditionsPanel,
	hasConditions as hasAnyCondition,
} from '../shared/display-conditions';
import { GroupedSelect } from '../shared/grouped-select';

import {
	STYLE_PRESETS,
	TAG_GROUPS,
	TAG_OPTIONS,
	DEFAULT_TAG,
	DROP_CAP_TAGS,
} from './constants';
import { getPreview } from './preview';
import {
	TypographyControls,
	TextShadowControl,
	HoverControls,
} from './style-controls';
import { PositionControls } from './position-controls';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	mergeBlocks,
	onReplace,
	style,
} ) {
	const {
		content,
		styleAs,
		placeholder,
		tagName,
		dropCap,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		positionPreview,
		displayConditions,
	} = attributes;

	const tag = tagName || DEFAULT_TAG;
	// Which viewport layer the inspector is editing. The probes must render or
	// the detection reads nothing — see button/responsive-width/use-style-state.js.
	const { device, stateKey, Probes } = useStyleState();

	/*
	 * Mirrors render.php's drop cap guard, so the canvas never shows a drop cap
	 * the front end would drop.
	 */
	const align = attributes.style?.typography?.textAlign || '';
	const showDropCap =
		!! dropCap &&
		DROP_CAP_TAGS.includes( tag ) &&
		align !== 'center' &&
		align !== ( isRTL() ? 'left' : 'right' );

	// Shared with every animated block: src/shared/animation/preview.js.
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );

	const hasConditions = hasAnyCondition( displayConditions );

	/*
	 * Memoised for the same reason the Button memoises its block props: a fresh
	 * object every render churns useBlockProps()' merged refs and the props
	 * RichText spreads onto its contentEditable, which disturbs typing.
	 */
	const extraBlockProps = useMemo( () => {
		const preview = getPreview( attributes.style, device, {
			previewPosition: false !== positionPreview,
		} );
		const animation = getAnimationProps(
			{
				animationType,
				animationDuration,
				animationDelay,
				animationEasing,
			},
			isPreviewing
		);

		/*
		 * `styleAs` is a class, not an inline style.
		 *
		 * A class lets style.scss resolve the preset against the theme's own
		 * font-size presets with a fallback, and lets a theme override the whole
		 * scale in one place. An inline font-size would win against the theme
		 * forever and could not be themed at all.
		 */
		const classes = [
			styleAs ? `has-style-${ styleAs }` : '',
			showDropCap ? 'has-drop-cap' : '',
			...preview.classes,
			animation.className,
			hasConditions ? 'has-display-conditions' : '',
		].filter( Boolean );

		return {
			...( classes.length ? { className: classes.join( ' ' ) } : {} ),
			...animation.data,
			style: { ...style, ...preview.style, ...animation.style },
		};
	}, [
		attributes.style,
		device,
		styleAs,
		showDropCap,
		style,
		positionPreview,
		isPreviewing,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		hasConditions,
	] );

	const blockProps = useBlockProps( extraBlockProps );

	const controlProps = {
		clientId,
		attributes,
		style: attributes.style,
		setAttributes,
		stateKey,
		device,
	};

	return (
		<>
			<BlockControls group="block">
				<ToolbarDropdownMenu
					icon={ null }
					text={ tag.toUpperCase() }
					label={ __( 'Change HTML tag', 'zealblocks' ) }
					controls={ TAG_OPTIONS.map( ( option ) => ( {
						title: option.label,
						isActive: option.value === tag,
						onClick: () =>
							setAttributes( { tagName: option.value } ),
					} ) ) }
				/>
			</BlockControls>

			<Probes />

			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Settings', 'zealblocks' ) }
					resetAll={ () =>
						setAttributes( { tagName: DEFAULT_TAG, styleAs: '' } )
					}
					panelId={ clientId }
				>
					<ToolsPanelItem
						hasValue={ () => tag !== DEFAULT_TAG }
						label={ __( 'HTML tag', 'zealblocks' ) }
						onDeselect={ () =>
							setAttributes( { tagName: DEFAULT_TAG } )
						}
						isShownByDefault
						panelId={ clientId }
					>
						<GroupedSelect
							label={ __( 'HTML tag', 'zealblocks' ) }
							value={ tag }
							groups={ TAG_GROUPS }
							onChange={ ( value ) =>
								setAttributes( { tagName: value } )
							}
							help={ __(
								'The element for the document outline. How it looks is set by Style as.',
								'zealblocks'
							) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						hasValue={ () => !! styleAs }
						label={ __( 'Style as', 'zealblocks' ) }
						onDeselect={ () => setAttributes( { styleAs: '' } ) }
						isShownByDefault
						panelId={ clientId }
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Style as', 'zealblocks' ) }
							value={ styleAs }
							options={ STYLE_PRESETS }
							onChange={ ( value ) =>
								setAttributes( { styleAs: value } )
							}
							help={ __(
								'Sizing and weight, independent of the HTML tag.',
								'zealblocks'
							) }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<TypographyControls { ...controlProps } />
			<TextShadowControl { ...controlProps } />
			<HoverControls { ...controlProps } />
			<PositionControls { ...controlProps } />

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
			 * The editable IS the block root, rendered as the same element the
			 * front end produces, so the canvas stays honest.
			 */ }
			<RichText
				{ ...blockProps }
				identifier="content"
				tagName={ tag }
				value={ content }
				onChange={ ( value ) => setAttributes( { content: value } ) }
				onMerge={ mergeBlocks }
				onReplace={ onReplace }
				placeholder={ placeholder || __( 'Text…', 'zealblocks' ) }
			/>
		</>
	);
}
