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
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useMemo } from '@wordpress/element';

import { useStyleState } from '../button/responsive-width/use-style-state';
import { getStateValue } from '../button/responsive-width/style-value';
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
import { ITEM, KEYS } from './constants';
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
	const hasIcon = ! ordered && !! icon;
	// As render.php: the spacing applies once any device sets it.
	const hasItemGap = [ null, '@tablet', '@mobile' ].some(
		( layer ) => undefined !== getStateValue( style, layer, KEYS.itemGap )
	);

	const { device, stateKey, Probes } = useStyleState();
	const { isPreviewing, playPreview } = useAnimationPreview( attributes );
	const hasConditions = hasAnyCondition( displayConditions );

	const extraProps = useMemo( () => {
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

		return {
			style: {
				...getListPreview( style, device ),
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

	const blockProps = useBlockProps( extraProps );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ ITEM ],
		// An empty item: its own template adds the Text and puts the
		// cursor in it, which a nested template here would not.
		template: [ [ ITEM ] ],
		templateInsertUpdatesSelection: true,
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
						label={ __( 'Bullets or icons', 'zealblocks' ) }
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
			/>
			<ListStyleControls { ...styleControlProps } hasIcon={ hasIcon } />
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
