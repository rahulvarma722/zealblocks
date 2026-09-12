<?php
/**
 * Shared getters used across the plugin.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * One place to ask a question about the environment.
 *
 * WHAT BELONGS HERE, AND WHAT DOES NOT.
 *
 * Helper answers questions about the ENVIRONMENT — the breakpoints in force,
 * the plugin's own paths, whether we are in the editor. Things every part of
 * the plugin may need to know and none of them should work out for itself.
 *
 * What does not belong here is behaviour. `Responsive_Styles` still builds CSS,
 * `Block_Render` still sanitises attributes; they now ASK Helper for the
 * breakpoints rather than reading theme.json themselves. The distinction that
 * keeps this class from becoming a junk drawer:
 *
 *   - a getter that returns a fact about the site  -> Helper
 *   - a function that transforms its arguments     -> the class that owns
 *                                                     that concern
 *
 * A "Helpers" class with no rule about what goes in it eventually holds
 * everything, becomes impossible to test in isolation, and every file depends
 * on it. The rule above is what stops that.
 *
 * ALL STATIC, AND CORRECT AS SUCH. These are questions with one answer per
 * request. Nothing to construct, nothing to inject.
 */
final class Helper {

	/**
	 * Breakpoints used when core cannot supply them.
	 *
	 * Only reachable below WordPress 7.1, where viewport style states do not
	 * exist. Kept identical to `WP_Theme_JSON::DEFAULT_VIEWPORT_BREAKPOINTS` so
	 * a site that later upgrades sees no shift in behaviour.
	 *
	 * @var array<string, string>
	 */
	const FALLBACK_BREAKPOINTS = array(
		'mobile' => '480px',
		'tablet' => '782px',
	);

	/**
	 * The viewport state keys, in the order core returns them.
	 *
	 * These are the literal keys used inside a block's `style` attribute —
	 * `style['@tablet']` — so they are written into post content and are
	 * effectively permanent. Named here so nothing has to spell them out.
	 *
	 * @var string[]
	 */
	const VIEWPORT_STATES = array( '@tablet', '@mobile' );

	/**
	 * Per-request memo for values that cost something to resolve.
	 *
	 * Request-scoped only. theme.json does not change mid-request, and
	 * `wp_get_global_settings()` is not free — it is resolved per block
	 * instance otherwise, and a page can hold dozens.
	 *
	 * @var array<string, mixed>
	 */
	private static $cache = array();

	/**
	 * Media queries keyed by viewport state.
	 *
	 * From core wherever core can supply them, so the bands match every core
	 * control on the same block exactly. Note the shape core returns:
	 *
	 *   @mobile   @media (width <= 480px)
	 *   @tablet   @media (480px < width <= 782px)
	 *
	 * Those are MUTUALLY EXCLUSIVE RANGES, not stacked `max-width` queries,
	 * which is what makes mobile fall back to the base layer rather than to
	 * tablet. Reimplementing them with `max-width` would silently reintroduce a
	 * tablet-into-mobile cascade and disagree with core.
	 *
	 * @return array<string, string> e.g. `array( '@mobile' => '@media (…)' )`.
	 */
	public static function media_queries() {
		if ( isset( self::$cache['media_queries'] ) ) {
			return self::$cache['media_queries'];
		}

		$queries = is_callable( array( '\WP_Theme_JSON', 'get_viewport_media_queries' ) )
			? (array) \WP_Theme_JSON::get_viewport_media_queries( self::theme_viewport() )
			: self::fallback_media_queries();

		self::$cache['media_queries'] = $queries;

		return $queries;
	}

