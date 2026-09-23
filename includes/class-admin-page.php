<?php
/**
 * The plugin's admin screen.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the settings screen and loads the React app that renders it.
 *
 * WHY THIS UI IS NOT BUILT ON @wordpress/components.
 *
 * Inside the block editor, core's components are the right answer: they are
 * already enqueued, so they cost no bundle, and a control that sits among
 * core's inspector panels has to match their spacing and theming or it reads as
 * a different product.
 *
 * An admin screen has no core chrome to match. Nothing surrounds this page, so
 * the constraint disappears and a fuller component set is worth more than
 * blending in. The cost is honest: ~73 KB of JavaScript that core would have
 * given us free in the editor.
 *
 * WHY THE ASSETS LOAD ONLY ON THIS SCREEN.
 *
 * `admin_enqueue_scripts` fires on every admin page. Enqueuing unconditionally
 * would put Tailwind and Radix on the post list, the media library and every
 * other plugin's settings page, where none of it is used.
 */
final class Admin_Page implements Module {

	/**
	 * Menu slug, and the id of the element the React app mounts into.
	 *
	 * @var string
	 */
	const SLUG = ZEALBLOCKS_SLUG;

	/**
	 * Capability required to see the screen.
	 *
	 * `manage_options` rather than something block-specific: this is a
	 * site-wide settings screen, and that is the capability WordPress uses for
	 * every other one.
	 *
	 * @var string
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Hook suffix returned by add_submenu_page(), or null before it runs.
	 *
	 * Kept so the enqueue callback can compare against it directly instead of
	 * matching on a hardcoded screen id, which drifts the moment the menu
	 * parent changes.
	 *
	 * @var string|null
	 */
	private $hook = null;

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_action( 'admin_menu', array( $this, 'add_page' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Adds the screen under Settings.
	 *
	 * @return void
	 */
	public function add_page() {
		$this->hook = add_submenu_page(
			'options-general.php',
			__( 'Zealblocks', 'zealblocks' ),
			__( 'Zealblocks', 'zealblocks' ),
			self::CAPABILITY,
			self::SLUG,
			array( $this, 'render' )
		);
	}

	/**
	 * Loads the app, but only on our own screen.
	 *
	 * @param string $hook_suffix Current admin page's hook suffix.
	 * @return void
	 */
	public function enqueue( $hook_suffix ) {
		if ( null === $this->hook || $hook_suffix !== $this->hook ) {
			return;
		}

		$asset_file = ZEALBLOCKS_PATH . 'build/admin/index.asset.php';

		/*
		 * build/ is generated, not committed. Without this guard a clone that
		 * has not been built yet fatals on the require instead of simply
		 * rendering an empty screen.
		 */
		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			ZEALBLOCKS_SLUG . '-admin',
			ZEALBLOCKS_URL . 'build/admin/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_style(
			ZEALBLOCKS_SLUG . '-admin',
			ZEALBLOCKS_URL . 'build/admin/index.css',
			array(),
			$asset['version']
		);

		wp_set_script_translations( ZEALBLOCKS_SLUG . '-admin', 'zealblocks' );
	}

	/**
	 * Outputs the mount point.
	 *
	 * The `zb-ui` class is not decoration: the design tokens are scoped to it,
	 * so anything rendered outside an element carrying it falls back to
	 * unstyled. The portal container that Radix overlays render into carries
	 * the same class for the same reason.
	 *
	 * @return void
	 */
	public function render() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}

		printf(
			'<div class="wrap"><div id="%1$s" class="zb-ui"></div></div>',
			esc_attr( self::SLUG . '-admin' )
		);
	}
}
