/**
 * Hover colours, shared by every block that opts in.
 *
 * Per device, stored in core's viewport-state shape under `style.zealblocks`,
 * so a block needs no block.json attribute. It opts in with:
 *
 *   1. render.php  — `...Hover::properties( $prefix, $states )` in the map
 *                    passed to Block_Render::responsive(), and
 *                    Hover::classes() merged into the wrapper classes.
 *   2. edit.js     — <HoverControls> and getHoverPreview() on the block
 *                    props, with the same prefix.
 *   3. SCSS        — hover.transition() in style.scss, hover.preview() in
 *                    editor.scss, with the same prefix.
 */

export { HoverControls } from './controls';
export { getHoverPreview } from './preview';
export { HOVER_KEYS, HOVER_CLASS, HOVER_PREVIEW_CLASSES } from './constants';
