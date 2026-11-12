<?php
/**
 * Display conditions: hide a block for some visitors.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Module;

defined( 'ABSPATH' ) || exit;

/**
 * Decides whether a block is hidden for the current visitor, and gives the
 * editor the site's role list.
 *
 * Stored on the block as one `displayConditions` object:
 *
 *     { hideWhenLoggedIn, hideWhenLoggedOut, hideForRole, hideForBrowser,
 *       hideForOS, hideOnDays }
 *
 * The conditions are ORed: any one that matches hides the block. That is
 * Spectra's model, and the only one that reads correctly from a list of
 * "Hide when…" toggles.
 *
 * THESE ARE EVALUATED ON THE SERVER, PER REQUEST. A full-page cache stores one
 * visitor's result and serves it to everyone, so on a cached site the browser,
 * OS and day conditions follow whoever filled the cache. The editor says so
 * next to the controls; there is no way around it short of rendering in JS,
 * which would put the hidden content in the page source anyway.
 *
 * Shared by every block that opts in. A block declares self::ATTRIBUTES in
 * its block.json, returns early from render.php when hides() says so, and
 * uses the panel in src/shared/display-conditions/. See
 * docs/display-conditions.md.
 */
final class Display_Conditions implements Module {

	/**
	 * The attribute a block with display conditions declares in its
	 * block.json, exactly. BlockContractTest checks every such block.
	 *
	 * @var array<string, array>
	 */
	const ATTRIBUTES = array(
		'displayConditions' => array(
			'type'    => 'object',
			'default' => array(),
		),
	);

	/**
	 * Browser values the editor offers. MUST match BROWSER_OPTIONS in
	 * src/shared/display-conditions/constants.js; BlockContractTest compares.
	 *
	 * @var string[]
	 */
	const BROWSERS = array( 'chrome', 'firefox', 'safari', 'edge', 'opera' );

	/**
	 * Operating system values the editor offers. MUST match OS_OPTIONS in
	 * src/shared/display-conditions/constants.js; BlockContractTest compares.
	 *
	 * @var string[]
	 */
	const SYSTEMS = array( 'ios', 'android', 'windows', 'mac_os', 'linux', 'open_bsd', 'sun_os' );

