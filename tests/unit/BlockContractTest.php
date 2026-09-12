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
