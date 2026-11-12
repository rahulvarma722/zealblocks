<?php
/**
 * Contracts that span more than one file.
 *
 * WHY THIS FILE EXISTS.
 *
 * A block is declared across three files — block.json, index.js and
 * render.php — and some of the rules binding them are invariants no single
 * file can check. `source` on an attribute is only valid if `save()` writes
 * markup; a container is only correct if `save()` does NOT return null. Each
 * declaration reads perfectly well on its own; the bug lives in the
 * relationship.
 *
 * Both of those shipped as real bugs. Both were documented as traps in
 * docs/BLOCKS.md first, which did not help, because a comment cannot fail a
 * build.
 *
 * So the checks live at the same scope as the invariants: they read the files
 * together and assert the relationship. No WordPress needed — this is text
 * analysis, which is why it belongs in the fast suite and runs on every block
 * automatically, including ones that do not exist yet.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Zealblocks\Block\Animation;
use Zealblocks\Block\Display_Conditions;
use Zealblocks\Block\Z_Index;

/**
 * @coversNothing
 */
final class BlockContractTest extends TestCase {

	/**
	 * Every authored block, as [ slug => [ json, index, edit ] ].
	 *
	 * Discovered by scanning src/ rather than listed, so a new block is
	 * covered the moment it exists. A hardcoded list would be one more place
	 * to forget.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function blocks() {
		$blocks = array();
		$root   = ZEALBLOCKS_PATH . 'src/';

		foreach ( (array) glob( $root . '*', GLOB_ONLYDIR ) as $dir ) {
			$json = $dir . '/block.json';

			if ( ! file_exists( $json ) ) {
				continue;
			}

			$slug = basename( $dir );

			$blocks[ $slug ] = array(
				'slug'  => $slug,
				'dir'   => $dir,
				'json'  => json_decode( (string) file_get_contents( $json ), true ),
				'index' => file_exists( $dir . '/index.js' ) ? (string) file_get_contents( $dir . '/index.js' ) : '',
				'edit'  => file_exists( $dir . '/edit.js' ) ? (string) file_get_contents( $dir . '/edit.js' ) : '',
			);
		}

		return $blocks;
	}

	/**
	 * There is at least one block to check, so a broken glob cannot make this
	 * whole file silently vacuous.
	 *
	 * @return void
	 */
	public function test_blocks_are_discovered() {
		$blocks = self::blocks();

		$this->assertNotEmpty( $blocks, 'no block.json found under src/ — the scan is broken' );
		$this->assertArrayHasKey( 'text', $blocks );
		$this->assertArrayHasKey( 'button', $blocks );
	}

	/**
	 * `source` on an attribute requires a save() that writes markup.
	 *
	 * THE BUG THIS ENCODES. The Text block declared
	 * `"content": { "source": "rich-text" }` alongside `save: () => null`.
	 * `source` tells core to parse the value back out of the SAVED MARKUP;
	 * returning null writes none, so the text was stored nowhere, read back
	 * empty, and the block rendered nothing on the front end. The editor
	 * looked correct until reload.
	 *
	 * @return void
	 */
	public function test_source_attributes_require_a_real_save() {
		foreach ( self::blocks() as $slug => $block ) {
			$sourced = array();

			foreach ( (array) ( $block['json']['attributes'] ?? array() ) as $name => $config ) {
				if ( is_array( $config ) && isset( $config['source'] ) ) {
					$sourced[] = $name;
				}
			}

			if ( empty( $sourced ) ) {
				$this->assertTrue( true, $slug . ' declares no sourced attributes' );
				continue;
			}

			$this->assertFalse(
				self::saves_null( $block['index'] ),
				sprintf(
					'%s declares source on [%s] but save() returns null. Core would parse those'
						. ' attributes out of saved markup that never gets written, so the values'
						. ' are lost and the block renders empty. Either drop `source` or write a'
						. ' save() that outputs the markup.',
					$slug,
					implode( ', ', $sourced )
				)
			);
		}
	}

