<?php
/**
 * Shared helpers for block render templates.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Responsive_Styles;

defined( 'ABSPATH' ) || exit;

/**
 * The parts of a render template that every block repeats.
 *
 * Why this exists: `button/render.php` reached 408 lines with 23 escaping call
 * sites, and roughly half of that was not about buttons at all: reading an
 * attribute with a default, narrowing a value to an allow-list, deriving a
 * per-instance class from stored values, building the per-viewport rules the
 * style engine takes. At two blocks that is tolerable duplication. At twenty it is
 * twenty places for the same sanitising bug to hide, and twenty places to fix
 * it.
 *
 * Extracted at block three rather than block ten, deliberately: the shape of
 * the duplication is already clear, and the cost of moving it later grows with
 * every block added.
 *
 * All static, and that is correct here. Unlike the feature modules, these are
 * pure functions — same input, same output, no state, no hooks, nothing to
 * inject or fake. Making them instance methods would add ceremony and buy
 * nothing; see the note in interface-module.php for where instances DO earn
 * their keep.
 */
final class Render {

	/**
	 * Reads one attribute as a trimmed string.
	 *
	 * Every render template opens with a run of
	 * `isset( $attributes['x'] ) ? $attributes['x'] : ''`, which is noise that
	 * hides the one line among them that does something different.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $key        Attribute name.
	 * @param string $fallback   Value when absent or not scalar.
	 * @return string
	 */
	public static function text( $attributes, $key, $fallback = '' ) {
		if ( ! is_array( $attributes ) || ! isset( $attributes[ $key ] ) ) {
			return $fallback;
		}

		$value = $attributes[ $key ];

		return is_scalar( $value ) ? trim( (string) $value ) : $fallback;
	}

	/**
	 * Narrows a value to an allow-list.
	 *
	 * An allow-list rather than escaping wherever the set of meaningful values
	 * is finite and known. Escaping makes a value safe to PRINT; it does
	 * nothing about a value that is safe but meaningless, and those cause
	 * bugs that look like CSS or browser problems rather than data problems.
	 *
	 * @param string   $value    Candidate.
	 * @param string[] $allowed  Permitted values.
	 * @param string   $fallback Returned when $value is not permitted.
	 * @return string
	 */
	public static function one_of( $value, $allowed, $fallback = '' ) {
		return in_array( $value, (array) $allowed, true ) ? $value : $fallback;
	}

	/**
	 * Filters a space-separated token list against an allow-list.
	 *
	 * Whole tokens, not characters. Stripping disallowed characters is not
	 * enough: `noopener"><script>alert(1)</script>` reduces to
	 * `noopenerscriptalert1script`, which is perfectly safe to print and
	 * completely meaningless to a browser.
	 *
	 * @param string   $value   Space-separated tokens.
	 * @param string[] $allowed Permitted tokens, lowercase.
	 * @return string Surviving tokens, space-separated and de-duplicated.
	 */
	public static function tokens( $value, $allowed ) {
		$value = strtolower( trim( (string) $value ) );

		if ( '' === $value ) {
			return '';
		}

		$found = (array) preg_split( '/\s+/', $value, -1, PREG_SPLIT_NO_EMPTY );

		return implode( ' ', array_unique( array_intersect( $found, (array) $allowed ) ) );
	}

	/**
	 * Escapes a URL, returning '' when it is not usable.
	 *
	 * The return value is the thing to branch on, not the input. esc_url()
	 * does not merely escape — it DROPS the value when the scheme is not
	 * allow-listed, so `javascript:alert(1)` comes back as ''. Testing the raw
	 * value for emptiness instead lets a hostile URL through and emits
	 * `<a href="">`: an anchor with no destination, which is not keyboard
	 * focusable and is exactly what such a branch usually exists to avoid.
	 *
	 * @param string $url Raw URL from block attributes.
	 * @return string Escaped URL, or '' when unusable.
	 */
	public static function url( $url ) {
		$url = trim( (string) $url );

		return '' === $url ? '' : esc_url( $url );
	}

