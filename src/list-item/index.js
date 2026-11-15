/**
 * List item — block registration. Its styles ship with the List, which it
 * cannot exist without.
 */

import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import metadata from './block.json';
import Edit from './edit';

registerBlockType( metadata.name, {
	edit: Edit,

	/**
	 * The item's blocks are saved; its `<li>` and icon come from render.php.
	 */
	save: () => <InnerBlocks.Content />,
} );
