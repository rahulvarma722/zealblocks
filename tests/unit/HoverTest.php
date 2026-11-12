<?php
/**
 * Unit tests for the shared hover colours.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Hover;
use Zealblocks\Block\Render;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Hover
 */
final class HoverTest extends TestCase {

	/**
	 * Rules for a `style` attribute, through the same call a block makes.
	 *
	 * @param array           $style  The block's `style` attribute.
	 * @param string|string[] $states States the colours apply in.
	 * @return array{class: string, rules: array}
	 */
	private function responsive( $style, $states = ':hover' ) {
		return Render::responsive( $style, 'zealblocks', Hover::properties( '--zb-test-hover-', $states ), 'zb-test-' );
	}

	/**
	 * The map entries, in the order a block's map has always listed them.
	 *
	 * @return void
	 */
	public function test_properties_shape() {
		$this->assertSame(
			array(
				Hover::DURATION   => array( '--zb-test-hover-duration', 'time' ),
				Hover::TEXT       => array( 'color', 'color', ':hover' ),
				Hover::BACKGROUND => array( 'background', 'background', ':hover' ),
			),
			Hover::properties( '--zb-test-hover-' )
		);
	}

	/**
	 * Text alone stays `:hover`; a block that asks for focus too gets both.
	 *
	 * @return void
	 */
	public function test_states_reach_the_selector() {
		$style = array( 'zealblocks' => array( 'textHover' => '#f00' ) );

		$hover_only = $this->responsive( $style );
		$this->assertSame( '.' . $hover_only['class'] . ':hover', $hover_only['rules'][0]['selector'] );

		$with_focus = $this->responsive( $style, array( ':hover', ':focus' ) );
		$base       = '.' . $with_focus['class'];
		$this->assertSame( $base . ':hover,' . $base . ':focus', $with_focus['rules'][0]['selector'] );
		$this->assertTrue( $with_focus['rules'][0]['important'] );
	}

	/**
	 * The duration is a custom property with no state, never important.
	 *
	 * @return void
	 */
	public function test_duration_is_a_plain_custom_property() {
		$result = $this->responsive( array( 'zealblocks' => array( 'hoverDuration' => '300ms' ) ) );

		$this->assertSame( '.' . $result['class'], $result['rules'][0]['selector'] );
		$this->assertSame( array( '--zb-test-hover-duration' => '300ms' ), $result['rules'][0]['declarations'] );
		$this->assertArrayNotHasKey( 'important', $result['rules'][0] );
	}

	/**
	 * The class follows the hover rules that survived, in any band and with
	 * any state list; a duration alone or an unsafe colour gives none.
	 *
	 * @return void
	 */
	public function test_class_follows_the_surviving_hover_rules() {
		$class = array( Hover::CLASS_NAME );

		$this->assertSame( $class, Hover::classes( $this->responsive( array( 'zealblocks' => array( 'textHover' => '#f00' ) ) )['rules'] ) );
		$this->assertSame( $class, Hover::classes( $this->responsive( array( 'zealblocks' => array( 'backgroundHover' => 'linear-gradient(90deg,#000 0%,#fff 100%)' ) ) )['rules'] ) );
		$this->assertSame( $class, Hover::classes( $this->responsive( array( '@mobile' => array( 'zealblocks' => array( 'textHover' => '#f00' ) ) ) )['rules'] ) );
		$this->assertSame( $class, Hover::classes( $this->responsive( array( 'zealblocks' => array( 'textHover' => '#f00' ) ), array( ':hover', ':focus-within' ) )['rules'] ) );

		$this->assertSame( array(), Hover::classes( $this->responsive( array( 'zealblocks' => array( 'hoverDuration' => '300ms' ) ) )['rules'] ) );
		$this->assertSame( array(), Hover::classes( $this->responsive( array( 'zealblocks' => array( 'textHover' => 'red;}body{x' ) ) )['rules'] ) );
		$this->assertSame( array(), Hover::classes( $this->responsive( array( 'zealblocks' => array( 'backgroundHover' => 'url(x.png)' ) ) )['rules'] ) );
		$this->assertSame( array(), Hover::classes( null ) );
		$this->assertSame( array(), Hover::classes( array( array( 'selector' => array( ':hover' ) ) ) ) );
	}
}
