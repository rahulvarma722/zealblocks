/**
 * Button — keys and names for the hover, icon and shadow-hover styling.
 *
 * Width and icon size keep their own constants in responsive-width/, the R&D
 * bench they were built on.
 */

/**
 * Keys under `style.zealblocks`. render.php's property map uses the same.
 */
export const KEYS = {
	iconGap: 'iconGap',
	iconColor: 'iconColor',
	iconHover: 'iconHover',
	borderHover: 'borderHover',
	shadowX: 'shadowHoverX',
	shadowY: 'shadowHoverY',
	shadowBlur: 'shadowHoverBlur',
	shadowSpread: 'shadowHoverSpread',
	shadowColor: 'shadowHoverColor',
};

export const SHADOW_HOVER_KEYS = [
	KEYS.shadowX,
	KEYS.shadowY,
	KEYS.shadowBlur,
	KEYS.shadowSpread,
	KEYS.shadowColor,
];

/**
 * What a hover shadow starts as when one is first added: Spectra's default,
 * `0 4px 8px 0 rgba(0, 0, 0, 0.2)`, with the colour as hex. render.php would
 * convert an rgba() anyway (Responsive_Styles::printable()), but hex is also
 * what the colour picker itself produces.
 */
export const SHADOW_HOVER_DEFAULTS = {
	[ KEYS.shadowX ]: '0px',
	[ KEYS.shadowY ]: '4px',
	[ KEYS.shadowBlur ]: '8px',
	[ KEYS.shadowSpread ]: '0px',
	[ KEYS.shadowColor ]: '#00000033',
};

/**
 * Slider ranges, as Spectra's.
 */
export const SHADOW_HOVER_RANGES = {
	[ KEYS.shadowX ]: { min: -50, max: 50 },
	[ KEYS.shadowY ]: { min: -50, max: 50 },
	[ KEYS.shadowBlur ]: { min: 0, max: 100 },
	[ KEYS.shadowSpread ]: { min: -50, max: 50 },
};

/**
 * Prefix of the Button's hover variables. MUST match the prefix render.php
 * passes to Hover::properties() and the one style.scss and editor.scss pass
 * to the hover mixins.
 */
export const HOVER_VAR_PREFIX = '--zealblocks-button-hover-';

/**
 * Custom properties the root carries. render.php writes the same names,
 * except the border hover, which the front end emits as a real `border-color`
 * rule and only the canvas carries as a variable.
 */
export const CSS_VARS = {
	[ KEYS.iconGap ]: '--zealblocks-button-icon-gap',
	[ KEYS.iconColor ]: '--zealblocks-button-icon-color',
	[ KEYS.iconHover ]: '--zealblocks-button-icon-hover-color',
	[ KEYS.borderHover ]: `${ HOVER_VAR_PREFIX }border`,
	[ KEYS.shadowX ]: '--zealblocks-button-shadow-hover-x',
	[ KEYS.shadowY ]: '--zealblocks-button-shadow-hover-y',
	[ KEYS.shadowBlur ]: '--zealblocks-button-shadow-hover-blur',
	[ KEYS.shadowSpread ]: '--zealblocks-button-shadow-hover-spread',
	[ KEYS.shadowColor ]: '--zealblocks-button-shadow-hover-color',
};

/**
 * Units for the text-icon gap. Each must pass is_safe_length().
 */
export const GAP_UNITS = [ 'px', 'em', 'rem', '%', 'vw' ];
