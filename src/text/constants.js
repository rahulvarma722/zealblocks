/**
 * Text — shared constants.
 */

import { __ } from '@wordpress/i18n';

/**
 * Visual style presets, independent of the HTML tag.
 *
 * THE POINT OF THIS BLOCK. Core couples a heading's level to its appearance:
 * pick `h2` and you get h2's size. That forces a choice between a correct
 * document outline and the design you want, and the outline usually loses.
 *
 * Each preset resolves to a CSS custom property in style.scss, which prefers
 * the ACTIVE THEME's font-size preset and falls back to a sensible value. So a
 * theme with a proper type scale drives the look, and a theme without one still
 * renders something reasonable.
 *
 * `value` becomes a `has-style-<value>` class. Keep the values stable — they
 * are written into post content.
 */
export const STYLE_PRESETS = [
	{ value: '', label: __( 'Default (follow the tag)', 'zealblocks' ) },
	{ value: 'display', label: __( 'Display', 'zealblocks' ) },
	{ value: 'h1', label: __( 'Heading 1', 'zealblocks' ) },
	{ value: 'h2', label: __( 'Heading 2', 'zealblocks' ) },
	{ value: 'h3', label: __( 'Heading 3', 'zealblocks' ) },
	{ value: 'h4', label: __( 'Heading 4', 'zealblocks' ) },
	{ value: 'h5', label: __( 'Heading 5', 'zealblocks' ) },
	{ value: 'h6', label: __( 'Heading 6', 'zealblocks' ) },
	{ value: 'lead', label: __( 'Lead', 'zealblocks' ) },
	{ value: 'body', label: __( 'Body', 'zealblocks' ) },
	{ value: 'caption', label: __( 'Caption', 'zealblocks' ) },
	{ value: 'eyebrow', label: __( 'Eyebrow', 'zealblocks' ) },
];

/**
 * HTML tags the block may render as, grouped for the picker.
 *
 * MUST match the enum in block.json and the allow-list in render.php. The tag
 * lands in an element position on the front end, so render.php's list is the
 * security boundary; this one only decides what the picker offers.
 *
 * Spectra's list. Some of these are only valid inside a particular parent —
 * `li` in a list, `dt`/`dd` in a `dl`, `summary` in `details`, `caption` in a
 * table, `legend` in a fieldset — which is why they sit in their own group.
 */
