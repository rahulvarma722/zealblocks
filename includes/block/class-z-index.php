<?php
/**
 * Z-index, shared by every block that opts in.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

defined( 'ABSPATH' ) || exit;

/**
 * The z-index value, per viewport, and the class that makes it take effect.
 *
 * Matches Spectra Free's Z-Index extension: a range of −100 to 1000, and a
 * block that is not otherwise positioned becomes `position: relative`, since
 * a z-index does nothing on a static box. That `position: relative` comes from
 * the stylesheet (the base() mixin in src/shared/z-index/_z-index.scss) at zero
 * added specificity, so a position chosen in a block's own Position panel
 * always wins over it.
 *
 * A block opts in by adding `Z_Index::KEY => Z_Index::PROPERTY` to the
 * property map it passes Block_Render::responsive(), and merging classes() into
 * its wrapper classes. The value is stored in core's viewport-state shape
 * (`style.zealblocks.zIndex`, `style['@tablet'].zealblocks.zIndex`, …), like
 * every other per-device value, so no block.json attribute is needed.
 */
final class Z_Index {

	/**
	 * Key under `style.zealblocks`.
	 */
	const KEY = 'zIndex';

	/**
	 * Entry for a Block_Render::responsive() property map: the CSS property
	 * and its type. `integer` allows a sign and up to six digits
	 * (Responsive_Styles::is_safe_integer()), so an injected value is dropped.
	 *
	 * @var string[]
	 */
	const PROPERTY = array( 'z-index', 'integer' );

	/**
	 * The class that switches on `position: relative`. Namespaced: Spectra
	 * ships a global `.has-z-index.has-z-index { z-index: var(--spectra-z-index,
	 * auto) !important }`, which flattened a generic class to `auto` on any
	 * site running both plugins.
	 */
	const CLASS_NAME = 'has-zealblocks-z-index';

	/**
	 * The editor's range, as Spectra Free's. MUST match Z_INDEX_RANGE in
	 * src/shared/z-index/constants.js; BlockContractTest compares them. Not
	 * enforced on render, where any safe integer is kept.
	 */
	const MIN = -100;
	const MAX = 1000;

	/**
	 * The wrapper class, if any rule that survived validation sets a z-index.
	 *
	 * Derived from the RULES rather than the stored values, so a block never
	 * carries the class when its value was dropped as unsafe.
	 *
	 * @param array $rules The `rules` returned by Block_Render::responsive().
	 * @return string[]
	 */
	public static function classes( $rules ) {
		foreach ( (array) $rules as $rule ) {
			if ( isset( $rule['declarations'] ) && is_array( $rule['declarations'] ) && array_key_exists( self::PROPERTY[0], $rule['declarations'] ) ) {
				return array( self::CLASS_NAME );
			}
		}

		return array();
	}
}
