<?php
/**
 * Unit tests for the Container's per-device reverse order.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Reverse_Order;
use Zealblocks\Helper;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Reverse_Order
 */
final class ReverseOrderTest extends TestCase {

	const FLEX = array(
		'type'     => 'flex',
		'flexWrap' => 'nowrap',
	);

	/**
	 * The direction each band gets, keyed '' for the base and by state.
	 *
	 * @param array $layout The `layout` attribute.
	 * @param array $style  The `style` attribute.
	 * @return array<string, string>
	 */
	private function directions( $layout, $style ) {
		$queries = array_flip( Helper::media_queries() );
		$result  = Reverse_Order::responsive( $layout, $style, 'zb-rev-' );
		$bands   = array();

		foreach ( $result['rules'] as $rule ) {
			$bands[ isset( $rule['rules_group'] ) ? $queries[ $rule['rules_group'] ] : '' ] = $rule['declarations']['flex-direction'];
		}

		ksort( $bands );

		return $bands;
	}

	/**
	 * A reverse flag on one layer.
	 *
	 * @param bool|mixed $value The flag.
	 * @return array A `zealblocks` layer.
	 */
	private static function flag( $value ) {
		return array( 'zealblocks' => array( Reverse_Order::KEY => $value ) );
	}

	/**
	 * Only a flex layout is reversed: a grid or a flow has no direction.
	 *
	 * @return void
	 */
	public function test_only_flex_layouts_are_reversed() {
		$style = self::flag( true );

		foreach ( array( array(), array( 'type' => 'constrained' ), array( 'type' => 'grid' ), 'flex', null ) as $layout ) {
			$this->assertSame(
				array(
					'class' => '',
					'rules' => array(),
				),
				Reverse_Order::responsive( $layout, $style, 'zb-rev-' ),
				var_export( $layout, true ) . ' is not a flex layout' // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- assertion message.
			);
		}
	}

	/**
	 * Nothing reversed anywhere means no rules at all, so core's direction
	 * stands untouched. An explicit false is not a reverse.
	 *
	 * @return void
	 */
	public function test_nothing_reversed_means_no_rules() {
		$this->assertSame( array(), $this->directions( self::FLEX, array() ) );
		$this->assertSame( array(), $this->directions( self::FLEX, self::flag( false ) ) );
		$this->assertSame( array(), $this->directions( self::FLEX, array( '@mobile' => self::flag( false ) ) ) );
	}

	/**
	 * Only boolean true reverses: a stored string or number is not a flag the
	 * editor writes, so it is not trusted to mean one.
	 *
	 * @return void
	 */
	public function test_only_boolean_true_reverses() {
		foreach ( array( 'true', '1', 1, 'yes', array( true ) ) as $value ) {
			$this->assertSame( array(), $this->directions( self::FLEX, self::flag( $value ) ) );
		}
	}

	/**
	 * Once any band is reversed, every band gets an explicit direction.
	 *
	 * @return void
	 */
	public function test_a_reversed_base_reverses_every_band() {
		$this->assertSame(
			array(
				''        => 'row-reverse',
				'@mobile' => 'row-reverse',
				'@tablet' => 'row-reverse',
			),
			$this->directions( self::FLEX, self::flag( true ) )
		);

		$this->assertSame(
			array(
				''        => 'column-reverse',
				'@mobile' => 'column-reverse',
				'@tablet' => 'column-reverse',
			),
			$this->directions(
				array(
					'type'        => 'flex',
					'orientation' => 'vertical',
				),
				self::flag( true )
			)
		);
	}

	/**
	 * Each band reads its own orientation from core's per-device layout, so a
	 * Row that stacks on mobile is not forced back into a row.
	 *
	 * @return void
	 */
	public function test_each_band_follows_its_own_orientation() {
		$style = array_merge(
			self::flag( true ),
			array(
				'@mobile' => array_merge(
					self::flag( false ),
					array( 'layout' => array( 'orientation' => 'vertical' ) )
				),
			)
		);

		$this->assertSame(
			array(
				''        => 'row-reverse',
				'@mobile' => 'column',
				'@tablet' => 'row-reverse',
			),
			$this->directions( self::FLEX, $style )
		);
	}

	/**
	 * Mobile falls back to the base, never to Tablet, as core's states do.
	 *
	 * @return void
	 */
	public function test_mobile_falls_back_to_the_base_not_to_tablet() {
		$style = array(
			'@tablet' => array_merge(
				self::flag( true ),
				array( 'layout' => array( 'orientation' => 'vertical' ) )
			),
		);

		$this->assertSame(
			array(
				''        => 'row',
				'@mobile' => 'row',
				'@tablet' => 'column-reverse',
			),
			$this->directions( self::FLEX, $style )
		);
	}

	/**
	 * An orientation core would not write falls back, rather than reaching the
	 * stylesheet.
	 *
	 * @return void
	 */
	public function test_unknown_orientations_fall_back() {
		$this->assertSame(
			array(
				''        => 'row-reverse',
				'@mobile' => 'row-reverse',
				'@tablet' => 'row-reverse',
			),
			$this->directions(
				array(
					'type'        => 'flex',
					'orientation' => 'diagonal;}body{display:none',
				),
				array_merge(
					self::flag( true ),
					array( '@mobile' => array( 'layout' => array( 'orientation' => array( 'vertical' ) ) ) )
				)
			)
		);
	}

	/**
	 * Every rule is important, to beat core's layout rule on the same element,
	 * and scoped to the returned class.
	 *
	 * @return void
	 */
	public function test_rules_are_important_and_scoped_to_the_class() {
		$result = Reverse_Order::responsive( self::FLEX, self::flag( true ), 'zb-rev-' );

		$this->assertMatchesRegularExpression( '/^zb-rev-[0-9a-f]{8}$/', $result['class'] );
		$this->assertCount( 1 + count( Helper::media_queries() ), $result['rules'] );

		foreach ( $result['rules'] as $rule ) {
			$this->assertTrue( $rule['important'] );
			$this->assertSame( '.' . $result['class'], $rule['selector'] );
		}
	}

	/**
	 * The class comes from the directions, so equal containers share one rule
	 * and different ones never share a class.
	 *
	 * @return void
	 */
	public function test_the_class_is_derived_from_the_directions() {
		$row    = Reverse_Order::responsive( self::FLEX, self::flag( true ), 'zb-rev-' );
		$again  = Reverse_Order::responsive( self::FLEX, self::flag( true ), 'zb-rev-' );
		$column = Reverse_Order::responsive(
			array(
				'type'        => 'flex',
				'orientation' => 'vertical',
			),
			self::flag( true ),
			'zb-rev-'
		);

		$this->assertSame( $row['class'], $again['class'] );
		$this->assertNotSame( $row['class'], $column['class'] );
	}
}
