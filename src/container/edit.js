/**
 * Container — editor component.
 *
 * Core draws the layout: the block declares core's `layout` support, so the
 * Layout panel, the grid visualiser and the children's sizing controls are all
 * core's. This adds the hover styling, the size limits, the reverse order, the
 * tag, the link and the presets.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	createBlocksFromInnerBlocksTemplate,
	store as blocksStore,
} from '@wordpress/blocks';
import { useReducedMotion } from '@wordpress/compose';
import {
	Button,
	Notice,
	PanelBody,
	Placeholder,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

import { useStyleState } from '../button/responsive-width/use-style-state';
import {
	ButtonColorControls,
	ShadowHoverControl,
} from '../button/style-controls';
import { HoverControls } from '../shared/hover';
import { LinkToolbar } from '../shared/link';
import { getZIndexPreview } from '../shared/z-index';
import {
	AnimationPanel,
	useAnimationPreview,
	getAnimationProps,
} from '../shared/animation';
import {
	DisplayConditionsPanel,
	hasConditions as hasAnyCondition,
} from '../shared/display-conditions';
import { focalPosition, getStylePreview } from './preview';
import { LiftControl, ReverseControl, SizeControls } from './style-controls';
import { OverlayControls } from './overlay-controls';
import { ChildControls } from './child-controls';
import { VideoPanel } from './video-controls';
import { DividerControls } from './divider-controls';
import { ParentHoverControls } from './parent-hover-controls';
import { Divider } from './dividers';
import { WidthHandles } from './width-handles';
import { MAX_COLUMNS, WidthBar } from './width-bar';
import { rowState } from './widths';
import { PRESETS, withPresetStyle } from './presets';
import { containerIcon } from './icons';
import { LANDMARK_TAGS, TAGS } from './constants';

const TAG_LABELS = {
	div: __( 'Default (<div>)', 'zealblocks' ),
	section: '<section>',
	header: '<header>',
	footer: '<footer>',
	main: '<main>',
	article: '<article>',
	aside: '<aside>',
	nav: '<nav>',
};

/**
 * The presets picker, shown while a new Container is empty.
 *
 * @param {Object}   props
 * @param {Function} props.onSelect Called with a preset, or null for blank.
 * @return {Element} The placeholder.
 */
function Presets( { onSelect } ) {
	return (
		<Placeholder
			icon={ containerIcon }
			label={ __( 'Container', 'zealblocks' ) }
			instructions={ __(
				'Choose a layout. Each one stacks to a single column on mobile.',
				'zealblocks'
			) }
			className="wp-block-zealblocks-container__presets"
		>
			<ul className="wp-block-zealblocks-container__preset-list">
				{ PRESETS.map( ( preset ) => (
					<li key={ preset.name }>
						<Button
							__next40pxDefaultSize
							icon={ preset.icon }
							label={ preset.label }
							showTooltip
							onClick={ () => onSelect( preset ) }
						/>
					</li>
				) ) }
			</ul>
			<Button
				__next40pxDefaultSize
				variant="secondary"
				onClick={ () => onSelect( null ) }
			>
				{ __( 'Start blank', 'zealblocks' ) }
			</Button>
		</Placeholder>
	);
}

