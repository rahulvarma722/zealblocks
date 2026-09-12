<?php
/**
 * Turning per-viewport values stored in a block's `style` attribute into
 * style-engine rules.
 *
 * Core generates CSS only for style paths it owns, so a namespaced key such as
 * `style.zealblocks.width` produces nothing on its own — the value round-trips
 * through save and parse untouched, and it is this class that builds the
 * rules for it.
 *
 * The media queries come from Helper::media_queries(), which resolves them from
 * core — `WP_Theme_JSON::get_viewport_media_queries()` is public and documented
 * (`@since 7.1.0`) and reads `settings.viewport` from theme.json. This class is
 * about turning values into rules; where the bands come from is not its business.
 *
 * The bands core returns:
 *
 *   @mobile   @media (width <= 480px)
 *   @tablet   @media (480px < width <= 782px)
 *
 * Note the shape of those bands. They are MUTUALLY EXCLUSIVE ranges, not
 * stacked `max-width` queries, which is what makes mobile fall back to the base
 * layer rather than to tablet. Reimplementing them with `max-width` would
 * silently reintroduce a tablet-into-mobile cascade and disagree with every
 * core control on the same block.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * Builds scoped style-engine rules for namespaced per-viewport style values.
 */
final class Responsive_Styles {

	/**
	 * Read one namespaced value out of a `style` attribute layer.
	 *
	 * @param array   $style     The block's `style` attribute.
	 * @param ?string $state_key `'@tablet'`, `'@mobile'`, or null for the base.
	 * @param string  $namespace_key Namespace key inside the layer.
	 * @param string  $property  Property key inside the namespace.
	 * @return string Value, or '' when unset.
	 */
	public static function get_state_value( $style, $state_key, $namespace_key, $property ) {
		$layer = null === $state_key
			? $style
			: ( isset( $style[ $state_key ] ) ? $style[ $state_key ] : null );

		if ( ! is_array( $layer ) || ! isset( $layer[ $namespace_key ][ $property ] ) ) {
			return '';
		}

		$value = $layer[ $namespace_key ][ $property ];

		return is_scalar( $value ) ? trim( (string) $value ) : '';
	}

	/**
	 * Whether a value is a CSS length or percentage we are willing to print.
	 *
	 * The value reaches us from post content, so it is untrusted even though
	 * only an editor could have written it. An allow-list of
	 * `<number><unit>` is used rather than escaping, because escaping cannot
	 * make `expression(…)` or an unbalanced `)` safe inside a declaration.
	 *
	 * NEGATIVES ARE REJECTED BY DEFAULT. Both properties this currently serves
	 * — `width` and the icon-size custom property, which feeds `width`/`height`
	 * — are non-negative in CSS, so `-50px` is not a value a browser will honour
	 * and emitting it only produces a declaration that is silently discarded.
	 * Rejecting it here means the block drops the rule instead, which is the
	 * same outcome with none of the dead CSS.
	 *
	 * The flag exists because that is a property of the CALLER, not of this
	 * function: reused for `margin` or `text-indent`, where negatives are
	 * meaningful, it should be passed true.
	 *
	 * @param string $value          Candidate value.
	 * @param bool   $allow_negative Whether a leading `-` is acceptable.
	 * @return bool Whether it is safe to emit.
	 */
	public static function is_safe_length( $value, $allow_negative = false ) {
		$sign = $allow_negative ? '-?' : '';

		return 1 === preg_match(
			'/^' . $sign . '(?:\d+\.?\d*|\.\d+)(?:px|%|em|rem|vw|vh)$/',
			(string) $value
		);
	}

	/**
	 * Build style-engine rules for one property across the base and viewport states.
	 *
	 * Returns RULES rather than a CSS string, in the shape
	 * wp_style_engine_get_stylesheet_from_css_rules() accepts:
	 *
	 *   array( 'selector' => '.x', 'declarations' => array( 'width' => '200px' ) )
	 *   array( 'selector' => '.x', 'declarations' => array( 'width' => '100%' ),
	 *          'rules_group' => '@media (width <= 480px)' )
	 *
	 * This is the same shape core's own per-viewport support hands the style
	 * engine (block-supports/states.php). It is what lets the CSS reach the page
	 * through wp_add_inline_style() instead of a style element printed next to
	 * the block: the engine keeps a store per `context`, and core flushes
	 * every store in wp_enqueue_stored_styles() — into the head on block themes,
	 * the footer on classic ones.
	 *
	 * The media query goes into `rules_group` VERBATIM. Core's range syntax —
	 * `@media (480px < width <= 782px)` — contains `<`, and both
	 * wp_strip_all_tags() and esc_attr() mangle it; the style engine takes it as
	 * data, so nothing here needs to escape it and nothing may.
	 *
	 * Pure: no WordPress function is called, so this runs in the unit suite
	 * without a WordPress install. The engine call belongs in the render
	 * template, where WordPress is loaded.
	 *
	 * @param array  $style     The block's `style` attribute.
	 * @param string $selector  CSS selector to scope every rule to.
	 * @param string $namespace_key Namespace key inside each layer.
	 * @param string $property  Key inside the namespace.
	 * @param string $css_prop  The CSS property to emit.
	 * @return array<int, array{selector: string, declarations: array<string, string>, rules_group?: string}>
	 */
	public static function build_rules( $style, $selector, $namespace_key, $property, $css_prop ) {
		if ( ! is_array( $style ) ) {
			return array();
		}

		$rules = array();

		// Base layer first: it carries no media query and therefore applies at
		// every width, which is what makes Desktop the base rather than a
		// third band.
		$base = self::get_state_value( $style, null, $namespace_key, $property );

		if ( '' !== $base && self::is_safe_length( $base ) ) {
			$rules[] = array(
				'selector'     => $selector,
				'declarations' => array( $css_prop => $base ),
			);
		}

		/*
		 * Then the states, in the order core returns them. Because the bands
		 * are mutually exclusive ranges there is no specificity race between
		 * them, so this order is for readability rather than correctness — but
		 * it keeps the output diffable against core's.
		 */
		foreach ( Helper::media_queries() as $state_key => $media_query ) {
			$value = self::get_state_value( $style, $state_key, $namespace_key, $property );

			if ( '' === $value || ! self::is_safe_length( $value ) ) {
				continue;
			}

			$rules[] = array(
				'selector'     => $selector,
				'declarations' => array( $css_prop => $value ),
				'rules_group'  => $media_query,
			);
		}

		return $rules;
	}
}
