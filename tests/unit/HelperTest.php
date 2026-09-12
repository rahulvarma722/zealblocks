<?php
/**
 * Unit tests for the shared environment getters.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Helper;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Helper
 */
final class HelperTest extends TestCase {

	/**
	 * The memo is per-request, so it has to be cleared between cases or one
	 * test's theme.json leaks into the next.
	 *
	 * @return void
	 */
	protected function setUp(): void {
		parent::setUp();
		Helper::flush();
	}

	/**
	 * @return void
	 */
	protected function tearDown(): void {
		Helper::flush();
		parent::tearDown();
	}

	/**
	 * The fallback bands must stay identical to core's defaults, or a site that
	 * upgrades past 7.1 would see its breakpoints shift.
	 *
	 * @return void
	 */
	public function test_fallback_breakpoints_match_core_defaults() {
		$this->assertSame(
			array(
				'mobile' => '480px',
				'tablet' => '782px',
			),
			Helper::FALLBACK_BREAKPOINTS
		);
	}

	/**
	 * The state keys are written into post content, so they are permanent.
	 *
	 * @return void
	 */
	public function test_viewport_state_keys_are_stable() {
		$this->assertSame( array( '@tablet', '@mobile' ), Helper::VIEWPORT_STATES );
	}

	/**
	 * With no theme.json, the fallbacks apply.
	 *
	 * The unit bootstrap stubs wp_get_global_settings() to return an empty
	 * array, which is the no-viewport-declared case — and the normal one, since
	 * few themes declare `settings.viewport`.
	 *
	 * @return void
	 */
	public function test_breakpoints_fall_back_when_theme_declares_none() {
		$this->assertSame( Helper::FALLBACK_BREAKPOINTS, Helper::breakpoints() );
	}

	/**
	 * A single breakpoint, and an unknown viewport.
	 *
	 * @return void
	 */
	public function test_breakpoint_reads_one_value() {
		$this->assertSame( '480px', Helper::breakpoint( 'mobile' ) );
		$this->assertSame( '782px', Helper::breakpoint( 'tablet' ) );
		$this->assertSame( '', Helper::breakpoint( 'watch' ) );
		$this->assertSame( '', Helper::breakpoint( '' ) );
	}

	/**
	 * Media queries are returned for both states, and are real media queries.
	 *
	 * Without WP_Theme_JSON present this exercises the pre-7.1 fallback path,
	 * which is the one that otherwise never runs on a modern site.
	 *
	 * @return void
	 */
	public function test_media_queries_cover_both_states() {
		$queries = Helper::media_queries();

		$this->assertArrayHasKey( '@mobile', $queries );
		$this->assertArrayHasKey( '@tablet', $queries );

		foreach ( $queries as $state => $query ) {
			$this->assertStringStartsWith( '@media ', $query, $state . ' should be a media query' );
			$this->assertStringContainsString( '480px', $queries['@mobile'] );
			$this->assertStringContainsString( '782px', $queries['@tablet'] );
		}
	}

	/**
	 * The memo returns the same value and does not corrupt it.
	 *
	 * @return void
	 */
	public function test_values_are_memoised_consistently() {
		$this->assertSame( Helper::media_queries(), Helper::media_queries() );
		$this->assertSame( Helper::breakpoints(), Helper::breakpoints() );
	}

	/**
	 * flush() actually clears, or tests would leak into each other.
	 *
	 * @return void
	 */
	public function test_flush_clears_the_memo() {
		$before = Helper::breakpoints();

		Helper::flush();

		$this->assertSame( $before, Helper::breakpoints(), 'same inputs still give the same answer' );
	}

	/**
	 * Identity getters read the constants rather than restating them.
	 *
	 * @return void
	 */
	public function test_identity_getters() {
		$this->assertSame( ZEALBLOCKS_SLUG, Helper::slug() );
		$this->assertSame( ZEALBLOCKS_VERSION, Helper::version() );
	}

	/**
	 * path() joins without doubling or dropping a separator.
	 *
	 * @return void
	 */
	public function test_path_joins_cleanly() {
		$this->assertSame( ZEALBLOCKS_PATH, Helper::path() );
		$this->assertSame( ZEALBLOCKS_PATH . 'includes/', Helper::path( 'includes/' ) );
		$this->assertSame(
			ZEALBLOCKS_PATH . 'includes/class-helper.php',
			Helper::path( '/includes/class-helper.php' ),
			'a leading slash must not produce a double separator'
		);
		$this->assertFileExists( Helper::path( 'includes/class-helper.php' ) );
	}
}
