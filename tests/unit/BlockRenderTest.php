<?php
/**
 * Unit tests for the shared render helpers.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Tests\Unit;

use Zealblocks\Block\Render as Block_Render;
use PHPUnit\Framework\TestCase;

/**
 * @covers \Zealblocks\Block\Render
 */
final class BlockRenderTest extends TestCase {

	/**
	 * Absent, non-scalar and whitespace attributes all resolve predictably.
	 *
	 * @return void
	 */
	public function test_text_reads_and_trims() {
		$attributes = array(
			'label'  => '  spaced  ',
			'number' => 42,
			'array'  => array( 'nope' ),
			'null'   => null,
		);

		$this->assertSame( 'spaced', Block_Render::text( $attributes, 'label' ) );
		$this->assertSame( '42', Block_Render::text( $attributes, 'number' ), 'scalars are cast to string' );
		$this->assertSame( '', Block_Render::text( $attributes, 'array' ), 'arrays fall back' );
		$this->assertSame( '', Block_Render::text( $attributes, 'null' ), 'null falls back' );
		$this->assertSame( '', Block_Render::text( $attributes, 'missing' ) );
		$this->assertSame( 'x', Block_Render::text( $attributes, 'missing', 'x' ), 'fallback is honoured' );
		$this->assertSame( '', Block_Render::text( 'not-an-array', 'label' ) );
	}

	/**
	 * one_of() is strict — a loose comparison would let 0 == 'a' through.
	 *
	 * @return void
	 */
	public function test_one_of_is_strict() {
		$allowed = array( '_blank', '_self' );

		$this->assertSame( '_blank', Block_Render::one_of( '_blank', $allowed ) );
		$this->assertSame( '', Block_Render::one_of( 'evil" onmouseover="x', $allowed ) );
		$this->assertSame( 'a', Block_Render::one_of( 'nope', array( 'a', 'button' ), 'a' ) );
		$this->assertSame( '', Block_Render::one_of( 0, $allowed ), 'no loose comparison' );
	}

	/**
	 * Token filtering keeps whole tokens and discards the rest entirely.
	 *
	 * The injection case is the reason this is not a character filter:
	 * stripping disallowed characters leaves `noopenerscriptalert1script`,
	 * which is safe to print and completely meaningless.
	 *
	 * @return void
	 */
	public function test_tokens_matches_whole_tokens() {
		$allowed = array( 'noopener', 'noreferrer', 'nofollow' );

		$this->assertSame( 'noopener noreferrer', Block_Render::tokens( 'noopener noreferrer', $allowed ) );
		$this->assertSame( 'noopener', Block_Render::tokens( 'NOOPENER', $allowed ), 'case-insensitive' );
		$this->assertSame( 'noopener', Block_Render::tokens( "noopener\t\n  nofollow-ish", $allowed ) );
		$this->assertSame( 'noopener', Block_Render::tokens( 'noopener noopener', $allowed ), 'de-duplicated' );
		$this->assertSame( '', Block_Render::tokens( 'noopener"><script>alert(1)</script>', $allowed ) );
		$this->assertSame( '', Block_Render::tokens( '', $allowed ) );
		$this->assertSame( '', Block_Render::tokens( '   ', $allowed ) );
	}

	/**
	 * responsive() returns a class and rules together, or neither.
	 *
	 * Deriving them separately is how they drift: a class emitted with no
	 * matching rule, or a rule scoped to a class the block does not carry.
	 *
	 * @return void
	 */
	public function test_responsive_pairs_class_with_rules() {
		$result = Block_Render::responsive(
			array(
				'zealblocks' => array( 'width' => '200px' ),
				'@mobile'  => array( 'zealblocks' => array( 'width' => '100%' ) ),
			),
			'zealblocks',
			array( 'width' => 'width' ),
			'zealblocks-btn-'
		);

		$this->assertStringStartsWith( 'zealblocks-btn-', $result['class'] );
		$this->assertSame( 8, strlen( $result['class'] ) - strlen( 'zealblocks-btn-' ), 'class carries an 8-char hash' );
		$this->assertNotEmpty( $result['rules'] );
		foreach ( $result['rules'] as $rule ) {
			$this->assertSame( '.' . $result['class'], $rule['selector'], 'every rule is scoped to the class' );
		}
		$this->assertSame( array( '200px', '100%' ), array_column( array_column( $result['rules'], 'declarations' ), 'width' ) );
	}

	/**
	 * Identical values collapse onto one class, so two blocks sharing a value
	 * do not emit near-duplicate rules.
	 *
	 * @return void
	 */
	public function test_responsive_hash_is_value_derived() {
		$style = array( 'zealblocks' => array( 'width' => '200px' ) );
		$props = array( 'width' => 'width' );

		$a = Block_Render::responsive( $style, 'zealblocks', $props, 'zealblocks-' );
		$b = Block_Render::responsive( $style, 'zealblocks', $props, 'zealblocks-' );
		$c = Block_Render::responsive( array( 'zealblocks' => array( 'width' => '201px' ) ), 'zealblocks', $props, 'zealblocks-' );

		$this->assertSame( $a['class'], $b['class'], 'same values, same class' );
		$this->assertNotSame( $a['class'], $c['class'], 'different values, different class' );
	}

	/**
	 * A value that is present but unusable must yield NO class.
	 *
	 * Otherwise the block carries a scoping class with no rule anywhere to
	 * match it — dead markup that invites "what styles this?".
	 *
	 * @return void
	 */
	public function test_responsive_drops_class_when_no_rules_survive() {
		$result = Block_Render::responsive(
			array( 'zealblocks' => array( 'width' => 'expression(alert(1))' ) ),
			'zealblocks',
			array( 'width' => 'width' ),
			'zealblocks-'
		);

		$this->assertSame( '', $result['class'] );
		$this->assertSame( array(), $result['rules'] );
	}

