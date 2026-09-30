<?php
/**
 * Server-resolved data for the editor.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * Parses the post once, and lets features add data to the editor.
 *
 * WHY THIS EXISTS RATHER THAN A FILTER PER FEATURE.
 *
 * Anything that wants server-resolved data in the editor needs the same two
 * things first: the post parsed into blocks, and only the blocks this plugin
 * owns. Done per feature, that is one full walk of the block tree per feature.
 *
 * So the walk happens here, once, and the result is passed to whoever asks.
 *
 * WHY ONLY THIS PLUGIN'S BLOCKS.
 *
 * A post is mostly core blocks. Asking "which icons does this post use" has no
 * interest in a core/paragraph, and if every feature filtered the tree itself
 * they would each do it slightly differently.
 *
 * WHY A JS GLOBAL AND NOT EDITOR SETTINGS.
 *
 * `block_editor_settings_all` looks like the natural home and is a trap:
 * `core/block-editor` filters settings through an allow-list of keys it knows
 * about, so a plugin's own key is silently dropped. An inline script is
 * printed before the bundle, so the data is simply there when a module
 * evaluates — no store, no allow-list, no ordering to reason about.
 */
final class Editor_Settings implements Module {

	/**
	 * The JS global everything nests under.
	 *
	 * @var string
	 */
	const GLOBAL_NAME = 'zealblocksData';

	/**
	 * Script handle the inline data is attached to.
	 *
	 * `wp-blocks` rather than a block's own handle: the data is shared, and
	 * attaching it to one block would leave it missing for the others.
	 *
	 * @var string
	 */
	const ATTACH_TO = 'wp-blocks';

	/**
	 * Block-name prefix identifying this plugin's blocks.
	 *
	 * @var string
	 */
	const BLOCK_PREFIX = ZEALBLOCKS_SLUG . '/';

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'print_data' ) );
	}

	/**
	 * Prints the collected data as a JS global.
	 *
	 * @return void
	 */
	public function print_data() {
		$post = get_post();

		/*
		 * No post means the site editor, the widgets screen or a template part.
		 * Everything here answers questions about a post's content.
		 */
		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		/**
		 * Filters the data sent to the editor.
		 *
		 * THE EXTENSION POINT. A feature adds its key here rather than hooking
		 * the enqueue itself, which is what keeps the post parsed once however
		 * many features need it.
		 *
		 * Return an empty value for a key and it is omitted rather than shipped
		 * empty, so the payload reflects what is actually in the post.
		 *
		 * @since 0.0.2
		 *
		 * @param array   $data   Data, keyed by feature.
		 * @param array[] $blocks This plugin's blocks, flattened out of the tree.
		 */
		$data = apply_filters(
			ZEALBLOCKS_SLUG . '_editor_data',
			array(),
			self::own_blocks( $post->post_content )
		);

		$data = is_array( $data ) ? array_filter( $data ) : array();

		if ( ! $data ) {
			return;
		}

		wp_add_inline_script(
			self::ATTACH_TO,
			sprintf( 'window.%s = %s;', self::GLOBAL_NAME, wp_json_encode( $data ) ),
			'before'
		);
	}

	/**
	 * Flattens post content to this plugin's blocks.
	 *
	 * Walks innerBlocks, because an icon inside a Buttons container or a core
	 * Group is still one of ours and would otherwise be missed — which shows
	 * up as an icon flashing in after load instead of being there already.
	 *
	 * @param string $content Post content.
	 * @return array[] Flattened blocks belonging to this plugin.
	 */
	private static function own_blocks( $content ) {
		$found = array();

		$walk = static function ( $blocks ) use ( &$walk, &$found ) {
			foreach ( $blocks as $block ) {
				if ( ! empty( $block['blockName'] )
					&& 0 === strpos( $block['blockName'], self::BLOCK_PREFIX ) ) {
					$found[] = $block;
				}

				if ( ! empty( $block['innerBlocks'] ) ) {
					$walk( $block['innerBlocks'] );
				}
			}
		};

		$walk( parse_blocks( $content ) );

		return $found;
	}
}
