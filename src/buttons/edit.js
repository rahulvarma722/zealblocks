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

/**
 * Inserted when an empty Buttons block is added.
 *
 * One child, so the block is never a blank container the user has to
 * figure out how to fill.
 */
const TEMPLATE = [ [ 'zealblocks/button' ] ];

export default function Edit( { clientId } ) {
	const hasChildren = useSelect(
		( select ) => select( blockEditorStore ).getBlockCount( clientId ) > 0,
		[ clientId ]
	);

	const blockProps = useBlockProps();
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

	return <div { ...innerBlocksProps } />;
}
