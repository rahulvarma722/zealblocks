<?php
/**
 * Bootstrap for the UNIT suite.
 *
 * WHAT THIS SUITE IS FOR, AND WHAT IT IS NOT.
 *
 * These tests run in plain PHP with no WordPress and no Docker, in
 * milliseconds, so there is no excuse not to run them on every save. That is
 * only possible because the code under test is mostly pure: given the same
 * attributes it produces the same string.
 *
 * The WordPress functions stubbed below are the trivial ones — a JSON encode, a
 * filter that has no filters attached in a unit context. They are stubbed so
 * OUR logic can be tested, not to pretend WordPress has been tested.
 *
 * Anything whose WORDPRESS BEHAVIOUR is the point of the test does NOT belong
 * here, because a stub would simply agree with whatever we assumed. `esc_url()`
 * dropping a `javascript:` scheme, `wp_kses()` lowercasing SVG attribute names,
 * `get_block_wrapper_attributes()` merging classes — those are verified in
 * tests/integration/ against a real WordPress.
 *
 * @package Zealblocks
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'ZEALBLOCKS_PATH', dirname( __DIR__, 2 ) . '/' );

/*
 * Slug and version are READ FROM THE SOURCE, not restated here.
 *
 * NOTE the variable names below are deliberately slug-independent. Naming a PHP
 * variable after the lowercase slug breaks bin/rename.sh the moment a new slug
 * contains a hyphen — `$my-plugin_main` is not a valid variable. Identifiers use
 * the CONST-style prefix or a neutral name; only strings use the slug.
 *
 * They were hardcoded, which made this file a third place the version lives —
 * and the one nobody would remember to update, since the release gate only
 * compares the plugin header, the constant and readme.txt. A stale value here
 * would have made BlockContractTest assert the wrong version and pass.
 */
$main_file = glob( ZEALBLOCKS_PATH . '*.php' );
$main_file = $main_file ? (string) file_get_contents( $main_file[0] ) : '';

preg_match( "/define\\(\\s*'([A-Z_]+)_SLUG',\\s*'([a-z0-9-]+)'/", $main_file, $slug_match );
preg_match( '/^\\s*\\*\\s*Version:\\s*(.+)$/m', $main_file, $version_match );

define( 'ZEALBLOCKS_SLUG', isset( $slug_match[2] ) ? $slug_match[2] : 'zealblocks' );
define( 'ZEALBLOCKS_VERSION', isset( $version_match[1] ) ? trim( $version_match[1] ) : '0.0.0' );

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Stub: the real one adds options we do not depend on here.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	/**
	 * Stub: no filters are attached in a unit context, so the value passes through.
	 *
	 * @param string $hook  Filter name.
	 * @param mixed  $value Value to filter.
	 * @return mixed
	 */
	function apply_filters( $hook, $value ) {
		return $value;
	}
}

if ( ! function_exists( 'wp_get_global_settings' ) ) {
	/**
	 * Stub: no theme.json in a unit context.
	 *
	 * @param array $path Settings path.
	 * @return array
	 */
	function wp_get_global_settings( $path = array() ) {
		return array();
	}
}

require_once ZEALBLOCKS_PATH . 'includes/class-autoloader.php';

Zealblocks\Autoloader::register();
