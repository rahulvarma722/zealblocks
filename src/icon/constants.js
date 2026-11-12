/**
 * Icon — constants shared by the editor files.
 */

/*
 * The hover variable prefix. MUST match render.php's Hover::properties() call,
 * the hover.transition() call in style.scss and the hover.preview() call in
 * editor.scss; BlockContractTest compares all four.
 */
export const HOVER_VAR_PREFIX = '--zealblocks-icon-hover-';

/** The custom property a rotated SVG carries; style.scss spends it. */
export const ROTATION_VAR = '--zealblocks-icon-rotation';