	/**
	 * Pseudo-states a responsive() property may apply in.
	 *
	 * An allow-list, because the state is concatenated into a selector: a
	 * stored `' , body { x'` would otherwise style the whole page. Hover
	 * colours use `:hover` and, for keyboard users, a focus state: `:focus` on
	 * a link or button, `:focus-within` on a container whose child takes focus.
	 *
	 * @var string[]
	 */
	const PSEUDO_STATES = array( ':hover', ':focus', ':focus-visible', ':focus-within' );

	/**
	 * A selector for a base selector in one or more pseudo-states.
	 *
	 * For example:
	 *
	 *     state_selector( '.x', ':hover' )                    // .x:hover
	 *     state_selector( '.x', array( ':hover', ':focus' ) ) // .x:hover,.x:focus
	 *
	 * States not in PSEUDO_STATES are dropped, and with none left the base
	 * selector comes back unchanged, so the value applies with no state rather
	 * than to a selector nobody wrote.
	 *
	 * @param string          $base   Base selector.
	 * @param string|string[] $states One state or a list.
	 * @return string
	 */
	private static function state_selector( $base, $states ) {
		$states = array_filter( (array) $states, 'is_string' );
		$valid  = array_values( array_unique( array_intersect( $states, self::PSEUDO_STATES ) ) );

		if ( ! $valid ) {
			return $base;
		}

		return implode(
			',',
			array_map(
				static function ( $state ) use ( $base ) {
					return $base . $state;
				},
				$valid
			)
		);
	}

	/**
	 * Builds per-instance style-engine rules for namespaced per-viewport values.
	 *
	 * Returns the scoping class and the rules together, because neither is
	 * useful alone and deriving them separately is how they drift: a class
	 * emitted with no matching rule, or a rule scoped to a class the block
	 * does not carry.
	 *
	 * The class is derived from the VALUES, so two blocks holding identical
	 * values collapse onto one rule rather than emitting a near-duplicate
	 * each. It is dropped entirely when nothing passed validation, so the
	 * block never carries a class nothing matches.
	 *
	 * @param array  $style       The block's `style` attribute.
	 * @param string $namespace_key   Namespace key inside each layer.
	 * @param array  $properties  Map of style key => CSS property to emit, or
	 *                            style key => array( CSS property, value type,
	 *                            pseudo-states ) where the type is one
	 *                            Responsive_Styles::is_safe_value() knows and the
	 *                            optional pseudo-states are one of
	 *                            self::PSEUDO_STATES or a list of them, e.g.
	 *                            array( ':hover', ':focus' ). A bare string
	 *                            means a non-negative length.
	 * @param string $class_prefix Prefix for the generated class name.
	 * The rules are in the shape wp_style_engine_get_stylesheet_from_css_rules()
	 * accepts; the caller hands them to the engine, which is what routes them
	 * through wp_add_inline_style() rather than an inline style element.
	 *
	 * @return array{class: string, rules: array}
	 */
	public static function responsive( $style, $namespace_key, $properties, $class_prefix ) {
		$empty = array(
			'class' => '',
			'rules' => array(),
		);

		if ( ! is_array( $style ) || empty( $properties ) ) {
			return $empty;
		}

		// Every stored value across every state, in a stable order, so the
		// signature is deterministic for a given set of values.
		$stored = array();

		foreach ( array_keys( $properties ) as $property_key ) {
			foreach ( array( null, '@tablet', '@mobile' ) as $state_key ) {
				$stored[] = Responsive_Styles::get_state_value( $style, $state_key, $namespace_key, $property_key );
			}
		}

		if ( '' === implode( '', $stored ) ) {
			return $empty;
		}

		$class = $class_prefix . substr( md5( (string) wp_json_encode( $stored ) ), 0, 8 );
		$rules = array();

		foreach ( $properties as $property_key => $target ) {
			// A bare string is a CSS property holding a length — the shape every
			// caller used before value types existed. An array adds the type,
			// and optionally a pseudo-state.
			$target       = is_array( $target ) ? $target : array( $target );
			$css_property = $target[0];
			$type         = isset( $target[1] ) ? $target[1] : 'length';
			$selector     = self::state_selector( '.' . $class, isset( $target[2] ) ? $target[2] : array() );
			$is_state     = '.' . $class !== $selector;

			$property_rules = Responsive_Styles::build_rules( $style, $selector, $namespace_key, $property_key, $css_property, $type );

			/*
			 * A pseudo-state rule is marked important, as core marks its own
			 * state rules (block-supports/states.php): a hover colour has to beat
			 * the inline `color` and the `.has-x-color { … !important }` preset
			 * class core puts on the same element. The flag travels as data;
			 * engine_rules() turns it into the style engine's `important` option.
			 */
			if ( $is_state ) {
				foreach ( $property_rules as $index => $rule ) {
					$property_rules[ $index ]['important'] = true;
				}
			}

			$rules = array_merge( $rules, $property_rules );
		}

		// Values that failed is_safe_length() produce no rules. Without this the
		// block would carry a scoping class with no rule anywhere to match it.
		if ( ! $rules ) {
			return $empty;
		}

		return array(
			'class' => $class,
			'rules' => $rules,
		);
	}