	/**
	 * A block with inner blocks must not return null from save().
	 *
	 * THE SIBLING BUG. With no save output, core serialises the block as a
	 * self-closing comment — `<!-- wp:zealblocks/buttons /-->` — and every inner
	 * block is discarded at save time. The children vanish along with their
	 * text, URLs and styles, and nothing warns the user.
	 *
	 * "Dynamic" means the block's OWN markup is generated at render time. Inner
	 * blocks still have to exist in post content, because that is where they
	 * are stored.
	 *
	 * @return void
	 */
	public function test_container_blocks_serialise_their_children() {
		foreach ( self::blocks() as $slug => $block ) {
			$is_container = isset( $block['json']['allowedBlocks'] )
				|| false !== strpos( $block['edit'], 'useInnerBlocksProps' )
				|| false !== strpos( $block['edit'], 'InnerBlocks' );

			if ( ! $is_container ) {
				continue;
			}

			$this->assertFalse(
				self::saves_null( $block['index'] ),
				sprintf(
					'%s accepts inner blocks but save() returns null. Core would write it as a'
						. ' self-closing comment and DISCARD every child at save time. Return'
						. ' <InnerBlocks.Content /> instead.',
					$slug
				)
			);

			$this->assertStringContainsString(
				'InnerBlocks.Content',
				$block['index'],
				$slug . ' should serialise its children with <InnerBlocks.Content />'
			);
		}
	}

	/**
	 * A declared render template must exist, or the block registers and
	 * renders nothing.
	 *
	 * @return void
	 */
	public function test_declared_render_templates_exist() {
		foreach ( self::blocks() as $slug => $block ) {
			$render = $block['json']['render'] ?? null;

			if ( ! $render ) {
				continue;
			}

			$this->assertStringStartsWith( 'file:./', $render, $slug . ' render path should be file-relative' );

			$path = $block['dir'] . '/' . substr( $render, strlen( 'file:./' ) );

			$this->assertFileExists( $path, $slug . ' declares a render template that does not exist' );
		}
	}

	/**
	 * Identity fields must match the plugin, or blocks land in the wrong
	 * category and translations never load.
	 *
	 * @return void
	 */
	public function test_identity_fields_match_the_plugin() {
		foreach ( self::blocks() as $slug => $block ) {
			$json = $block['json'];

			$this->assertStringStartsWith(
				ZEALBLOCKS_SLUG . '/',
				(string) ( $json['name'] ?? '' ),
				$slug . ' block name must be namespaced with the plugin slug'
			);

			$this->assertSame(
				ZEALBLOCKS_SLUG,
				$json['category'] ?? null,
				$slug . ' category must match the registered category, or it lands in Uncategorized'
			);

			$this->assertSame(
				ZEALBLOCKS_SLUG,
				$json['textdomain'] ?? null,
				$slug . ' textdomain must match the plugin slug or translate.wordpress.org delivers nothing'
			);
		}
	}

	/**
	 * Each block.json version must match the plugin version.
	 *
	 * `version` is what register_block_type() uses to cache-bust that block's
	 * own assets, so a stale value leaves browsers on an old bundle. The
	 * release gate checks the plugin header, the constant and the readme
	 * against each other but cannot see these.
	 *
	 * @return void
	 */
	public function test_block_versions_match_the_plugin_version() {
		$plugin_version = self::plugin_version();

		$this->assertNotSame( '', $plugin_version, 'could not read Version: from the main plugin file' );

		foreach ( self::blocks() as $slug => $block ) {
			$this->assertSame(
				$plugin_version,
				$block['json']['version'] ?? null,
				$slug . ' block.json version must match the plugin version'
			);
		}
	}

