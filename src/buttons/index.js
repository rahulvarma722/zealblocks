/**
 * Buttons — block registration.
 *
 * The name comes from block.json rather than a literal, so the namespace
 * lives in exactly one place per block.
 */

import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import metadata from './block.json';
import Edit from './edit';

import './style.scss';
import './editor.scss';

registerBlockType( metadata.name, {
	edit: Edit,

	/**
	 * Serialise the children, and only the children.
	 *
	 * This block renders through render.php, so it is tempting to return null
	 * here as a purely dynamic block would. That is wrong for a CONTAINER, and
	 * the failure is silent and destructive: with no save output, core writes
	 * the block as a self-closing comment — `<!-- wp:zealblocks/buttons /-->` —
	 * and every inner block is discarded at save time. The buttons vanish along
	 * with their text, urls and styles, and nothing warns the user.
	 *
	 * "Dynamic" only means the block's own MARKUP is generated at render time.
	 * Inner blocks still have to exist in post content, because that is where
	 * they are stored; render.php receives them already rendered, as `$content`.
	 *
	 * `InnerBlocks.Content` emits the children and no wrapper, which is what
	 * this block needs — render.php supplies the wrapping div itself, so saving
	 * one here would nest a second, unstyled element inside it.
	 *
	 * @return {Element} The serialised inner blocks.
	 */
	save: () => <InnerBlocks.Content />,
} );
