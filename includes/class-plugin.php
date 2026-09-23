<?php
/**
 * Plugin bootstrap and module registry.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

use Zealblocks\Block\Registrar;

defined( 'ABSPATH' ) || exit;

/**
 * Instantiates and registers the plugin's feature modules.
 *
 * This class stays a LIST OF WHAT IS ENABLED rather than a place where
 * behaviour accumulates. Every module owns its own hooks; nothing here knows
 * what any of them do.
 */
final class Plugin {

	/**
	 * Modules, in registration order.
	 *
	 * Order matters only where one module's hooks must be added before
	 * another's on the same hook and priority. Keep it alphabetical unless
	 * there is a reason not to, and write the reason down.
	 *
	 * @var string[] Fully-qualified class names implementing Module.
	 */
	const MODULES = array(
		Admin_Page::class,
		Registrar::class,
	);

	/**
	 * Registered module instances, keyed by class name.
	 *
	 * Kept so a module can be reached after boot — by a test, or by another
	 * module that legitimately needs a collaborator. Nothing needs it yet;
	 * the alternative is instantiating and then losing the reference, which
	 * makes the object unreachable and untestable for no gain.
	 *
	 * @var array<string, Module>
	 */
	private static $modules = array();

	/**
	 * Boots the plugin.
	 *
	 * @return void
	 */
	public static function init() {
		foreach ( self::module_classes() as $class_name ) {
			$module = self::instantiate( $class_name );

			if ( $module instanceof Module ) {
				$module->register();
				self::$modules[ $class_name ] = $module;
			}
		}
	}

	/**
	 * The module list, filtered.
	 *
	 * THE EXTENSION POINT. A large plugin grows features faster than it grows
	 * places to put them, and the usual failure is a bootstrap that becomes a
	 * hardcoded wall of conditionals — `if ( $pro ) { … } if ( option ) { … }`.
	 * Filtering the list instead means a feature can be added, removed or
	 * gated by anything: a licence check, a setting, an environment, a test.
	 *
	 * Runs before any module is constructed, so a disabled module costs
	 * nothing at all.
	 *
	 * @return string[] Fully-qualified class names.
	 */
	private static function module_classes() {
		/**
		 * Filters which modules load.
		 *
		 * @since 0.0.1
		 *
		 * @param string[] $modules Fully-qualified class names implementing Module.
		 */
		$modules = apply_filters( ZEALBLOCKS_SLUG . '_modules', self::MODULES );

		return is_array( $modules ) ? $modules : self::MODULES;
	}

	/**
	 * Constructs one module, defensively.
	 *
	 * A third party can add to the module list through the filter above, so
	 * the entries are not all under our control. A bad one must not take the
	 * whole plugin down: `class_exists()` triggers the autoloader, the
	 * interface check keeps the contract honest, and anything failing either
	 * is skipped rather than fatal.
	 *
	 * @param string $class_name Fully-qualified class name.
	 * @return Module|null The instance, or null when it is not usable.
	 */
	private static function instantiate( $class_name ) {
		if ( ! is_string( $class_name ) || ! class_exists( $class_name ) ) {
			return null;
		}

		if ( ! in_array( Module::class, (array) class_implements( $class_name ), true ) ) {
			return null;
		}

		return new $class_name();
	}

	/**
	 * Returns a registered module instance.
	 *
	 * @param string $class_name Fully-qualified class name.
	 * @return Module|null The instance, or null when it did not load.
	 */
	public static function module( $class_name ) {
		return isset( self::$modules[ $class_name ] ) ? self::$modules[ $class_name ] : null;
	}

	/*
	 * No load_plugin_textdomain() call, deliberately.
	 *
	 * Since WordPress 4.6 core loads translations for a .org-hosted plugin
	 * just-in-time, keyed on the plugin slug, the first time a translation
	 * function runs. Calling it by hand is redundant and Plugin Check flags it
	 * (`DiscouragedFunctions.load_plugin_textdomainFound`). The text domain
	 * still has to match the folder slug for that to work — see ZEALBLOCKS_SLUG
	 * in zealblocks.php.
	 *
	 * JavaScript strings are a separate mechanism and DO need wiring up:
	 * see Blocks::set_script_translations().
	 */
}
