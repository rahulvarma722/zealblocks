<?php
/**
 * Per-device position, shared.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

defined( 'ABSPATH' ) || exit;

/**
 * The position type and its offsets, for a block's Render::responsive() map.
 *
 * Real declarations per band, like z-index: `position` from an allow-list
 * (relative, absolute, fixed; sticky is core's own support) and the four
 * offsets as signed lengths. Text offers it with its overflow and z-index;
 * a nested Container offers it as a child setting.
 *
 * The keys MUST match src/shared/position/constants.js; BlockContractTest
 * compares them.
 */
final class Position {

	/**
	 * Style keys => CSS property and value type, in the editor's order.
	 *
	 * @var array<string, string[]>
	 */
	const PROPERTIES = array(
		'position'       => array( 'position', 'position' ),
		'positionTop'    => array( 'top', 'signed-length' ),
		'positionRight'  => array( 'right', 'signed-length' ),
		'positionBottom' => array( 'bottom', 'signed-length' ),
		'positionLeft'   => array( 'left', 'signed-length' ),
	);

	/**
	 * The map entries, for spreading into a responsive() map.
	 *
	 * @return array<string, string[]>
	 */
	public static function properties() {
		return self::PROPERTIES;
	}
}