	/**
	 * The breakpoint values in force, keyed `mobile` / `tablet`.
	 *
	 * The raw widths rather than the media queries, for anything that needs the
	 * number — a control's help text, a preview, a JS bridge.
	 *
	 * @return array<string, string>
	 */
	public static function breakpoints() {
		if ( isset( self::$cache['breakpoints'] ) ) {
			return self::$cache['breakpoints'];
		}

		$viewport = self::theme_viewport();

		$breakpoints = array_merge(
			self::FALLBACK_BREAKPOINTS,
			is_array( $viewport ) ? $viewport : array()
		);

		// Only well-formed CSS lengths, and only the two keys we know. A
		// theme.json is authored by hand and can say anything.
		foreach ( $breakpoints as $key => $value ) {
			if ( ! is_scalar( $value ) || 1 !== preg_match( '/^\d+(?:\.\d+)?(?:px|em|rem)$/', (string) $value ) ) {
				$breakpoints[ $key ] = self::FALLBACK_BREAKPOINTS[ $key ];
			}
		}

		self::$cache['breakpoints'] = $breakpoints;

		return $breakpoints;
	}

	/**
	 * One breakpoint value.
	 *
	 * @param string $viewport `mobile` or `tablet`.
	 * @return string The CSS length, or '' for an unknown viewport.
	 */
	public static function breakpoint( $viewport ) {
		$breakpoints = self::breakpoints();

		return isset( $breakpoints[ $viewport ] ) ? $breakpoints[ $viewport ] : '';
	}

	/**
	 * The plugin version.
	 *
	 * Read through here rather than referencing the constant directly, so the
	 * one place that knows how the version is stored is this class.
	 *
	 * @return string
	 */
	public static function version() {
		return defined( 'ZEALBLOCKS_VERSION' ) ? ZEALBLOCKS_VERSION : '';
	}

	/**
	 * The plugin slug — text domain, script handles, block category.
	 *
	 * @return string
	 */
	public static function slug() {
		return defined( 'ZEALBLOCKS_SLUG' ) ? ZEALBLOCKS_SLUG : '';
	}

	/**
	 * Absolute path to a file inside the plugin.
	 *
	 * @param string $relative Path relative to the plugin root, no leading slash.
	 * @return string
	 */
	public static function path( $relative = '' ) {
		return ( defined( 'ZEALBLOCKS_PATH' ) ? ZEALBLOCKS_PATH : '' ) . ltrim( $relative, '/' );
	}

	/**
	 * Whether this request is rendering inside the block editor.
	 *
	 * `defined( 'REST_REQUEST' )` matters as much as `is_admin()`: the editor
	 * renders dynamic blocks over the REST API, which is not an admin screen,
	 * so an `is_admin()`-only check reports false for the very requests that
	 * ARE the editor.
	 *
	 * @return bool
	 */
	public static function is_editor_request() {
		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return true;
		}

		return function_exists( 'is_admin' ) && is_admin();
	}

	/**
	 * Empties the memo.
	 *
	 * For tests, which change theme.json between cases within one process.
	 * Nothing in the plugin needs it — theme.json does not change mid-request.
	 *
	 * @return void
	 */
	public static function flush() {
		self::$cache = array();
	}

	/**
	 * `settings.viewport` from theme.json, narrowed to the breakpoint keys.
	 *
	 * `wp_get_global_settings()` returns the WHOLE settings tree when the
	 * requested path is absent, which is the normal case since few themes
	 * declare `settings.viewport`. Passing that tree on happens to survive
	 * core's sanitizer, but only by accident — so it is narrowed to the two
	 * keys that are actually breakpoints.
	 *
	 * @return array<string, string>|null
	 */
	private static function theme_viewport() {
		if ( ! function_exists( 'wp_get_global_settings' ) ) {
			return null;
		}

		$settings = wp_get_global_settings( array( 'viewport' ) );

		return is_array( $settings )
			? array_intersect_key( $settings, array_flip( array( 'mobile', 'tablet' ) ) )
			: null;
	}

	/**
	 * Media queries for WordPress versions with no viewport states.
	 *
	 * Pre-7.1 there is no core output to match, so the classic `max-width`
	 * form is the safer choice for old browsers.
	 *
	 * @return array<string, string>
	 */
	private static function fallback_media_queries() {
		$breakpoints = self::FALLBACK_BREAKPOINTS;

		return array(
			'@mobile' => sprintf( '@media (max-width: %s)', $breakpoints['mobile'] ),
			'@tablet' => sprintf( '@media (max-width: %s)', $breakpoints['tablet'] ),
		);
	}
}