export default function Edit( {
	attributes,
	setAttributes,
	isSelected,
	clientId,
} ) {
	const {
		tagName,
		url,
		linkTarget,
		rel,
		linkLabel,
		ariaLabel,
		layout,
		style,
		overlayImage,
		overlayImageSize,
		overlayImagePosition,
		positionPreview,
		videoUrl,
		videoPoster,
		videoPosition,
		videoOnMobile,
		dividerTop,
		dividerBottom,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		displayConditions,
	} = attributes;

	const hasChildren = useSelect(
		( select ) => select( blockEditorStore ).getBlockCount( clientId ) > 0,
		[ clientId ]
	);
	const { replaceInnerBlocks } = useDispatch( blockEditorStore );

	/*
	 * The parent's layout type, for the child settings: align self and order
	 * mean something only in a flex or grid parent. Null at the top level. A
	 * parent with no layout attribute has its block type's default, as core's
	 * Row variation of Group does not and core's Columns does.
	 */
	const parentLayout = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlockAttributes, getBlockName } =
				select( blockEditorStore );
			const parentId = getBlockRootClientId( clientId );

			if ( ! parentId ) {
				return null;
			}

			const type = getBlockAttributes( parentId )?.layout?.type;

			if ( type ) {
				return type;
			}

			const supports = select( blocksStore ).getBlockType(
				getBlockName( parentId )
			)?.supports;

			return (
				( supports?.layout ?? supports?.__experimentalLayout )?.default
					?.type ?? 'default'
			);
		},
		[ clientId ]
	);

	// Parent hover rules hang off a parent Container's :hover, so the
	// controls are offered inside one.
	const parentIsContainer = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlockName } =
				select( blockEditorStore );
			const parentId = getBlockRootClientId( clientId );

			return (
				!! parentId &&
				'zealblocks/container' === getBlockName( parentId )
			);
		},
		[ clientId ]
	);

	// Column widths (CH-07): the handles show while the Row or one of its
	// columns is selected.
	const { childCount, hasSelectedChild } = useSelect(
		( select ) => ( {
			childCount: select( blockEditorStore ).getBlockCount( clientId ),
			hasSelectedChild: select( blockEditorStore ).hasSelectedInnerBlock(
				clientId,
				false
			),
		} ),
		[ clientId ]
	);

	const isReducedMotion = useReducedMotion();

	/*
	 * Whether a heading inside can name the link. render.php takes the first
	 * heading's text when there is no label; without either it falls back to
	 * the start of the text, which rarely says where the link goes.
	 */
	const hasHeading = useSelect(
		( select ) => {
			if ( ! url ) {
				return true;
			}

			const {
				getClientIdsOfDescendants,
				getBlockName,
				getBlockAttributes,
			} = select( blockEditorStore );

			return getClientIdsOfDescendants( clientId ).some( ( id ) => {
				const name = getBlockName( id );

				return (
					'core/heading' === name ||
					( 'zealblocks/text' === name &&
						/^h[1-6]$/.test( getBlockAttributes( id )?.tagName ) )
				);
			} );
		},
		[ clientId, url ]
	);

	/*
	 * The presets show for a Container inserted plain, empty and with no
	 * layout of its own yet. The Row, Stack and Grid variations set a layout,
	 * and so does every choice in the picker, "Start blank" included.
	 */
	const showPresets = ! hasChildren && ! layout;

	// Which viewport state the inspector is editing; see use-style-state.js.
	const { device, stateKey, Probes } = useStyleState();

	// Entrance animation, shared: src/shared/animation/preview.js.
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );

	const hasConditions = hasAnyCondition( displayConditions );

	// Memoised for the same reason as the Button's: see button/edit.js.
	const extraBlockProps = useMemo( () => {
		// Hover, shadow, lift, size limits and reverse order: see preview.js.
		const preview = getStylePreview(
			{
				style,
				layout,
				overlayImage,
				overlayImageSize,
				overlayImagePosition,
				positionPreview,
				dividerTop,
				dividerBottom,
			},
			device
		);
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
		const classes = [
			...preview.classes,
			...zIndex.classes,
			animation.className,
			hasConditions ? 'has-display-conditions' : '',
			videoUrl ? 'has-video' : '',
		].filter( Boolean );

		return {
			...( Object.keys( inline ).length ? { style: inline } : {} ),
			...( classes.length ? { className: classes.join( ' ' ) } : {} ),
			...animation.data,
		};
	}, [
		style,
		layout,
		overlayImage,
		overlayImageSize,
		overlayImagePosition,
		positionPreview,
		dividerTop,
		dividerBottom,
		videoUrl,
		device,
		isPreviewing,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		hasConditions,
	] );

	const blockProps = useBlockProps( extraBlockProps );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		/*
		 * A visible "+" button while empty, then core's default in-between
		 * inserter: as core's Group. `false` would leave an empty container
		 * no way to gain a child.
		 */
		renderAppender: hasChildren
			? undefined
			: InnerBlocks.ButtonBlockAppender,
	} );

	const selectPreset = ( preset ) => {
		if ( ! preset ) {
			setAttributes( { layout: { type: 'constrained' } } );
			return;
		}

		setAttributes( {
			layout: preset.layout,
			style: withPresetStyle( style, preset ),
		} );
		replaceInnerBlocks(
			clientId,
			createBlocksFromInnerBlocksTemplate( preset.innerBlocks ),
			false
		);
	};

	// What every per-viewport style control needs.
	const styleControlProps = {
		clientId,
		style,
		setAttributes,
		stateKey,
		device,
	};

	const TagName = TAGS.includes( tagName ) ? tagName : 'div';

	/*
	 * The video in the canvas: playing, unless the author prefers reduced
	 * motion, and absent in the Mobile preview when it is off on mobile, as on
	 * the front end. No pause button here; the canvas is not the page.
	 */
	const video =
		videoUrl && ! ( 'Mobile' === device && false === videoOnMobile ) ? (
			<video
				className="wp-block-zealblocks-container__video"
				src={ videoUrl }
				poster={ videoPoster || undefined }
				autoPlay={ ! isReducedMotion }
				muted
				loop
				playsInline
				aria-hidden="true"
				tabIndex={ -1 }
				style={ { objectPosition: focalPosition( videoPosition ) } }
			/>
		) : null;
	const { children: innerBlocks, ...wrapperProps } = innerBlocksProps;
	const widthState = rowState( layout, style, stateKey );
	const showHandles =
		( isSelected || hasSelectedChild ) &&
		widthState.row &&
		widthState.oneLine &&
		childCount >= 2 &&
		childCount <= MAX_COLUMNS;

	return (
		<>
			<LinkToolbar
				url={ url }
				linkTarget={ linkTarget }
				rel={ rel }
				setAttributes={ setAttributes }
				isSelected={ isSelected }
			/>

			<Probes />

			<HoverControls { ...styleControlProps } />
			<ButtonColorControls { ...styleControlProps } hasIcon={ false } />
			<ShadowHoverControl { ...styleControlProps } />
			<LiftControl { ...styleControlProps } />
			<SizeControls { ...styleControlProps } />
			<ReverseControl { ...styleControlProps } layout={ layout } />
			<WidthBar { ...styleControlProps } attributes={ attributes } />
			<OverlayControls
				{ ...styleControlProps }
				attributes={ attributes }
			/>
			<ChildControls
				{ ...styleControlProps }
				attributes={ attributes }
				parentLayout={ parentLayout }
			/>
			<DividerControls
				{ ...styleControlProps }
				attributes={ attributes }
			/>
			<ParentHoverControls
				{ ...styleControlProps }
				parentIsContainer={ parentIsContainer }
			/>

			{ url && (
				<InspectorControls>
					<PanelBody title={ __( 'Link', 'zealblocks' ) }>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Link label', 'zealblocks' ) }
							value={ linkLabel || '' }
							onChange={ ( next ) =>
								setAttributes( {
									linkLabel: next || undefined,
								} )
							}
							help={ __(
								'What screen readers announce for the link. Leave empty to use the first heading inside the container.',
								'zealblocks'
							) }
						/>
						{ ! linkLabel && ! hasHeading && (
							<Notice status="warning" isDismissible={ false }>
								{ __(
									'This link has no label and no heading inside, so screen readers will read the start of its text. Add a label that says where the link goes.',
									'zealblocks'
								) }
							</Notice>
						) }
					</PanelBody>
				</InspectorControls>
			) }

			<VideoPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
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

			<InspectorControls group="advanced">
				<SelectControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'HTML element', 'zealblocks' ) }
					value={ TagName }
					options={ TAGS.map( ( tag ) => ( {
						value: tag,
						label: TAG_LABELS[ tag ],
					} ) ) }
					onChange={ ( next ) =>
						setAttributes( {
							tagName: 'div' === next ? undefined : next,
						} )
					}
					help={ __(
						'Use a landmark element only for a real region of the page, once per kind.',
						'zealblocks'
					) }
				/>
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ __( 'Accessible name', 'zealblocks' ) }
					value={ ariaLabel || '' }
					onChange={ ( next ) =>
						setAttributes( { ariaLabel: next || undefined } )
					}
					help={
						LANDMARK_TAGS.includes( TagName )
							? __(
									'Names this region for screen readers. Needed when the page has more than one of this element.',
									'zealblocks'
							  )
							: __(
									'Read by screen readers. Usually left empty for a div.',
									'zealblocks'
							  )
					}
				/>
			</InspectorControls>

			{ showPresets ? (
				<TagName { ...blockProps }>
					<Presets onSelect={ selectPreset } />
				</TagName>
			) : (
				<TagName { ...wrapperProps }>
					{ video }
					<Divider config={ dividerTop } side="top" />
					<Divider config={ dividerBottom } side="bottom" />
					{ innerBlocks }
					{ showHandles && (
						<WidthHandles
							clientId={ clientId }
							stateKey={ stateKey }
						/>
					) }
				</TagName>
			) }
		</>
	);
}
