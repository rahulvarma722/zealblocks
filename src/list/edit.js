/**
 * List — editor component.
 *
 * The list is the `<ul>` or `<ol>` itself; its items are the inner blocks, so
 * the canvas numbers them as the browser will. New items come from Enter in
 * an item (keyboard.js), so there is no appender of its own.
 */

import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';

import { useStyleState } from '../button/responsive-width/use-style-state';
import { getStateValue } from '../button/responsive-width/style-value';
import { ZIndexControl, getZIndexPreview } from '../shared/z-index';
import { HoverControls, getHoverPreview } from '../shared/hover';
import {
	AnimationPanel,
	useAnimationPreview,
	getAnimationProps,
} from '../shared/animation';
import {
	DisplayConditionsPanel,
	hasConditions as hasAnyCondition,
} from '../shared/display-conditions';
import { createItem, setListIcon, textOf } from './actions';
import { HOVER_PREFIX, ITEM, KEYS } from './constants';
import { bulletsIcon, numbersIcon } from './icons';
import { getListPreview } from './preview';
import { ListSettings } from './settings';
import { ListStyleControls } from './style-controls';

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		ordered,
		type,
		start,
		reversed,
		icon,
		iconAlign,
		style,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
		displayConditions,
	} = attributes;
	// As render.php: a <ul> shows its items' Icon blocks.
	const hasIcon = ! ordered;
	// As render.php: the spacing applies once any device sets it.
	const hasItemGap = [ null, '@tablet', '@mobile' ].some(
		( layer ) => undefined !== getStateValue( style, layer, KEYS.itemGap )
	);

	const { device, stateKey, Probes } = useStyleState();
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );
	const hasConditions = hasAnyCondition( displayConditions );

	const extraProps = useMemo( () => {
		const zIndex = getZIndexPreview( style, device );
		const hover = getHoverPreview( style, device, HOVER_PREFIX );
		const animation = getAnimationProps(
			{
				animationType,
				animationDuration,
				animationDelay,
				animationEasing,
			},
			isPreviewing
		);

		return {
			style: {
				...getListPreview( style, device ),
				...hover.style,
				...zIndex.style,
				...animation.style,
				listStyleType:
					ordered && type && 'decimal' !== type ? type : undefined,
			},
			className:
				[
					hasIcon ? 'has-icon' : '',
					hasItemGap ? 'has-item-gap' : '',
					hasIcon && 'center' === iconAlign ? 'is-icon-centred' : '',
					...hover.classes,
					...zIndex.classes,
					animation.className,
					hasConditions ? 'has-display-conditions' : '',
				]
					.filter( Boolean )
					.join( ' ' ) || undefined,
			...animation.data,
			...( ordered && Number.isFinite( start ) ? { start } : {} ),
			...( ordered && reversed ? { reversed: true } : {} ),
			...( hasIcon ? { role: 'list' } : {} ),
		};
	}, [
		style,
		device,
		ordered,
		type,
		start,
		reversed,
		hasIcon,
		hasItemGap,
		iconAlign,
		hasConditions,
		isPreviewing,
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
	] );

	const registry = useRegistry();
	const isEmpty = useSelect(
		( select ) => ! select( blockEditorStore ).getBlockCount( clientId ),
		[ clientId ]
	);

	/*
	 * An empty list gets its first item, with the cursor in its Text.
	 *
	 * Not a block template: core selects the FIRST block a template inserts,
	 * which in an item is the Icon, so the author would have to click before
	 * typing. Marked as not persistent, as core does for a template, so
	 * inserting the list and its first item is one undo step.
	 */
	useEffect( () => {
		if ( ! isEmpty ) {
			return;
		}

		const { isBlockSelected } = registry.select( blockEditorStore );
		const {
			replaceInnerBlocks,
			selectionChange,
			__unstableMarkNextChangeAsNotPersistent: markNotPersistent,
		} = registry.dispatch( blockEditorStore );
		const item = createItem( { icon: { icon } } );
		const isSelected = isBlockSelected( clientId );

		registry.batch( () => {
			markNotPersistent();
			replaceInnerBlocks( clientId, [ item ], false );

			if ( isSelected ) {
				selectionChange( textOf( item ).clientId, 'content', 0, 0 );
			}
		} );
		// Only when it becomes empty: the icon is read at that moment.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ isEmpty, clientId, registry ] );

	const blockProps = useBlockProps( extraProps );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ ITEM ],
		renderAppender: false,
	} );
	const TagName = ordered ? 'ol' : 'ul';
	const styleControlProps = {
		clientId,
		style,
		setAttributes,
		stateKey,
		device,
	};

	return (
		<>
			<BlockControls group="block">
				<ToolbarGroup>
					<ToolbarButton
						icon={ bulletsIcon }
						label={ __( 'Icons', 'zealblocks' ) }
						isPressed={ ! ordered }
						onClick={ () => setAttributes( { ordered: false } ) }
					/>
					<ToolbarButton
						icon={ numbersIcon }
						label={ __( 'Numbers', 'zealblocks' ) }
						isPressed={ ordered }
						onClick={ () => setAttributes( { ordered: true } ) }
					/>
				</ToolbarGroup>
			</BlockControls>

			<Probes />
			<ListSettings
				attributes={ attributes }
				setAttributes={ setAttributes }
				onIconChange={ ( next ) =>
					setListIcon( registry, clientId, next )
				}
			/>
			<ListStyleControls { ...styleControlProps } hasIcon={ hasIcon } />
			<HoverControls
				{ ...styleControlProps }
				textLabel={ __( 'Item text hover', 'zealblocks' ) }
				backgroundLabel={ __( 'Item background hover', 'zealblocks' ) }
			/>
			<ZIndexControl { ...styleControlProps } />
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

			<TagName { ...innerBlocksProps } />
		</>
	);
}
