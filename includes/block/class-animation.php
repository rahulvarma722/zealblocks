<?php
/**
 * Entrance animation, shared by every block that opts in.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Helper;
use Zealblocks\Module;

defined( 'ABSPATH' ) || exit;

/**
 * Validates a block's animation attributes, turns them into wrapper markup,
 * and loads the one script that plays them.
 *
 * A block opts in by declaring self::ATTRIBUTES in its block.json, calling
 * wrapper() from render.php, and including the SCSS mixins from
 * src/shared/animation/_animation.scss. BlockContractTest checks the
 * attributes match.
 *
 * Why the script is not a block.json `viewScript`: core loads a block's view
 * script on every page the block appears on, animated or not. Most blocks are
 * not animated, so the handle is registered here and enqueued by wrapper()
 * only when one is. It is also one handle for every block type, so a page
 * with animated Text and an animated Button runs one observer, not two.
 */
final class Animation implements Module {

	/**
	 * Animation types. MUST match ANIMATION_GROUPS in
	 * src/shared/animation/constants.js and $animation-starts in
	 * _animation.scss; BlockContractTest compares all three.
	 *
	 * @var string[]
	 */
	const TYPES = array(
		'fade',
		'fade-up',
		'fade-down',
		'fade-left',
		'fade-right',
		'flip-up',
		'flip-down',
		'flip-left',
		'flip-right',
		'slide-up',
		'slide-down',
		'slide-left',
		'slide-right',
		'zoom-in',
		'zoom-in-up',
		'zoom-in-down',
		'zoom-in-left',
		'zoom-in-right',
		'zoom-out',
		'zoom-out-up',
		'zoom-out-down',
		'zoom-out-left',
		'zoom-out-right',
	);

	/**
	 * Easing keywords. MUST match EASING_OPTIONS in constants.js.
	 *
	 * @var string[]
	 */
	const EASINGS = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );

	/**
	 * Upper bound for duration and delay, in ms. The editor offers 3000; this
	 * is the ceiling for a hand-edited value, not a second UI limit.
	 */
	const MAX_MS = 5000;

	/**
	 * The attributes an animated block declares in its block.json, exactly.
	 *
	 * @var array<string, array>
	 */
	const ATTRIBUTES = array(
		'animationType'     => array(
			'type'    => 'string',
			'default' => '',
		),
		'animationDuration' => array(
			'type'    => 'number',
			'default' => 400,
		),
		'animationDelay'    => array(
			'type'    => 'number',
			'default' => 0,
		),
		'animationEasing'   => array(
			'type'    => 'string',
			'enum'    => self::EASINGS,
			'default' => 'ease',
		),
		'animationRepeat'   => array(
			'type'    => 'boolean',
			'default' => false,
		),
	);

	/**
	 * The built view script and its wp-scripts asset file, relative to the
	 * plugin root. Built from src/shared/animation/view.js (webpack.config.js).
	 */
	const SCRIPT = 'build/shared/animation-view.js';
	const ASSET  = 'build/shared/animation-view.asset.php';

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
		return Helper::slug() . '-animation';
	}

	/**
	 * Registers the view script, so wrapper() can enqueue it on demand.
	 *
	 * Deferred, as core registers a block.json viewScript: it only needs to
	 * run once the DOM is parsed, and must not block rendering.
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
	 * The validated animation type, or '' when the block is not animated.
	 *
	 * @param array $attributes Block attributes.
	 * @return string
	 */
	public static function type( $attributes ) {
		return Render::one_of( Render::text( $attributes, 'animationType' ), self::TYPES, '' );
	}

	/**
	 * Wrapper classes and attributes for an animated block, and the script.
	 *
	 * Returns empty lists for a block that is not animated. For one that is,
	 * it ENQUEUES THE VIEW SCRIPT as a side effect: rendering an animated
	 * block is the only thing that should load it, so the two are not left
	 * for each caller to keep in step.
	 *
	 * Merge the result into get_block_wrapper_attributes(): `attributes`
	 * carries the type, the repeat flag and the timing as custom properties
	 * on `style`; `classes` carries `has-animation`.
	 *
	 * @param array $attributes Block attributes.
	 * @return array{classes: string[], attributes: array<string, string>}
	 */
	public static function wrapper( $attributes ) {
		$type = self::type( $attributes );

		if ( '' === $type ) {
			return array(
				'classes'    => array(),
				'attributes' => array(),
			);
		}

		$markup = array(
			'data-zealblocks-animation' => $type,
			'style'                     => sprintf(
				'--zealblocks-animation-duration:%dms;--zealblocks-animation-delay:%dms;--zealblocks-animation-easing:%s;',
				self::milliseconds( $attributes, 'animationDuration', 400 ),
				self::milliseconds( $attributes, 'animationDelay', 0 ),
				Render::one_of( Render::text( $attributes, 'animationEasing' ), self::EASINGS, 'ease' )
			),
		);

		if ( ! empty( $attributes['animationRepeat'] ) ) {
			$markup['data-zealblocks-animation-repeat'] = 'true';
		}

		wp_enqueue_script( self::handle() );

		return array(
			'classes'    => array( 'has-animation' ),
			'attributes' => $markup,
		);
	}

	/**
	 * A duration or delay in whole ms, clamped to 0…MAX_MS.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $key        Attribute name.
	 * @param int    $fallback   Value when the attribute is missing or not numeric.
	 * @return int
	 */
	private static function milliseconds( $attributes, $key, $fallback ) {
		$value = isset( $attributes[ $key ] ) && is_numeric( $attributes[ $key ] ) ? (int) $attributes[ $key ] : $fallback;

		return max( 0, min( self::MAX_MS, $value ) );
	}
}
