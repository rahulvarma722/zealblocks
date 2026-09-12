<?php
/**
 * Class autoloading.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * Maps `Zealblocks\*` class names onto files under includes/.
 *
 * WHY A HAND-WRITTEN AUTOLOADER RATHER THAN COMPOSER'S.
 *
 * Composer is a dev dependency here — it installs PHPCS and nothing else, and
 * `vendor/` is deliberately excluded from the release ZIP. Using
 * `vendor/autoload.php` at runtime would invert that: the plugin could not boot
 * without shipping Composer's autoloader and its `composer/` support files,
 * which is several hundred files of machinery to resolve four classes. It would
 * also mean `composer install` becomes a build step for anyone cloning the
 * repo, not just a linting one.
 *
 * So the mapping is done here, in about thirty lines, with no runtime
 * dependency at all.
 *
 * NAMING CONVENTION.
 *
 * The namespace is stripped, then the remaining class name is lowercased and
 * underscores become hyphens, prefixed with `class-`:
 *
 *   Zealblocks\Helper               -> includes/class-helper.php
 *   Zealblocks\Responsive_Styles    -> includes/class-responsive-styles.php
 *   Zealblocks\Block\Registrar      -> includes/block/class-registrar.php
 *
 * That is the WordPress file-naming convention, so the layout stays legible to
 * anyone who has read another WordPress plugin, and sub-namespaces map onto
 * sub-directories without any extra registration.
 *
 * INTERFACES AND TRAITS get their own prefixes, which WordPress convention also
 * specifies:
 *
 *   Zealblocks\Module               -> includes/interface-module.php
 *   Zealblocks\Block\Caches_Values  -> includes/block/trait-caches-values.php
 *
 * PHP gives an autoloader no way to know which of the three it has been asked
 * for — `class_exists()`, `interface_exists()` and `trait_exists()` all route
 * here identically. So each prefix is tried in turn. That costs up to two extra
 * file_exists() calls on a miss, which is nothing next to the alternative of
 * encoding the kind into the type name (`Module_Interface`, `I_Module`) and
 * having every reference carry the noise forever.
 */
final class Autoloader {

	/**
	 * Namespace prefix this autoloader answers for, with trailing separator.
	 *
	 * @var string
	 */
	const PREFIX = __NAMESPACE__ . '\\';

	/**
	 * Registers the autoloader with SPL.
	 *
	 * @return void
	 */
	public static function register() {
		spl_autoload_register( array( __CLASS__, 'load' ) );
	}

	/**
	 * Resolves and requires the file for a class, if we own the name.
	 *
	 * Returns silently for anything outside our namespace: an autoloader that
	 * is not responsible for a class must do nothing, so the next one in the
	 * SPL stack gets its turn. Throwing or warning here would break unrelated
	 * plugins.
	 *
	 * @param string $class_name Fully-qualified class name.
	 * @return void
	 */
	public static function load( $class_name ) {
		if ( 0 !== strpos( $class_name, self::PREFIX ) ) {
			return;
		}

		$relative = substr( $class_name, strlen( self::PREFIX ) );
		$path     = self::path_for( $relative );

		/*
		 * path_for() only returns a path that exists, so a miss lands here as
		 * false and we simply do nothing — letting the next autoloader in the
		 * SPL stack try. Requiring a missing file instead would fatal from
		 * inside an autoloader, which reports the require rather than the
		 * class_exists() or `new` that triggered it, and is nearly unreadable.
		 */
		if ( $path ) {
			require_once $path;
		}
	}

	/**
	 * File-name prefixes tried, in order.
	 *
	 * Classes first because they are the overwhelming majority, so the common
	 * case resolves on the first file_exists().
	 *
	 * @var string[]
	 */
	const PREFIXES = array( 'class-', 'interface-', 'trait-' );

	/**
	 * Builds the file path for a namespace-relative type name.
	 *
	 * @param string $relative Type name with the plugin namespace removed.
	 * @return string|false Absolute path of the first prefix that exists, or
	 *                      false when the name is not one we map.
	 */
	private static function path_for( $relative ) {
		// Reject anything that is not a plain class path. Belt and braces: the
		// name comes from PHP itself, but this function builds a filesystem
		// path, so it validates rather than trusts.
		if ( ! preg_match( '/^[A-Za-z0-9_\\\\]+$/', $relative ) ) {
			return false;
		}

		$segments = explode( '\\', $relative );
		$type     = array_pop( $segments );

		$directory = ZEALBLOCKS_PATH . 'includes/';

		foreach ( $segments as $segment ) {
			$directory .= self::to_filename( $segment ) . '/';
		}

		$filename = self::to_filename( $type );

		foreach ( self::PREFIXES as $prefix ) {
			$path = $directory . $prefix . $filename . '.php';

			if ( file_exists( $path ) ) {
				return $path;
			}
		}

		return false;
	}

	/**
	 * Converts one CamelCase_Segment into its file-name form.
	 *
	 * @param string $segment A single namespace or class segment.
	 * @return string Lowercased, hyphen-separated.
	 */
	private static function to_filename( $segment ) {
		return str_replace( '_', '-', strtolower( $segment ) );
	}
}
