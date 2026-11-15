/**
 * Position — keys, units and options, shared by every block that offers it.
 *
 * The keys MUST match Position::properties() in
 * includes/block/class-position.php; BlockContractTest compares them.
 */

import { __ } from '@wordpress/i18n';

export const POSITION_KEY = 'position';

/** Offset keys, in the order the inspector shows them. */
export const OFFSET_KEYS = [
	'positionTop',
	'positionRight',
	'positionBottom',
	'positionLeft',
];

/** Everything the Position item stores. */
export const POSITION_ITEM_KEYS = [ POSITION_KEY, ...OFFSET_KEYS ];

/** The inline style property for each key, in React's camelCase. */
export const POSITION_STYLE = {
	position: 'position',
	positionTop: 'top',
	positionRight: 'right',
	positionBottom: 'bottom',
	positionLeft: 'left',
};

/** Units for the offsets. Each must pass is_safe_length( $v, true ). */
export const OFFSET_UNITS = [ 'px', '%', 'em', 'rem', 'vw', 'vh' ];

/**
 * Position types. Mirrors Responsive_Styles::KEYWORDS['position']: sticky is
 * core's own position support, and leaving the value unset means static.
 */
export const POSITION_OPTIONS = [
	{ value: '', label: __( 'Default', 'zealblocks' ) },
	{ value: 'relative', label: __( 'Relative', 'zealblocks' ) },
	{ value: 'absolute', label: __( 'Absolute', 'zealblocks' ) },
	{ value: 'fixed', label: __( 'Fixed', 'zealblocks' ) },
];
