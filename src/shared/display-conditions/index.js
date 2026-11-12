/**
 * Display conditions, shared by every block that opts in.
 *
 * A block opts in with four pieces, and BlockContractTest checks the first:
 *
 *   1. block.json  — `displayConditions` exactly as in
 *                    Display_Conditions::ATTRIBUTES.
 *   2. render.php  — `if ( Display_Conditions::hides( … ) ) { return; }`
 *                    FIRST, before any other work, so a hidden block emits
 *                    nothing: no markup, no CSS rule, no script.
 *   3. edit.js     — <DisplayConditionsPanel>, and the
 *                    `has-display-conditions` class when hasConditions().
 *   4. editor.scss — display-conditions.marker(), the dashed outline.
 */

export { DisplayConditionsPanel } from './panel';
export { setCondition, hasConditions } from './values';
export { BROWSER_OPTIONS, OS_OPTIONS, DAY_OPTIONS } from './constants';
