<?php
/**
 * Unit tests for the shared entrance animation.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Animation;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Animation
 */
final class AnimationTest extends TestCase {

	/**
	 * Each test starts with nothing enqueued.
	 *
	 * @return void
	 */
	protected function setUp(): void {
		$GLOBALS['enqueued_scripts'] = array();
	}

	/**
	 * A block with no type, or a type not in the list, gets nothing and loads
	 * nothing.
	 *
	 * @return void
	 */
	public function test_an_unanimated_block_gets_nothing() {
		$empty = array(
			'classes'    => array(),
			'attributes' => array(),
		);

		$this->assertSame( $empty, Animation::wrapper( array() ) );
		$this->assertSame( $empty, Animation::wrapper( array( 'animationType' => '' ) ) );
		$this->assertSame( $empty, Animation::wrapper( array( 'animationType' => 'explode' ) ) );
		$this->assertSame( $empty, Animation::wrapper( array( 'animationType' => '"><script>' ) ) );
		$this->assertSame( $empty, Animation::wrapper( array( 'animationType' => array( 'fade' ) ) ) );
		$this->assertSame( array(), $GLOBALS['enqueued_scripts'], 'nothing may be enqueued for an unanimated block' );
	}

	/**
	 * Every listed type is accepted as-is.
	 *
	 * @return void
	 */
	public function test_every_type_is_accepted() {
		foreach ( Animation::TYPES as $type ) {
			$this->assertSame( $type, Animation::type( array( 'animationType' => $type ) ) );
		}
	}

	/**
	 * An animated block gets the class, the data attribute, the timing as
	 * custom properties, and the script.
	 *
	 * @return void
	 */
	public function test_an_animated_block_gets_its_markup_and_the_script() {
		$result = Animation::wrapper( array( 'animationType' => 'fade-up' ) );

		$this->assertSame( array( 'has-animation' ), $result['classes'] );
		$this->assertSame( 'fade-up', $result['attributes']['data-zealblocks-animation'] );
		$this->assertSame(
			'--zealblocks-animation-duration:400ms;--zealblocks-animation-delay:0ms;--zealblocks-animation-easing:ease;',
			$result['attributes']['style'],
			'missing timing must fall back to the block.json defaults'
		);
		$this->assertArrayNotHasKey( 'data-zealblocks-animation-repeat', $result['attributes'] );
		$this->assertSame( array( ZEALBLOCKS_SLUG . '-animation' ), $GLOBALS['enqueued_scripts'] );
		$this->assertSame( ZEALBLOCKS_SLUG . '-animation', Animation::handle() );
	}

	/**
	 * Duration and delay are clamped to 0…MAX_MS; anything not numeric falls
	 * back to the default.
	 *
	 * @return void
	 */
	public function test_timing_is_clamped() {
		$style = static function ( $duration, $delay ) {
			$result = Animation::wrapper(
				array(
					'animationType'     => 'fade',
					'animationDuration' => $duration,
					'animationDelay'    => $delay,
				)
			);

			return $result['attributes']['style'];
		};

		$this->assertStringContainsString( 'duration:5000ms', $style( 99999, 0 ) );
		$this->assertStringContainsString( 'delay:0ms', $style( 400, -5 ) );
		$this->assertStringContainsString( 'duration:700ms', $style( '700', 0 ) );
		$this->assertStringContainsString( 'delay:0ms', $style( 400, 'abc' ) );
		$this->assertStringContainsString( 'duration:400ms', $style( '1;}body{', 0 ) );
		$this->assertStringContainsString( 'duration:1200ms;--zealblocks-animation-delay:300ms', $style( 1200.9, 300 ) );
	}

	/**
	 * Easing is one of five keywords; anything else is `ease`.
	 *
	 * @return void
	 */
	public function test_easing_is_validated() {
		foreach ( Animation::EASINGS as $easing ) {
			$result = Animation::wrapper(
				array(
					'animationType'   => 'fade',
					'animationEasing' => $easing,
				)
			);
			$this->assertStringEndsWith( 'easing:' . $easing . ';', $result['attributes']['style'] );
		}

		$hostile = Animation::wrapper(
			array(
				'animationType'   => 'fade',
				'animationEasing' => 'steps(1);background:url(x)',
			)
		);
		$this->assertStringEndsWith( 'easing:ease;', $hostile['attributes']['style'] );
	}

	/**
	 * The repeat flag is a data attribute, present only when set.
	 *
	 * @return void
	 */
	public function test_repeat_flag() {
		$on  = Animation::wrapper(
			array(
				'animationType'   => 'zoom-in',
				'animationRepeat' => true,
			)
		);
		$off = Animation::wrapper(
			array(
				'animationType'   => 'zoom-in',
				'animationRepeat' => false,
			)
		);

		$this->assertSame( 'true', $on['attributes']['data-zealblocks-animation-repeat'] );
		$this->assertArrayNotHasKey( 'data-zealblocks-animation-repeat', $off['attributes'] );
	}
}