	/**
	 * Hands responsive() rules to the style engine, honouring `important`.
	 *
	 * The engine only appends `!important` through a declarations object's
	 * `important` option — the same route core's states support takes — so a
	 * rule flagged important is rebuilt as one. The flag is not something the
	 * engine's rule array understands, so it is removed either way.
	 *
	 * Lives apart from responsive() because it needs WordPress loaded, while
	 * responsive() stays pure and unit-testable.
	 *
	 * @param array $rules Rules from responsive().
	 * @return void
	 */
	public static function store_rules( $rules ) {
		if ( ! $rules ) {
			return;
		}

		foreach ( $rules as $index => $rule ) {
			if ( empty( $rule['important'] ) ) {
				unset( $rules[ $index ]['important'] );
				continue;
			}

			$declarations = new \WP_Style_Engine_CSS_Declarations();

			foreach ( $rule['declarations'] as $property => $value ) {
				$declarations->add_declaration( $property, $value, array( 'important' => true ) );
			}

			$rules[ $index ]['declarations'] = $declarations;
			unset( $rules[ $index ]['important'] );
		}

		wp_style_engine_get_stylesheet_from_css_rules(
			array_values( $rules ),
			array(
				'context'  => 'zealblocks',
				'prettify' => false,
			)
		);
	}

	/**
	 * Inline formatting permitted in a short user-facing label.
	 *
	 * A CONSTANT rather than a `label()` wrapper, deliberately. Wrapping
	 * wp_kses() in a helper hides the escaping from PHPCS — the sniff sees a
	 * static method call and reports unescaped output — which would trade one
	 * duplicated-escaping problem for a phpcs:ignore at every call site. It
	 * also makes a reviewer take the escaping on trust.
	 *
	 * Sharing the ALLOW-LIST instead gives the same single source of truth
	 * while `wp_kses()` stays visible where the output happens:
	 *
	 *     wp_kses( $text, Block_Render::LABEL_HTML )
	 *
	 * Note what is absent. wp_kses_post() is the filter for post BODIES, so it
	 * permits <img> and <a> — neither belongs in a button label, and a nested
	 * <a> inside a link is invalid HTML that browsers recover from
	 * unpredictably.
	 *
	 * The Text block is body text, so it uses wp_kses_post() instead. Running
	 * it through this list stripped links, highlights and inline images from
	 * the front end (see src/text/render.php).
	 *
	 * A block whose RichText sets `allowedFormats={ [] }` cannot produce any
	 * markup here at all; this list is what survives if that is ever relaxed to
	 * basic formatting, and nothing wider can slip through in the meantime.
	 *
	 * @var array<string, array>
	 */
	const LABEL_HTML = array(
		'strong' => array(),
		'b'      => array(),
		'em'     => array(),
		'i'      => array(),
		's'      => array(),
		'sub'    => array(),
		'sup'    => array(),
		'code'   => array(),
		'br'     => array(),
	);
}
