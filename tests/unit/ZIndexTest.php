<?php
/**
 * Unit tests for the shared z-index.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Render;
use Zealblocks\Block\Z_Index;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Z_Index
 */
final class ZIndexTest extends TestCase {

	/**
	 * Rules for a `style` attribute, through the same call a block makes.
	 *
	 * @param array $style The block's `style` attribute.
	 * @return array
	 */
	private function rules( $style ) {
		$responsive = Render::responsive( $style, 'zealblocks', array( Z_Index::KEY => Z_Index::PROPERTY ), 'zb-test-' );

		return $responsive['rules'];
	}

	/**
	 * The class appears exactly when a z-index rule survived validation.
	 *
	 * @return void
	 */
	public function test_class_follows_the_surviving_rules() {
		$this->assertSame( array(), Z_Index::classes( array() ) );
		$this->assertSame( array(), Z_Index::classes( $this->rules( array() ) ) );
		$this->assertSame( array( Z_Index::CLASS_NAME ), Z_Index::classes( $this->rules( array( 'zealblocks' => array( 'zIndex' => '5' ) ) ) ) );
		$this->assertSame( array( Z_Index::CLASS_NAME ), Z_Index::classes( $this->rules( array( 'zealblocks' => array( 'zIndex' => '-100' ) ) ) ) );
		$this->assertSame(
			array( Z_Index::CLASS_NAME ),
			Z_Index::classes( $this->rules( array( '@mobile' => array( 'zealblocks' => array( 'zIndex' => '9' ) ) ) ) ),
			'a Mobile-only z-index still needs the class, which applies in every band'
		);
	}

	/**
	 * An unsafe value is dropped by validation, and then there is no class
	 * either: a block never carries a class with no rule behind it.
	 *
	 * @return void
	 */
	public function test_unsafe_values_leave_no_class() {
		foreach ( array( '1;}body{display:none', 'auto', '1234567', '1.5', '' ) as $value ) {
			$this->assertSame(
				array(),
				Z_Index::classes( $this->rules( array( 'zealblocks' => array( 'zIndex' => $value ) ) ) ),
				var_export( $value, true ) . ' must not produce the class' // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- assertion message.
			);
		}
	}

	/**
	 * Malformed input is ignored, not fatal.
	 *
	 * @return void
	 */
	public function test_malformed_rules_are_ignored() {
		$this->assertSame( array(), Z_Index::classes( null ) );
		$this->assertSame( array(), Z_Index::classes( array( array( 'declarations' => 'z-index' ) ) ) );
		$this->assertSame( array(), Z_Index::classes( array( array( 'declarations' => array( 'position' => 'relative' ) ) ) ) );
	}
}
