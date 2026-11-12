/**
 * Z-index, shared by every block that opts in.
 *
 * Per device, stored in core's viewport-state shape under `style.zealblocks`,
 * so a block needs no block.json attribute. It opts in with:
 *
 *   1. render.php  — `Z_Index::KEY => Z_Index::PROPERTY` in the map passed
 *                    to Block_Render::responsive(), and Z_Index::classes()
 *                    merged into the wrapper classes.
 *   2. edit.js     — <ZIndexControl> (its own Dimensions fill), or
 *                    <ZIndexItem> inside a fill the block already has; and
 *                    getZIndexPreview() on the block props.
 *   3. style.scss  — z-index.base(), the `position: relative` that lets a
 *                    z-index take effect on a static block.
 */

export { ZIndexControl, ZIndexItem } from './control';
export { getZIndexPreview } from './preview';
export { Z_INDEX_KEY, Z_INDEX_RANGE, Z_INDEX_CLASS } from './constants';
