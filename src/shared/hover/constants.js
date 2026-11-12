/**
 * Hover colours — values shared by every block that opts in.
 */

/**
 * Keys under `style.zealblocks`. MUST match Hover::TEXT, ::BACKGROUND and
 * ::DURATION; BlockContractTest compares them.
 */
export const HOVER_KEYS = {
	text: 'textHover',
	background: 'backgroundHover',
	duration: 'hoverDuration',
};

/**
 * The class that switches on the transition. MUST match Hover::CLASS_NAME.
 */
export const HOVER_CLASS = 'has-hover';

/**
 * Editor-only classes: present when the PREVIEWED device has a value, so the
 * canvas rule never reads an undefined variable. See the preview() mixin.
 */
export const HOVER_PREVIEW_CLASSES = {
	text: 'has-hover-color',
	background: 'has-hover-background',
};
