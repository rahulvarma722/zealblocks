/**
 * Text — block registration.
 */

import { registerBlockType } from '@wordpress/blocks';

import metadata from './block.json';
import Edit from './edit';

import './style.scss';
import './editor.scss';

registerBlockType( metadata.name, {
	edit: Edit,

	/**
	 * Dynamic block: the front-end markup comes from render.php.
	 *
	 * THIS IS ONLY SAFE BECAUSE `content` HAS NO `source`.
	 *
	 * block.json declares content as a plain `string` attribute, so core
	 * stores it inside the block comment delimiter:
	 *
	 *     <!-- wp:zealblocks/text {"content":"Hello","tagName":"h2"} /-->
	 *
	 * Declaring `"source": "rich-text"` instead — which is what core/heading
	 * and core/paragraph do — tells core to parse the value back out of the
	 * SAVED MARKUP. Combined with `save: () => null` there is no markup to
	 * parse from, so the content is written nowhere, reads back as empty, and
	 * the block renders nothing on the front end. It is the same trap as a
	 * container block returning null and discarding its inner blocks, and it
	 * fails just as silently: the editor looks fine until you reload.
	 *
	 * If this block ever gains a real save() that outputs the text, `source`
	 * should come back with it. The two decisions belong together.
	 *
	 * @return {null} Nothing.
	 */
	save: () => null,
} );