	/**
	 * Day values, as PHP's English `l` format lowercased. MUST match
	 * DAY_OPTIONS in src/shared/display-conditions/constants.js.
	 *
	 * @var string[]
	 */
	const DAYS = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );

	/**
	 * Name of the editor global holding the role list.
	 */
	const GLOBAL_NAME = 'zealblocksRoles';

	/**
	 * The visitor, resolved once per request.
	 *
	 * @var array|null
	 */
	private static $context = null;

	/**
	 * Adds the editor data hook.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'enqueue_block_editor_assets', array( $this, 'print_roles' ) );
	}

	/**
	 * Prints the role list for the "Hide for user role" select.
	 *
	 * Not routed through Editor_Settings: that only prints when the post
	 * already contains one of our blocks, and the role list is needed the
	 * moment the first block with the panel is inserted.
	 *
	 * @return void
	 */
	public function print_roles() {
		$roles = array();

		foreach ( wp_roles()->get_names() as $slug => $name ) {
			$roles[] = array(
				'value' => (string) $slug,
				'label' => translate_user_role( $name ),
			);
		}

		wp_add_inline_script(
			'wp-blocks',
			sprintf( 'window.%s = %s;', self::GLOBAL_NAME, wp_json_encode( $roles ) ),
			'before'
		);
	}

	/**
	 * Whether the block should be hidden for the current visitor.
	 *
	 * @param mixed $conditions The block's `displayConditions` attribute.
	 * @return bool
	 */
	public static function hides( $conditions ) {
		if ( ! self::has_any( $conditions ) ) {
			return false;
		}

		if ( null === self::$context ) {
			self::$context = self::current_context();
		}

		return self::is_hidden( $conditions, self::$context );
	}

	/**
	 * Whether any condition is set at all.
	 *
	 * Lets hides() skip the visitor lookup for the common case of a block
	 * with no conditions.
	 *
	 * @param mixed $conditions The block's `displayConditions` attribute.
	 * @return bool
	 */
	public static function has_any( $conditions ) {
		if ( ! is_array( $conditions ) ) {
			return false;
		}

		foreach ( $conditions as $value ) {
			if ( ! empty( $value ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * The decision itself, against an explicit visitor. Pure, so it is unit
	 * tested without WordPress.
	 *
	 * @param mixed $conditions The block's `displayConditions` attribute.
	 * @param array $context    {
	 *     The visitor.
	 *
	 *     @type bool     $logged_in Whether a user is logged in.
	 *     @type string[] $roles     The user's roles.
	 *     @type string   $browser   One of BROWSERS, or ''.
	 *     @type string   $os        One of SYSTEMS, or ''.
	 *     @type string   $day       One of DAYS.
	 * }
	 * @return bool
	 */
	public static function is_hidden( $conditions, $context ) {
		if ( ! is_array( $conditions ) ) {
			return false;
		}

		$flag = static function ( $key ) use ( $conditions ) {
			return isset( $conditions[ $key ] ) && true === $conditions[ $key ];
		};

		$text = static function ( $key ) use ( $conditions ) {
			return isset( $conditions[ $key ] ) && is_string( $conditions[ $key ] ) ? $conditions[ $key ] : '';
		};

		$logged_in = ! empty( $context['logged_in'] );

		if ( $flag( 'hideWhenLoggedIn' ) && $logged_in ) {
			return true;
		}

		if ( $flag( 'hideWhenLoggedOut' ) && ! $logged_in ) {
			return true;
		}

		$role = $text( 'hideForRole' );

		if ( '' !== $role && $logged_in && in_array( $role, (array) $context['roles'], true ) ) {
			return true;
		}

		$browser = $text( 'hideForBrowser' );

		if ( '' !== $browser && $browser === $context['browser'] ) {
			return true;
		}

		$os = $text( 'hideForOS' );

		if ( '' !== $os && $os === $context['os'] ) {
			return true;
		}

		$days = isset( $conditions['hideOnDays'] ) && is_array( $conditions['hideOnDays'] ) ? $conditions['hideOnDays'] : array();

		return in_array( $context['day'], $days, true );
	}

	/**
	 * The browser a user agent names, or ''.
	 *
	 * ORDER MATTERS. Nearly every user agent claims to be several browsers:
	 * Edge and Opera say "Chrome", Chrome says "Safari", Firefox on iOS says
	 * "Safari". The specific tokens are tested before the generic ones.
	 *
	 * @param string $user_agent The User-Agent header.
	 * @return string One of BROWSERS, or ''.
	 */
	public static function browser( $user_agent ) {
		$map = array(
			'opera'   => '/OPR\/|Opera|OPiOS/',
			'edge'    => '/Edg(?:e|A|iOS)?\//',
			'firefox' => '/Firefox\/|FxiOS\//',
			'chrome'  => '/Chrome\/|CriOS\//',
			'safari'  => '/Safari\//',
		);

		foreach ( $map as $browser => $pattern ) {
			if ( 1 === preg_match( $pattern, (string) $user_agent ) ) {
				return $browser;
			}
		}

		return '';
	}

	/**
	 * The operating system a user agent names, or ''.
	 *
	 * Ordered for the same reason as browser(): an iPhone says "like Mac OS
	 * X" and Android says "Linux". iPadOS 13+ reports itself as a Mac, so an
	 * iPad in desktop mode counts as Mac OS — there is no token to tell them
	 * apart.
	 *
	 * @param string $user_agent The User-Agent header.
	 * @return string One of SYSTEMS, or ''.
	 */
	public static function os( $user_agent ) {
		$map = array(
			'ios'      => '/iPhone|iPad|iPod/',
			'android'  => '/Android/',
			'windows'  => '/Windows|Win(?:16|95|98|32|NT)/',
			'mac_os'   => '/Macintosh|Mac_PowerPC|Mac OS X/',
			'open_bsd' => '/OpenBSD/',
			'sun_os'   => '/SunOS/',
			'linux'    => '/Linux|X11/',
		);

		foreach ( $map as $os => $pattern ) {
			if ( 1 === preg_match( $pattern, (string) $user_agent ) ) {
				return $os;
			}
		}

		return '';
	}

	/**
	 * The current visitor, from WordPress and the request.
	 *
	 * The day uses the SITE's timezone, as an author setting "hide on
	 * Sunday" means Sunday where the site is.
	 *
	 * @return array See is_hidden().
	 */
	private static function current_context() {
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] )
			? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) )
			: '';

		$user = wp_get_current_user();

		return array(
			'logged_in' => is_user_logged_in(),
			'roles'     => (array) $user->roles,
			'browser'   => self::browser( $user_agent ),
			'os'        => self::os( $user_agent ),
			'day'       => strtolower( current_datetime()->format( 'l' ) ),
		);
	}
}