	/**
	 * Every block that declares any animation attribute declares all five,
	 * exactly as Animation::ATTRIBUTES does.
	 *
	 * The attributes have to live in each block.json, because that is the
	 * only place register_block_type() reads them from. This is what keeps
	 * those copies from drifting, as a second animated block is added.
	 *
	 * @return void
	 */
	public function test_animated_blocks_declare_the_shared_attributes() {
		$animated = 0;

		foreach ( self::blocks() as $slug => $block ) {
			$attributes = isset( $block['json']['attributes'] ) ? $block['json']['attributes'] : array();
			$declared   = array_intersect_key( $attributes, Animation::ATTRIBUTES );

			if ( ! $declared ) {
				continue;
			}

			++$animated;

			foreach ( Animation::ATTRIBUTES as $name => $definition ) {
				$this->assertSame(
					$definition,
					$attributes[ $name ] ?? null,
					$slug . ' block.json must declare ' . $name . ' exactly as Animation::ATTRIBUTES does'
				);
			}
		}

		$this->assertGreaterThan( 0, $animated, 'no animated block found, so this test checked nothing' );
	}

	/**
	 * The animation types, easings and defaults agree across the three places
	 * that must list them: PHP validation, the editor picker and the SCSS start
	 * states.
	 *
	 * A type in the picker but not in PHP is dropped on save, silently. A type
	 * in PHP but not in the SCSS map plays with no start state. Neither shows
	 * up as an error anywhere else.
	 *
	 * @return void
	 */
	public function test_animation_lists_match_across_php_js_and_scss() {
		$js   = (string) file_get_contents( ZEALBLOCKS_PATH . 'src/shared/animation/constants.js' );
		$scss = (string) file_get_contents( ZEALBLOCKS_PATH . 'src/shared/animation/_animation.scss' );

		$section = static function ( $source, $from, $to ) {
			$start = strpos( $source, $from );
			$end   = strpos( $source, $to, (int) $start );

			return false === $start || false === $end ? '' : substr( $source, $start, $end - $start );
		};

		preg_match_all( "/value:\s*'([a-z-]+)'/", $section( $js, 'ANIMATION_GROUPS', 'EASING_OPTIONS' ), $js_types );
		preg_match_all( "/value:\s*'([a-z-]+)'/", $section( $js, 'EASING_OPTIONS', 'ANIMATION_DEFAULTS' ), $js_easings );
		preg_match_all( '/"([a-z-]+)":\s*\(/', $section( $scss, '$starts:', ');' ), $scss_types );

		$this->assertSame( Animation::TYPES, $js_types[1], 'constants.js ANIMATION_GROUPS must list Animation::TYPES, in order' );
		$this->assertSame( Animation::TYPES, $scss_types[1], '_animation.scss $starts must have a key per Animation::TYPES, in order' );
		$this->assertSame( Animation::EASINGS, $js_easings[1], 'constants.js EASING_OPTIONS must list Animation::EASINGS, in order' );

		foreach ( Animation::ATTRIBUTES as $name => $definition ) {
			$default = var_export( $definition['default'], true ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- builds the JS literal to look for.
			$this->assertMatchesRegularExpression(
				'/' . preg_quote( $name, '/' ) . ':\s*' . preg_quote( $default, '/' ) . ',/',
				$section( $js, 'ANIMATION_DEFAULTS', '};' ),
				'constants.js ANIMATION_DEFAULTS.' . $name . ' must be ' . $default
			);
		}
	}

	/**
	 * Every block with display conditions declares the attribute exactly as
	 * Display_Conditions::ATTRIBUTES does.
	 *
	 * @return void
	 */
	public function test_condition_blocks_declare_the_shared_attribute() {
		$with_conditions = 0;

		foreach ( self::blocks() as $slug => $block ) {
			$attributes = isset( $block['json']['attributes'] ) ? $block['json']['attributes'] : array();

			if ( ! array_intersect_key( $attributes, Display_Conditions::ATTRIBUTES ) ) {
				continue;
			}

			++$with_conditions;

			foreach ( Display_Conditions::ATTRIBUTES as $name => $definition ) {
				$this->assertSame(
					$definition,
					$attributes[ $name ] ?? null,
					$slug . ' block.json must declare ' . $name . ' exactly as Display_Conditions::ATTRIBUTES does'
				);
			}
		}

		$this->assertGreaterThan( 0, $with_conditions, 'no block with display conditions found, so this test checked nothing' );
	}

	/**
	 * The browsers, systems and days the editor offers are exactly the ones
	 * the server recognises.
	 *
	 * One the editor offers but the server does not know would be stored and
	 * then never match, so the block would never hide. Nothing else reports
	 * that.
	 *
	 * @return void
	 */
	public function test_condition_lists_match_between_php_and_js() {
		$js = (string) file_get_contents( ZEALBLOCKS_PATH . 'src/shared/display-conditions/constants.js' );

		$values = static function ( $from, $to ) use ( $js ) {
			$start = strpos( $js, $from );
			$end   = false === $to ? strlen( $js ) : strpos( $js, $to, (int) $start );
			$part  = false === $start || false === $end ? '' : substr( $js, $start, $end - $start );

			preg_match_all( "/value:\s*'([a-z_]+)'/", $part, $matches );

			return $matches[1];
		};

		$this->assertSame( Display_Conditions::BROWSERS, $values( 'BROWSER_OPTIONS', 'OS_OPTIONS' ), 'BROWSER_OPTIONS must list Display_Conditions::BROWSERS, in order' );
		$this->assertSame( Display_Conditions::SYSTEMS, $values( 'OS_OPTIONS', 'DAY_OPTIONS' ), 'OS_OPTIONS must list Display_Conditions::SYSTEMS, in order' );
		$this->assertSame( Display_Conditions::DAYS, $values( 'DAY_OPTIONS', false ), 'DAY_OPTIONS must list Display_Conditions::DAYS, in order' );
	}

	/**
	 * The z-index key, range and class agree between PHP, the editor and the
	 * stylesheet.
	 *
	 * A class name that differs between Z_Index and the SCSS mixin would leave
	 * every z-index on a static block doing nothing, with no error anywhere.
	 *
	 * @return void
	 */
	public function test_z_index_values_match_across_php_js_and_scss() {
		$js   = (string) file_get_contents( ZEALBLOCKS_PATH . 'src/shared/z-index/constants.js' );
		$scss = (string) file_get_contents( ZEALBLOCKS_PATH . 'src/shared/z-index/_z-index.scss' );

		$this->assertStringContainsString( "Z_INDEX_KEY = '" . Z_Index::KEY . "'", $js );
		$this->assertStringContainsString( 'Z_INDEX_RANGE = { min: ' . Z_Index::MIN . ', max: ' . Z_Index::MAX . ' }', $js );
		$this->assertStringContainsString( "Z_INDEX_CLASS = '" . Z_Index::CLASS_NAME . "'", $js );
		$this->assertStringContainsString( ':where(.' . Z_Index::CLASS_NAME . ')', $scss, 'the base() mixin must target Z_Index::CLASS_NAME' );
	}

	/**
	 * Whether an index.js returns null from save().
	 *
	 * Text matching, deliberately: the alternative is executing JS from PHP.
	 * It is tolerant of formatting but will not match
	 * `save: () => <InnerBlocks.Content />`.
	 *
	 * @param string $index Contents of index.js.
	 * @return bool
	 */
	private static function saves_null( $index ) {
		return 1 === preg_match( '/save\s*:\s*\(\s*\)\s*=>\s*null/', $index );
	}

	/**
	 * The version from the main plugin file's header.
	 *
	 * Read from the file rather than ZEALBLOCKS_VERSION, so this test still
	 * catches a constant that has drifted from the header.
	 *
	 * @return string
	 */
	private static function plugin_version() {
		$main = (string) file_get_contents( ZEALBLOCKS_PATH . ZEALBLOCKS_SLUG . '.php' );

		return 1 === preg_match( '/^\s*\*\s*Version:\s*(.+)$/m', $main, $matches )
			? trim( $matches[1] )
			: '';
	}
}
