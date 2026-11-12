/**
 * Display conditions — values shared by every block that opts in.
 */

import { __ } from '@wordpress/i18n';

/**
 * Choices for the selects and the day list. Values MUST match
 * Display_Conditions::BROWSERS, ::SYSTEMS and ::DAYS; BlockContractTest
 * compares them.
 */
export const BROWSER_OPTIONS = [
	{ value: '', label: __( 'None', 'zealblocks' ) },
	{ value: 'chrome', label: 'Chrome' },
	{ value: 'firefox', label: 'Firefox' },
	{ value: 'safari', label: 'Safari' },
	{ value: 'edge', label: 'Edge' },
	{ value: 'opera', label: 'Opera' },
];

export const OS_OPTIONS = [
	{ value: '', label: __( 'None', 'zealblocks' ) },
	{ value: 'ios', label: 'iOS' },
	{ value: 'android', label: 'Android' },
	{ value: 'windows', label: 'Windows' },
	{ value: 'mac_os', label: 'macOS' },
	{ value: 'linux', label: 'Linux' },
	{ value: 'open_bsd', label: 'OpenBSD' },
	{ value: 'sun_os', label: 'SunOS' },
];

export const DAY_OPTIONS = [
	{ value: 'monday', label: __( 'Monday', 'zealblocks' ) },
	{ value: 'tuesday', label: __( 'Tuesday', 'zealblocks' ) },
	{ value: 'wednesday', label: __( 'Wednesday', 'zealblocks' ) },
	{ value: 'thursday', label: __( 'Thursday', 'zealblocks' ) },
	{ value: 'friday', label: __( 'Friday', 'zealblocks' ) },
	{ value: 'saturday', label: __( 'Saturday', 'zealblocks' ) },
	{ value: 'sunday', label: __( 'Sunday', 'zealblocks' ) },
];
