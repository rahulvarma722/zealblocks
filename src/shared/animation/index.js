/**
 * Entrance animation, shared by every block that opts in.
 *
 * A block opts in with four pieces, and BlockContractTest checks the first:
 *
 *   1. block.json  — the five attributes in Animation::ATTRIBUTES, exactly.
 *   2. render.php  — Animation::wrapper( $attributes ), merged into
 *                    get_block_wrapper_attributes().
 *   3. edit.js     — <AnimationPanel>, useAnimationPreview() and
 *                    getAnimationProps() on the block props.
 *   4. SCSS        — animation.front() in style.scss, animation.preview() in
 *                    editor.scss.
 *
 * view.js is NOT exported. It is its own webpack entry, registered and
 * enqueued by PHP; importing it here would bundle it into the editor.
 */

export { AnimationPanel } from './panel';
export { useAnimationPreview, getAnimationProps } from './preview';
export {
	ANIMATION_DEFAULTS,
	ANIMATION_GROUPS,
	EASING_OPTIONS,
} from './constants';
