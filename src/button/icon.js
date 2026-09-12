/**
 * Button icon — the shared source of truth for markup and choices.
 *
 * The same markup has to come out of `edit.js` and `render.php`, or the editor
 * and the front end disagree about what the icon is. JS gets it from here; PHP
 * gets it from the matching map in render.php. Two copies is one more than
 * ideal, but the alternative — rendering the editor icon from a REST call — is
 * worse for a scratch plugin.
 *
 * Icons are deliberately plain SVG with `currentColor` and no width/height
 * attribute: the size comes from CSS so it can be per-viewport, and the colour
 * follows the button's text colour so core's `color` support keeps working.
 */

import { __ } from '@wordpress/i18n';

/**
 * The icon set. Keys are stored in the `icon` attribute.
 *
 * @type {Object<string, {label: string, path: string}>}
 */
export const ICONS = {
	arrow: {
		label: __( 'Arrow', 'zealblocks' ),
		path: 'M4 10h9.2l-3.6-3.6L11 5l6 5-6 5-1.4-1.4L13.2 10H4z',
	},
	chevron: {
		label: __( 'Chevron', 'zealblocks' ),
		path: 'M7.5 4.5L13 10l-5.5 5.5L6 14l4-4-4-4z',
	},
	download: {
		label: __( 'Download', 'zealblocks' ),
		path: 'M9 3h2v7h3l-4 5-4-5h3zM4 16h12v2H4z',
	},
	external: {
		label: __( 'External', 'zealblocks' ),
		path: 'M11 3h6v6h-2V6.4l-6.3 6.3-1.4-1.4L13.6 5H11zM4 6h4v2H6v6h6v-2h2v4H4z',
	},
};

/**
 * Options for the icon SelectControl, including the "none" case.
 *
 * @type {Array<{label: string, value: string}>}
 */
export const ICON_OPTIONS = [
	{ label: __( 'None', 'zealblocks' ), value: '' },
	...Object.entries( ICONS ).map( ( [ value, { label } ] ) => ( {
		label,
		value,
	} ) ),
];

/**
 * The icon element, or null when the block has no icon.
 *
 * `aria-hidden` because the icon is decorative — the button's own text is the
 * accessible name, and announcing "arrow" after it adds noise for screen-reader
 * users without adding meaning.
 *
 * @param {Object} props
 * @param {string} props.icon Icon key.
 * @return {?Element} The icon, or null.
 */
export const ButtonIcon = ( { icon } ) => {
	if ( ! icon || ! ICONS[ icon ] ) {
		return null;
	}

	return (
		<svg
			className="wp-block-zealblocks-button__icon"
			viewBox="0 0 20 20"
			xmlns="http://www.w3.org/2000/svg"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d={ ICONS[ icon ].path } />
		</svg>
	);
};
