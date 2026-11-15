<?php
/**
 * Reverse order for a flex layout, per device.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Helper;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a per-device "reverse order" flag into `flex-direction` rules.
 *
 * Reversing cannot be a single class. The direction it reverses comes from
 * core's layout, and core 7.1 can change that per device: a Row is horizontal
 * on desktop and may be vertical on mobile (`style['@mobile'].layout`). A rule
 * saying `row-reverse` everywhere would undo core's mobile `column`.
 *
 * So once any band is reversed, every band gets an explicit direction, worked
 * out from that band's own orientation and reverse flag. Mobile falls back to
 * the base layer, never to Tablet, exactly as core's viewport states do. The
 * rules are important, to win over core's layout rule for the same element.
 *
 * Only flex layouts are reversed. A grid has no direction to flip, and its
 * visual order is set per child instead.
 */
final class Reverse_Order {

	/**
	 * The key under `style.zealblocks`, on each layer. MUST match
	 * REVERSE_KEY in src/container/constants.js.
	 */
	const KEY = 'reverse';

	/**
	 * The scoping class and its rules, or neither when nothing is reversed.
	 *
	 * The same shape as Render::responsive(), and for the same reason: the
	 * class is derived from the rules, so two containers that reverse the same
	 * way share one stored rule, and two that differ never share a class. It
	 * cannot reuse responsive()'s class, which hashes `style` alone, while these
	 * rules also depend on core's `layout` attribute.
	 *
	 * @param mixed  $layout       The block's `layout` attribute (the base layer).
	 * @param mixed  $style        The block's `style` attribute.
	 * @param string $class_prefix Prefix for the generated class name.
	 * @return array{class: string, rules: array[]} Rules for Render::store_rules().
	 */
	public static function responsive( $layout, $style, $class_prefix ) {
		$empty  = array(
			'class' => '',
			'rules' => array(),
		);
		$layout = is_array( $layout ) ? $layout : array();
		$style  = is_array( $style ) ? $style : array();

		if ( 'flex' !== ( $layout['type'] ?? '' ) ) {
			return $empty;
		}

		$base_reverse     = self::flag( $style, false );
		$base_orientation = self::orientation( $layout, 'horizontal' );
		$queries          = Helper::media_queries();
		$bands            = array( '' => array( $base_reverse, $base_orientation ) );

		foreach ( array_keys( $queries ) as $state ) {
			$layer = isset( $style[ $state ] ) && is_array( $style[ $state ] ) ? $style[ $state ] : array();

			$bands[ $state ] = array(
				self::flag( $layer, $base_reverse ),
				isset( $layer['layout'] ) && is_array( $layer['layout'] )
					? self::orientation( $layer['layout'], $base_orientation )
					: $base_orientation,
			);
		}

		if ( ! in_array( true, array_column( $bands, 0 ), true ) ) {
			return $empty;
		}

		$class = $class_prefix . substr( md5( (string) wp_json_encode( $bands ) ), 0, 8 );
		$rules = array();

		foreach ( $bands as $state => $band ) {
			list( $reverse, $orientation ) = $band;

			$rule = array(
				'selector'     => '.' . $class,
				'declarations' => array(
					'flex-direction' => ( 'vertical' === $orientation ? 'column' : 'row' ) . ( $reverse ? '-reverse' : '' ),
				),
				'important'    => true,
			);

			if ( '' !== $state ) {
				$rule['rules_group'] = $queries[ $state ];
			}

			$rules[] = $rule;
		}

		return array(
			'class' => $class,
			'rules' => $rules,
		);
	}

	/**
	 * A layer's reverse flag, or the fallback when the layer does not set one.
	 *
	 * Only boolean true reverses. An explicit false on a layer is kept, so a
	 * reversed desktop can be put back in order on mobile.
	 *
	 * @param array $layer    A style layer (the base, or `@tablet` / `@mobile`).
	 * @param bool  $fallback Value when the layer is silent.
	 * @return bool
	 */
	private static function flag( $layer, $fallback ) {
		if ( isset( $layer['zealblocks'] ) && is_array( $layer['zealblocks'] ) && array_key_exists( self::KEY, $layer['zealblocks'] ) ) {
			return true === $layer['zealblocks'][ self::KEY ];
		}

		return $fallback;
	}

	/**
	 * A layout's orientation, or the fallback when it does not set one.
	 *
	 * @param array  $layout   A layout array.
	 * @param string $fallback 'horizontal' or 'vertical'.
	 * @return string
	 */
	private static function orientation( $layout, $fallback ) {
		$value = $layout['orientation'] ?? null;

		return in_array( $value, array( 'horizontal', 'vertical' ), true ) ? $value : $fallback;
	}
}