export const TAG_GROUPS = [
	{
		label: __( 'Common', 'zealblocks' ),
		options: [
			{ value: 'p', label: __( 'Paragraph', 'zealblocks' ) },
			{ value: 'h1', label: __( 'Heading 1', 'zealblocks' ) },
			{ value: 'h2', label: __( 'Heading 2', 'zealblocks' ) },
			{ value: 'h3', label: __( 'Heading 3', 'zealblocks' ) },
			{ value: 'h4', label: __( 'Heading 4', 'zealblocks' ) },
			{ value: 'h5', label: __( 'Heading 5', 'zealblocks' ) },
			{ value: 'h6', label: __( 'Heading 6', 'zealblocks' ) },
			{ value: 'div', label: __( 'Div', 'zealblocks' ) },
			{ value: 'span', label: __( 'Span', 'zealblocks' ) },
			{ value: 'blockquote', label: __( 'Blockquote', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Semantic', 'zealblocks' ),
		options: [
			{ value: 'address', label: __( 'Address', 'zealblocks' ) },
			{ value: 'cite', label: __( 'Cite', 'zealblocks' ) },
			{ value: 'time', label: __( 'Time', 'zealblocks' ) },
			{ value: 'label', label: __( 'Label', 'zealblocks' ) },
			{ value: 'figcaption', label: __( 'Figcaption', 'zealblocks' ) },
			{ value: 'pre', label: __( 'Pre', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Inline', 'zealblocks' ),
		options: [
			{ value: 'strong', label: __( 'Strong', 'zealblocks' ) },
			{ value: 'em', label: __( 'Em', 'zealblocks' ) },
			{ value: 'small', label: __( 'Small', 'zealblocks' ) },
			{ value: 'mark', label: __( 'Mark', 'zealblocks' ) },
			{ value: 'del', label: __( 'Del', 'zealblocks' ) },
			{ value: 'ins', label: __( 'Ins', 'zealblocks' ) },
			{ value: 'sub', label: __( 'Sub', 'zealblocks' ) },
			{ value: 'sup', label: __( 'Sup', 'zealblocks' ) },
			{ value: 'abbr', label: __( 'Abbr', 'zealblocks' ) },
			{ value: 'code', label: __( 'Code', 'zealblocks' ) },
			{ value: 'kbd', label: __( 'Kbd', 'zealblocks' ) },
			{ value: 'samp', label: __( 'Samp', 'zealblocks' ) },
			{ value: 'var', label: __( 'Var', 'zealblocks' ) },
			{ value: 'output', label: __( 'Output', 'zealblocks' ) },
			{ value: 'q', label: __( 'Q', 'zealblocks' ) },
			{ value: 's', label: __( 'S', 'zealblocks' ) },
			{ value: 'dfn', label: __( 'Dfn', 'zealblocks' ) },
			{ value: 'bdi', label: __( 'Bdi', 'zealblocks' ) },
			{ value: 'bdo', label: __( 'Bdo', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Needs a specific parent', 'zealblocks' ),
		options: [
			{ value: 'li', label: __( 'LI', 'zealblocks' ) },
			{ value: 'dt', label: __( 'DT', 'zealblocks' ) },
			{ value: 'dd', label: __( 'DD', 'zealblocks' ) },
			{ value: 'summary', label: __( 'Summary', 'zealblocks' ) },
			{ value: 'caption', label: __( 'Caption', 'zealblocks' ) },
			{ value: 'legend', label: __( 'Legend', 'zealblocks' ) },
		],
	},
];

/**
 * The common tags only — what the toolbar menu offers. The full list is in
 * the Settings panel; 41 entries in a toolbar dropdown would bury the ten
 * anyone picks from there.
 */
export const TAG_OPTIONS = TAG_GROUPS[ 0 ].options;

/**
 * Every tag, flat.
 */
export const ALL_TAGS = TAG_GROUPS.flatMap( ( group ) =>
	group.options.map( ( option ) => option.value )
);

export const DEFAULT_TAG = 'p';

/**
 * Tags a drop cap works on. `::first-letter` has no effect on an inline
 * element, so span is excluded. Mirrors render.php.
 */
export const DROP_CAP_TAGS = [ 'p', 'div', 'blockquote' ];

/**
 * Keys under `style.zealblocks`, one per per-viewport value.
 *
 * Stored in core's viewport-state shape, exactly like the Button's width — see
 * src/button/responsive-width/constants.js for why.
 */
export const KEYS = {
	columnGap: 'columnGap',
	shadowX: 'textShadowX',
	shadowY: 'textShadowY',
	shadowBlur: 'textShadowBlur',
	shadowColor: 'textShadowColor',
	textHover: 'textHover',
	backgroundHover: 'backgroundHover',
	hoverDuration: 'hoverDuration',
	zIndex: 'zIndex',
	position: 'position',
	top: 'positionTop',
	right: 'positionRight',
	bottom: 'positionBottom',
	left: 'positionLeft',
	overflow: 'overflow',
};

export const OFFSET_KEYS = [ KEYS.top, KEYS.right, KEYS.bottom, KEYS.left ];

export const POSITION_KEYS = [ KEYS.position, ...OFFSET_KEYS, KEYS.overflow ];

export const SHADOW_KEYS = [
	KEYS.shadowX,
	KEYS.shadowY,
	KEYS.shadowBlur,
	KEYS.shadowColor,
];

/**
 * What a shadow starts as when one is first added.
 *
 * The stylesheet's own fallbacks draw nothing, deliberately (see style.scss),
 * so without seeding, picking only a colour would produce an invisible shadow.
 * These are Spectra's "subtle" values.
 */
export const SHADOW_DEFAULTS = {
	[ KEYS.shadowX ]: '1px',
	[ KEYS.shadowY ]: '1px',
	[ KEYS.shadowBlur ]: '2px',
	[ KEYS.shadowColor ]: 'rgba(0, 0, 0, 0.3)',
};

/**
 * Prefix of Text's hover variables. MUST match the prefix render.php passes
 * to Hover::properties() and the one style.scss and editor.scss pass to the
 * hover mixins.
 */
export const HOVER_VAR_PREFIX = '--zealblocks-text-hover-';

/**
 * Custom properties the root carries. render.php writes the same names.
 */
export const CSS_VARS = {
	[ KEYS.shadowX ]: '--zealblocks-text-shadow-x',
	[ KEYS.shadowY ]: '--zealblocks-text-shadow-y',
	[ KEYS.shadowBlur ]: '--zealblocks-text-shadow-blur',
	[ KEYS.shadowColor ]: '--zealblocks-text-shadow-color',
	[ KEYS.hoverDuration ]: `${ HOVER_VAR_PREFIX }duration`,
	// Editor only: the front end emits real `:hover` rules instead.
	[ KEYS.textHover ]: `${ HOVER_VAR_PREFIX }color`,
	[ KEYS.backgroundHover ]: `${ HOVER_VAR_PREFIX }background`,
};

/**
 * Units for column gap. Each must pass Responsive_Styles::is_safe_length().
 */
export const GAP_UNITS = [ 'px', 'em', 'rem', '%', 'vw' ];

/**
 * Units for position offsets. Each must pass is_safe_length( $v, true ).
 */
export const OFFSET_UNITS = [ 'px', '%', 'em', 'rem', 'vw', 'vh' ];

/**
 * Position types. Mirrors Responsive_Styles::KEYWORDS — sticky is core's own
 * position support, and leaving the value unset means static.
 */
export const POSITION_OPTIONS = [
	{ value: '', label: __( 'Default', 'zealblocks' ) },
	{ value: 'relative', label: __( 'Relative', 'zealblocks' ) },
	{ value: 'absolute', label: __( 'Absolute', 'zealblocks' ) },
	{ value: 'fixed', label: __( 'Fixed', 'zealblocks' ) },
];

export const OVERFLOW_OPTIONS = [
	{ value: '', label: __( 'Default', 'zealblocks' ) },
	{ value: 'visible', label: __( 'Visible', 'zealblocks' ) },
	{ value: 'hidden', label: __( 'Hidden', 'zealblocks' ) },
	{ value: 'auto', label: __( 'Auto (scroll when needed)', 'zealblocks' ) },
	{ value: 'clip', label: __( 'Clip', 'zealblocks' ) },
];
