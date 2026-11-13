/**
 * Buttons — editor component.
 *
 * A container block. `useInnerBlocksProps` merges the block's own props
 * with the inner-block list, so the layout support's flex classes land
 * on the same element that holds the children.
 */

import {
	useBlockProps,
	useInnerBlocksProps,
	InnerBlocks,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useMemo } from '@wordpress/element';

import { useStyleState } from '../button/responsive-width/use-style-state';
import { HoverControls, getHoverPreview } from '../shared/hover';
import { HOVER_VAR_PREFIX } from './constants';

/**
 * Inserted when an empty Buttons block is added.
 *
 * One child, so the block is never a blank container the user has to
 * figure out how to fill.
 */
const TEMPLATE = [ [ 'zealblocks/button' ] ];

export default function Edit( { clientId, attributes, setAttributes } ) {
	const { style } = attributes;

	const hasChildren = useSelect(
		( select ) => select( blockEditorStore ).getBlockCount( clientId ) > 0,
		[ clientId ]
	);

	// Which viewport state the inspector is editing; see use-style-state.js.
	const { device, stateKey, Probes } = useStyleState();

	/*
	 * Background hover for the previewed device (BS-02), as a custom property
	 * the editor stylesheet spends on :hover. render.php emits real per-band
	 * rules instead; see src/shared/hover/_hover.scss.
	 */
	const hoverPreview = useMemo(
		() => getHoverPreview( style, device, HOVER_VAR_PREFIX ),
		[ style, device ]
	);

	const blockProps = useBlockProps( {
		style: hoverPreview.style,
		className: hoverPreview.classes.join( ' ' ) || undefined,
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
		/*
		 * While empty, fall through to the default appender so the block
		 * is never a dead container. Once there is at least one button,
		 * switch to the compact "+" so the row stays tight — this is how
		 * core's Buttons block behaves.
		 *
		 * Never pass `false` here: it removes the appender entirely, and
		 * an empty Buttons block then has no way to gain a child at all.
		 */
		renderAppender: hasChildren
			? InnerBlocks.ButtonBlockAppender
			: undefined,
	} );

	return (
		<>
			<Probes />
			{ /* Background hover only: the container has no text colour. */ }
			<HoverControls
				clientId={ clientId }
				style={ style }
				setAttributes={ setAttributes }
				stateKey={ stateKey }
				device={ device }
				hasText={ false }
			/>
			<div { ...innerBlocksProps } />
		</>
	);
}