	/**
	 * Nothing stored, nothing emitted.
	 *
	 * @return void
	 */
	public function test_responsive_is_empty_when_unset() {
		foreach ( array( array(), 'nope', null ) as $style ) {
			$result = Block_Render::responsive( $style, 'zealblocks', array( 'width' => 'width' ), 'zealblocks-' );
			$this->assertSame( array( 'class' => '', 'rules' => array() ), $result );
		}
	}

	/**
	 * Typed properties validate with their type, and a pseudo-state property
	 * gets a `:hover` selector and the important flag — the Text block's hover
	 * colours depend on both.
	 *
	 * @return void
	 */
	public function test_responsive_typed_and_hover_properties() {
		$result = Block_Render::responsive(
			array(
				'zealblocks' => array(
					'textShadowX' => '-2px',
					'textHover'   => '#f00',
				),
				'@mobile'    => array( 'zealblocks' => array( 'textHover' => 'url(x)' ) ),
			),
			'zealblocks',
			array(
				'textShadowX' => array( '--zealblocks-text-shadow-x', 'signed-length' ),
				'textHover'   => array( 'color', 'color', ':hover' ),
			),
			'zealblocks-text-'
		);

		$this->assertCount( 2, $result['rules'], 'the unsafe mobile colour is dropped' );

		list( $shadow, $hover ) = $result['rules'];

		$this->assertSame( '.' . $result['class'], $shadow['selector'] );
		$this->assertSame( array( '--zealblocks-text-shadow-x' => '-2px' ), $shadow['declarations'] );
		$this->assertArrayNotHasKey( 'important', $shadow, 'only pseudo-state rules are important' );

		$this->assertSame( '.' . $result['class'] . ':hover', $hover['selector'] );
		$this->assertSame( array( 'color' => '#f00' ), $hover['declarations'] );
		$this->assertTrue( $hover['important'] );
	}

	/**
	 * Only `:hover` is accepted as a pseudo-state; anything else would be
	 * concatenated into a selector.
	 *
	 * @return void
	 */
	public function test_responsive_refuses_unknown_pseudo_states() {
		$result = Block_Render::responsive(
			array( 'zealblocks' => array( 'c' => '#fff' ) ),
			'zealblocks',
			array( 'c' => array( 'color', 'color', ' , body { x' ) ),
			'zealblocks-'
		);

		$this->assertSame( '.' . $result['class'], $result['rules'][0]['selector'] );
		$this->assertArrayNotHasKey( 'important', $result['rules'][0] );
	}

	/**
	 * A list of states becomes a selector list, so a hover colour can also
	 * apply on keyboard focus. Unknown states in the list are dropped, the
	 * known ones kept, and repeats collapse.
	 *
	 * @return void
	 */
	public function test_responsive_accepts_a_list_of_states() {
		$result = Block_Render::responsive(
			array( 'zealblocks' => array( 'c' => '#fff' ) ),
			'zealblocks',
			array( 'c' => array( 'color', 'color', array( ':hover', ':focus', ' , body { x', ':hover', array( ':focus' ) ) ) ),
			'zealblocks-'
		);

		$base = '.' . $result['class'];

		$this->assertSame( $base . ':hover,' . $base . ':focus', $result['rules'][0]['selector'] );
		$this->assertTrue( $result['rules'][0]['important'] );

		$within = Block_Render::responsive(
			array( 'zealblocks' => array( 'c' => '#fff' ) ),
			'zealblocks',
			array( 'c' => array( 'background', 'background', array( ':hover', ':focus-within' ) ) ),
			'zealblocks-'
		);

		$this->assertSame( '.' . $within['class'] . ':hover,.' . $within['class'] . ':focus-within', $within['rules'][0]['selector'] );
	}

	/**
	 * A list holding nothing valid applies the value with no state, exactly
	 * like a single unknown state does.
	 *
	 * @return void
	 */
	public function test_responsive_list_of_unknown_states_falls_back_to_no_state() {
		$result = Block_Render::responsive(
			array( 'zealblocks' => array( 'c' => '#fff' ) ),
			'zealblocks',
			array( 'c' => array( 'color', 'color', array( ':visited', '::before' ) ) ),
			'zealblocks-'
		);

		$this->assertSame( '.' . $result['class'], $result['rules'][0]['selector'] );
		$this->assertArrayNotHasKey( 'important', $result['rules'][0] );
	}

	/**
	 * Angles read as whole degrees, 0 to 359, so equal rotations print
	 * equally and nothing but an integer reaches a style attribute.
	 *
	 * @return void
	 */
	public function test_angle_normalises_to_one_turn() {
		$angle = static function ( $value ) {
			return Block_Render::angle( array( 'a' => $value ), 'a' );
		};

		$this->assertSame( 0, Block_Render::angle( array(), 'a' ) );
		$this->assertSame( 0, Block_Render::angle( 'not an array', 'a' ) );
		$this->assertSame( 45, $angle( 45 ) );
		$this->assertSame( 45, $angle( '45' ) );
		$this->assertSame( 45, $angle( 45.9 ) );
		$this->assertSame( 0, $angle( 360 ) );
		$this->assertSame( 0, $angle( 720 ) );
		$this->assertSame( 270, $angle( -90 ) );
		$this->assertSame( 0, $angle( '45deg;color:red' ) );
		$this->assertSame( 0, $angle( array( 45 ) ) );
		$this->assertSame( 0, $angle( null ) );
	}
}
