<?php
/**
 * A second accessible name, used while an element is hovered or focused.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Helper;
use Zealblocks\Module;

defined( 'ABSPATH' ) || exit;

/**
 * Swaps an element's `aria-label` while it is hovered or focused.
 *
 * The Button uses it for an icon-only button with a hover icon: the hover icon
 * can mean something else, so it can carry a label of its own (Spectra's
 * "Hover Icon Aria Label"). HTML has no hover state for an attribute, so a
 * small script does the swap; this class validates the label, writes it to a
 * data attribute, and loads the script.
 *
 * Why the script is not a block.json `viewScript`: core would load it on every
 * page with a Button. It is registered here and enqueued by attributes() only
 * when a block on the page has a hover label, as Animation does.
 */
final class Hover_Label implements Module {

	/**
	 * The data attribute the script looks for. MUST match ATTRIBUTE in
	 * src/shared/hover-label/view.js; BlockContractTest compares them.
	 */
	const ATTRIBUTE = 'data-zealblocks-hover-label';

	/**
	 * The built view script and its wp-scripts asset file, relative to the
	 * plugin root. Built from src/shared/hover-label/view.js (webpack.config.js).
	 */
	const SCRIPT = 'build/shared/hover-label-view.js';
	const ASSET  = 'build/shared/hover-label-view.asset.php';

	/**
	 * Adds the script registration hook.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_script' ) );
	}

	/**
	 * The script handle.
	 *
	 * @return string
	 */
	public static function handle() {
		return Helper::slug() . '-hover-label';
	}

	/**
	 * Registers the view script, so attributes() can enqueue it on demand.
	 *
	 * @return void
	 */
	public function register_script() {
		$asset_file = Helper::path( self::ASSET );
		$asset      = is_readable( $asset_file ) ? require $asset_file : array();

		wp_register_script(
			self::handle(),
			Helper::url( self::SCRIPT ),
			isset( $asset['dependencies'] ) ? $asset['dependencies'] : array(),
			isset( $asset['version'] ) ? $asset['version'] : Helper::version(),
			array( 'strategy' => 'defer' )
		);
	}

	/**
	 * The wrapper attribute for a hover label, and the script.
	 *
	 * Returns an empty array for an empty label. Otherwise it ENQUEUES THE VIEW
	 * SCRIPT as a side effect, so the attribute and the script that reads it
	 * cannot get out of step. Merge the result into
	 * get_block_wrapper_attributes(), which escapes it.
	 *
	 * @param string $label The label, as stored.
	 * @return array<string, string>
	 */
	public static function attributes( $label ) {
		$label = sanitize_text_field( (string) $label );

		if ( '' === $label ) {
			return array();
		}

		wp_enqueue_script( self::handle() );

		return array( self::ATTRIBUTE => $label );
	}
}
