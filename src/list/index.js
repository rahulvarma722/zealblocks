/**
 * List — block registration.
 */

import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import metadata from './block.json';
import Edit from './edit';
import { bulletsIcon } from './icons';

import './style.scss';
import './editor.scss';

registerBlockType( metadata.name, {
	icon: bulletsIcon,
	edit: Edit,

	/**
	 * The items are saved; the list's own markup is not. render.php builds
	 * it, so `<ul>` / `<ol>` and its attributes follow the settings.
	 */
	save: () => <InnerBlocks.Content />,
} );
