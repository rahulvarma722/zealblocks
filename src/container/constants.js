/**
 * Container — constants shared by the editor files.
 */

import { SHADOW_HOVER_KEYS } from '../button/constants';

/*
 * The hover variable prefix. MUST match render.php's Hover::properties() call,
 * the hover.transition() call in style.scss and the hover.preview() call in
 * editor.scss; BlockContractTest compares all four.
 */
export const HOVER_VAR_PREFIX = '--zealblocks-container-hover-';

/** The per-device reverse flag. MUST match Reverse_Order::KEY. */
export const REVERSE_KEY = 'reverse';

/** Keys under `style.zealblocks`. The shadow keys are the Button's. */
export const KEYS = {
	borderHover: 'borderHover',
	lift: 'hoverLift',
	maxWidth: 'maxWidth',
	maxHeight: 'maxHeight',
	overflow: 'overflow',
	reverse: REVERSE_KEY,
};

export { SHADOW_HOVER_KEYS };

/** Custom properties render.php writes and style.scss spends. */
export const CSS_VARS = {
	[ KEYS.borderHover ]: `${ HOVER_VAR_PREFIX }border`,
	[ KEYS.lift ]: '--zealblocks-container-lift',
	shadowHoverX: '--zealblocks-container-shadow-hover-x',
	shadowHoverY: '--zealblocks-container-shadow-hover-y',
	shadowHoverBlur: '--zealblocks-container-shadow-hover-blur',
	shadowHoverSpread: '--zealblocks-container-shadow-hover-spread',
	shadowHoverColor: '--zealblocks-container-shadow-hover-color',
};

/** HTML elements the Container may render as. MUST match render.php. */
export const TAGS = [
	'div',
	'section',
	'header',
	'footer',
	'main',
	'article',
	'aside',
	'nav',
];

/** Tags that are landmarks, so they should carry an aria label. */
export const LANDMARK_TAGS = [ 'section', 'aside', 'nav' ];

/** MUST match Responsive_Styles::KEYWORDS['overflow']. */
export const OVERFLOW_VALUES = [ 'visible', 'hidden', 'auto', 'clip' ];

/** Units for the size limits and the lift. Each must pass is_safe_length(). */
export const SIZE_UNITS = [ 'px', '%', 'em', 'rem', 'vw', 'vh' ];

export const LIFT_UNITS = [ 'px', 'em', 'rem' ];
