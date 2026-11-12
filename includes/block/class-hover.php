<?php
/**
 * Hover colours, shared by every block that opts in.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

defined( 'ABSPATH' ) || exit;

/**
 * Text and background hover colours, per viewport, with a transition.
 *
 * The colours are REAL DECLARATIONS under the hover selector, marked important,
 * never custom properties. A variable the active band does not define would
 * make `color: var(--x)` invalid at computed-value time and reset the colour
 * to its inherited value on hover, so a Mobile-only hover colour would break
 * hover on Desktop. A rule that simply does not exist outside its band has no
 * such failure. Important, as core marks its own state rules, because a hover
 * colour must beat the inline `color` and the `.has-x-color { … !important }`
 * preset class core puts on the same element.
 *
 * Each block chooses the states its colours apply in. Text uses `:hover`
 * alone. A link or button adds `:focus`, and a container whose child takes
 * focus adds `:focus-within`, so a keyboard user sees what a mouse user sees,
 * as Spectra does.
 *
 * A block opts in by spreading properties() into the map it passes
 * Block_Render::responsive(), merging classes() into its wrapper classes, and
 * including the SCSS mixins in src/shared/hover/_hover.scss. See
 * docs/hover.md.
 */
final class Hover {

	/**
	 * Keys under `style.zealblocks`. MUST match HOVER_KEYS in
	 * src/shared/hover/constants.js; BlockContractTest compares them.
	 */
	const TEXT       = 'textHover';
	const BACKGROUND = 'backgroundHover';
	const DURATION   = 'hoverDuration';

	/**
	 * The class that switches on the transition. MUST match HOVER_CLASS.
	 */
	const CLASS_NAME = 'has-hover';

	/**
	 * Entries for a Block_Render::responsive() property map, in the order a
	 * block's map has always listed them: duration, text, background.
	 *
	 * The duration is a custom property, not a declaration: it is read by
	 * the transition in the stylesheet, and an undefined one falls back to
	 * 0.2s there, which is exactly what a band without a value should get.
	 *
	 * @param string          $var_prefix The block's hover variable prefix, e.g.
	 *                                    `--zealblocks-text-hover-`; the duration
	 *                                    is `{$var_prefix}duration`.
	 * @param string|string[] $states     State or states the colours apply in;
	 *                                    see Render::PSEUDO_STATES.
	 * @return array<string, string[]>
	 */
	public static function properties( $var_prefix, $states = ':hover' ) {
		return array(
			self::DURATION   => array( $var_prefix . 'duration', 'time' ),
			self::TEXT       => array( 'color', 'color', $states ),
			self::BACKGROUND => array( 'background', 'background', $states ),
		);
	}

	/**
	 * The wrapper class, if any hover rule survived validation.
	 *
	 * Derived from the RULES, so an unsafe colour that was dropped leaves no
	 * class behind, and from every band together, so the transition is on in
	 * each band once any band has a hover colour.
	 *
	 * @param array $rules The `rules` returned by Block_Render::responsive().
	 * @return string[]
	 */
	public static function classes( $rules ) {
		foreach ( (array) $rules as $rule ) {
			if ( isset( $rule['selector'] ) && is_string( $rule['selector'] ) && false !== strpos( $rule['selector'], ':hover' ) ) {
				return array( self::CLASS_NAME );
			}
		}

		return array();
	}
}
