<?php
/**
 * Unit tests for per-viewport CSS generation.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Helper;
use Zealblocks\Responsive_Styles;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Responsive_Styles
 */
final class ResponsiveStylesTest extends TestCase {

	/**
	 * A `style` attribute carrying values in all three layers.
	 *
	 * @return array
	 */
	private function style() {
		return array(
			'zealblocks' => array( 'width' => '200px' ),
			'@tablet'  => array( 'zealblocks' => array( 'width' => '150px' ) ),
			'@mobile'  => array( 'zealblocks' => array( 'width' => '100%' ) ),
		);
	}

	/**
	 * null means the base layer, which is Desktop — not a third band.
	 *
	 * @return void
	 */
	public function test_get_state_value_reads_each_layer() {
		$style = $this->style();

		$this->assertSame( '200px', Responsive_Styles::get_state_value( $style, null, 'zealblocks', 'width' ) );
		$this->assertSame( '150px', Responsive_Styles::get_state_value( $style, '@tablet', 'zealblocks', 'width' ) );
		$this->assertSame( '100%', Responsive_Styles::get_state_value( $style, '@mobile', 'zealblocks', 'width' ) );
	}

	/**
	 * Missing layers, keys and non-scalars all read as '' rather than warning.
	 *
	 * @return void
	 */
	public function test_get_state_value_is_total() {
		$this->assertSame( '', Responsive_Styles::get_state_value( array(), null, 'zealblocks', 'width' ) );
		$this->assertSame( '', Responsive_Styles::get_state_value( $this->style(), '@print', 'zealblocks', 'width' ) );
		$this->assertSame( '', Responsive_Styles::get_state_value( $this->style(), null, 'other', 'width' ) );
		$this->assertSame( '', Responsive_Styles::get_state_value( $this->style(), null, 'zealblocks', 'height' ) );
		$this->assertSame( '', Responsive_Styles::get_state_value( 'not-an-array', null, 'zealblocks', 'width' ) );
		$this->assertSame(
			'',
			Responsive_Styles::get_state_value(
				array( 'zealblocks' => array( 'width' => array( 'nested' ) ) ),
				null,
				'zealblocks',
				'width'
			),
			'a non-scalar value is not emitted'
		);
	}

	/**
	 * The allow-list accepts the units the control offers and nothing else.
	 *
	 * @return void
	 */
	public function test_is_safe_length_allow_list() {
		foreach ( array( '200px', '100%', '1.5em', '10rem', '50vw', '80vh', '.5em', '0px' ) as $ok ) {
			$this->assertTrue( Responsive_Styles::is_safe_length( $ok ), $ok . ' should be allowed' );
		}

		foreach (
			array(
				'expression(alert(1))',
				'200',
				'200 px',
				'calc(100% - 10px)',
				'200px;color:red',
				'url(x)',
				'',
				'auto',
				'200ch',
				'50px}</style><script>alert(1)</script>',
			) as $bad
		) {
			$this->assertFalse( Responsive_Styles::is_safe_length( $bad ), $bad . ' should be rejected' );
		}
	}

	/**
	 * Negatives are rejected unless the caller opts in.
	 *
	 * `width` cannot be negative in CSS, so emitting `-50px` only ever produced
	 * a declaration the browser discards.
	 *
	 * @return void
	 */
	public function test_negative_lengths_require_opt_in() {
		$this->assertFalse( Responsive_Styles::is_safe_length( '-50px' ) );
		$this->assertTrue( Responsive_Styles::is_safe_length( '-50px', true ) );
		$this->assertFalse( Responsive_Styles::is_safe_length( '-abc', true ), 'opting in does not relax the rest' );
	}

	/**
	 * The base layer carries no media query, so its rule has no rules_group.
	 *
	 * @return void
	 */
	public function test_build_rules_emits_base_without_a_group() {
		$rules = Responsive_Styles::build_rules(
			array( 'zealblocks' => array( 'width' => '200px' ) ),
			'.t',
			'zealblocks',
			'width',
			'width'
		);

		$this->assertSame(
			array(
				array(
					'selector'     => '.t',
					'declarations' => array( 'width' => '200px' ),
				),
			),
			$rules
		);
		$this->assertArrayNotHasKey( 'rules_group', $rules[0], 'the base layer applies at every width' );
	}

	/**
	 * Unsafe values are dropped, and drop nothing else with them.
	 *
	 * @return void
	 */
	public function test_build_rules_drops_unsafe_values_only() {
		$rules = Responsive_Styles::build_rules(
			array(
				'zealblocks' => array( 'width' => 'expression(alert(1))' ),
				'@mobile'      => array( 'zealblocks' => array( 'width' => '100%' ) ),
			),
			'.t',
			'zealblocks',
			'width',
			'width'
		);

		$this->assertCount( 1, $rules, 'the hostile base value produced no rule' );
		$this->assertSame( '100%', $rules[0]['declarations']['width'], 'the valid mobile value survives' );
		$this->assertStringNotContainsString( 'expression', json_encode( $rules ) );
	}

	/**
	 * Nothing stored means no rules — not an empty rule.
	 *
	 * @return void
	 */
	public function test_build_rules_emits_nothing_when_unset() {
		$this->assertSame( array(), Responsive_Styles::build_rules( array(), '.t', 'zealblocks', 'width', 'width' ) );
		$this->assertSame( array(), Responsive_Styles::build_rules( 'nope', '.t', 'zealblocks', 'width', 'width' ) );
	}

	/**
	 * Any CSS property can be emitted, including a custom property — that is
	 * what makes the descendant (icon-size) case work.
	 *
	 * @return void
	 */
	public function test_build_rules_emits_custom_properties() {
		$rules = Responsive_Styles::build_rules(
			array( 'zealblocks' => array( 'iconSize' => '1.5em' ) ),
			'.t',
			'zealblocks',
			'iconSize',
			'--zealblocks-button-icon-size'
		);

		$this->assertSame(
			array(
				array(
					'selector'     => '.t',
					'declarations' => array( '--zealblocks-button-icon-size' => '1.5em' ),
				),
			),
			$rules
		);
	}

	/**
	 * The media query is passed to rules_group VERBATIM, in core's order.
	 *
	 * This is the invariant the old `<style>` path had to defend with a comment:
	 * core's range syntax contains `<`, and wp_strip_all_tags() or esc_attr()
	 * would mangle it. With the style engine the query is data, so the only
	 * thing to assert is that it arrives untouched.
	 *
	 * @return void
	 */
	public function test_build_rules_passes_media_queries_through_verbatim() {
		$queries = Helper::media_queries();

		$rules = Responsive_Styles::build_rules(
			array(
				'@tablet' => array( 'zealblocks' => array( 'width' => '150px' ) ),
				'@mobile' => array( 'zealblocks' => array( 'width' => '100%' ) ),
			),
			'.t',
			'zealblocks',
			'width',
			'width'
		);

		$this->assertCount( 2, $rules );
		$this->assertSame( array_values( $queries ), array_column( $rules, 'rules_group' ), 'one rule per state, in the order core returns them' );
		foreach ( $rules as $rule ) {
			$this->assertSame( '.t', $rule['selector'], 'every state rule is scoped to the same selector' );
		}
	}
}
