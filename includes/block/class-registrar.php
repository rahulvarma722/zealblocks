<?php
/**
 * Block registration.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Module;

defined( 'ABSPATH' ) || exit;

/**
 * Registers every compiled block found in build/.
 *
 * Blocks are discovered by scanning the directory rather than listed in
 * an array, so adding a block means adding a folder under src/ — no PHP
 * change, and nothing to keep in sync.
 */
final class Registrar implements Module {

	/**
	 * Blocks whose view script render.php enqueues itself, only when needed.
	 *
	 * Core loads a block's `viewScript` on every page the block appears on.
	 * The Text block's script exists only for entrance animations, which most
	 * Text blocks do not have, so it is removed from the block type here and
	 * render.php enqueues the still-registered handle when a block is
	 * animated.
	 *
	 * @var string[]
	 */
	const ON_DEMAND_VIEW_SCRIPTS = array( 'zealblocks/text' );

	/**
	 * Adds the module's hooks.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_blocks' ) );
		add_filter( 'block_categories_all', array( $this, 'register_category' ) );
		add_filter( 'block_type_metadata_settings', array( $this, 'defer_view_scripts' ), 10, 2 );
	}

	/**
	 * Detaches the view script of an ON_DEMAND_VIEW_SCRIPTS block.
	 *
	 * Runs after core has registered the handle from block.json, so the
	 * script stays registered and enqueueable; only the automatic enqueue on
	 * render goes away.
	 *
	 * @param array $settings Block type settings.
	 * @param array $metadata Block metadata from block.json.
	 * @return array
	 */
	public function defer_view_scripts( $settings, $metadata ) {
		if ( isset( $metadata['name'] ) && in_array( $metadata['name'], self::ON_DEMAND_VIEW_SCRIPTS, true ) ) {
			$settings['view_script_handles'] = array();
		}

		return $settings;
	}

	/**
	 * Registers all blocks from their compiled metadata.
	 *
	 * Public because it is an `init` callback, not because anything else
	 * should call it.
	 *
	 * Note this reads build/, not src/. wp-scripts copies block.json and
	 * render.php across at build time; registering from src/ would fail
	 * because the compiled asset files it references do not exist there.
	 *
	 * @return void
	 */
	public function register_blocks() {
		$build_dir = ZEALBLOCKS_PATH . 'build';

		if ( ! is_dir( $build_dir ) ) {
			return;
		}

		foreach ( (array) glob( $build_dir . '/*', GLOB_ONLYDIR ) as $block_dir ) {
			if ( ! file_exists( $block_dir . '/block.json' ) ) {
				continue;
			}

			$block_type = register_block_type( $block_dir );

			if ( $block_type instanceof \WP_Block_Type ) {
				$this->set_script_translations( $block_type );
			}
		}
	}

	/**
	 * Makes a block's editor strings translatable.
	 *
	 * `register_block_type()` handles the strings inside block.json — title,
	 * description, keywords, style labels — on its own. It does NOT handle the
	 * `__()` calls inside the compiled editor script, which is where most of
	 * the UI text actually lives: control labels, icon names, help text. Those
	 * need `wp_set_script_translations()` or they stay in English no matter
	 * what translation set is installed.
	 *
	 * The handle is read back off the registered type rather than rebuilt as
	 * `zealblocks-button-editor-script`, because that naming is core's private
	 * business (`generate_block_asset_handle()`) and blocks are discovered by
	 * scanning, so nothing here knows the block names up front anyway.
	 *
	 * @param \WP_Block_Type $block_type The registered block type.
	 * @return void
	 */
	private function set_script_translations( $block_type ) {
		$handles = array_merge(
			(array) $block_type->editor_script_handles,
			(array) $block_type->script_handles
		);

		foreach ( array_unique( array_filter( $handles ) ) as $handle ) {
			/*
			 * No third argument. Omitting the path makes core look in
			 * WP_LANG_DIR/plugins, which is exactly where translate.wordpress.org
			 * delivers the JSON files for a hosted plugin. Pointing it at a
			 * bundled languages/ directory instead would mean shipping an empty
			 * folder and missing the translations that actually exist.
			 */
			wp_set_script_translations( $handle, ZEALBLOCKS_SLUG );
		}
	}

	/**
	 * Adds the plugin's category to the block inserter.
	 *
	 * The slug must match the `category` field in each block.json, or the
	 * blocks land in the inserter's "Uncategorized" section.
	 *
	 * @param array[] $categories Registered block categories.
	 * @return array[] Categories with this plugin's category added.
	 */
	public function register_category( $categories ) {
		foreach ( $categories as $category ) {
			if ( isset( $category['slug'] ) && ZEALBLOCKS_SLUG === $category['slug'] ) {
				return $categories;
			}
		}

		return array_merge(
			array(
				array(
					'slug'  => ZEALBLOCKS_SLUG,
					'title' => __( 'Zealblocks (Beta)', 'zealblocks' ),
					'icon'  => null,
				),
			),
			$categories
		);
	}
}
