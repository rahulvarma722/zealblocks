/**
 * Responsive Width — experiment constants.
 */

/**
 * Which inspector group the control fills.
 *
 * THE EXPERIMENT BENCH. Change this value, rebuild, and observe. The three
 * settings answer three different questions about WordPress 7.1.
 *
 * 'dimensions'  The working setting. `dimensions` is one of the seven slots
 *               `StyleStateInspectorSlots` renders, so the control appears in
 *               the Styles tab on Desktop AND in the responsive view on
 *               Tablet/Mobile. This is the only arrangement that works today.
 *
 * 'styles'      Reproduces the bug. `styles` is the general-purpose group for
 *               third-party panels and the one core renders UNLABELLED, so a
 *               fill can bring its own ToolsPanel and heading. It is rendered
 *               in the Styles tab (`styles-tab.js:159`) but NOT by
 *               `StyleStateInspectorSlots`. Result: the control is visible on
 *               Desktop and disappears the moment you switch to Tablet or
 *               Mobile with Responsive styles on — while its stored values
 *               stay in the post content, unreachable.
 *
 * 'viewport'    The negative control. This group does not exist in 7.1; it is
 *               added by the still-open draft PR #82003. Filling it here makes
 *               core log `Unknown InspectorControls group "viewport" provided.`
 *               and render nothing — which is the proof that the group registry
 *               (`inspector-controls/groups.js`) is closed to plugins. When
 *               #82003 ships, this same value should start working AND keep the
 *               control's own panel, because core renders that slot unlabelled.
 *
 * @type {string}
 */
export const EXPERIMENT_GROUP = 'dimensions';

/**
 * Where the value lives inside core's `style` attribute.
 *
 * The whole point of the experiment: rather than inventing our own
 * `buttonWidth` / `buttonWidthTablet` / `buttonWidthMobile` attributes, the
 * value is stored INSIDE core's `style` object, under a namespaced key, using
 * core's own viewport-state shape:
 *
 *   style: {
 *     'zealblocks': { width: '200px' },                  // base — applies everywhere
 *     '@tablet': { 'zealblocks': { width: '150px' } },   // tablet band only
 *     '@mobile': { 'zealblocks': { width: '100%'  } },   // mobile band only
 *   }
 *
 * `style` is declared by core as a free-form `{ type: 'object' }` attribute
 * (`block-editor/src/hooks/style.js:546`) with no key allowlist, so a
 * namespaced key survives serialization untouched. Core generates CSS only for
 * paths it knows, so nothing of ours is emitted by core — see render.php.
 *
 * Storing it this way is what makes the control behave like a core one: the
 * state the user is editing decides which value is read and written, so with
 * Responsive styles off only the base value is ever visible or editable.
 *
 * @type {string}
 */
export const STYLE_NAMESPACE = 'zealblocks';

/**
 * The key under the namespace.
 *
 * @type {string}
 */
export const WIDTH_KEY = 'width';

/**
 * Icon size — a SECOND per-viewport property, stored beside `width`.
 *
 * It exists to demonstrate the case `width` cannot: styling a DESCENDANT.
 * `width` applies to the block root, which is the one element inline styles and
 * `get_block_wrapper_attributes()` can reach. The icon is a child, so its size
 * cannot be set that way — see the CSS-variable indirection in style.scss and
 * the method comparison in docs/RESPONSIVE-STYLES-EXPERIMENT.md.
 *
 * @type {string}
 */
export const ICON_SIZE_KEY = 'iconSize';

/**
 * CSS custom properties the stylesheet reads.
 *
 * Named `--zealblocks-*`, not `--bk-*`. A custom property lands in the page's
 * global CSS namespace alongside every other plugin's, so the prefix is the
 * only thing keeping it from colliding — and an abbreviation is a much weaker
 * guarantee than the full slug. The plugin used both spellings for a while,
 * which is worse than either: two prefixes to remember and no rule about
 * which applies where.
 *
 * Only descendant-targeting properties belong here. The wrapper carries the
 * variable and the descendant consumes it, and that single indirection is what
 * makes a child element stylable from the one place the platform lets us write
 * to. `width` is deliberately absent: it lands on the block root, so it is
 * emitted as a real declaration and needs no variable.
 *
 * @type {Object<string, string>}
 */
export const CSS_VARS = {
	iconSize: '--zealblocks-button-icon-size',
};

/**
 * Core's device names, as returned by `select( 'core/editor' ).getDeviceType()`.
 */
export const DESKTOP = 'Desktop';
export const TABLET = 'Tablet';
export const MOBILE = 'Mobile';

/**
 * Device name to the viewport-state key core uses inside `style`.
 *
 * Desktop maps to null rather than a key, because Desktop IS the base layer —
 * it carries no media query and applies at every width. That asymmetry is
 * core's model, not a simplification: `@tablet` and `@mobile` are overrides on
 * top of the base, and they are mutually exclusive, so mobile falls back to the
 * BASE when unset, never to tablet.
 *
 * @type {Object<string, ?string>}
 */
export const VIEWPORT_STATE_BY_DEVICE = {
	[ DESKTOP ]: null,
	[ TABLET ]: '@tablet',
	[ MOBILE ]: '@mobile',
};

/**
 * Units offered by the control.
 *
 * `%` earns its place here: "full width on mobile, auto on desktop" is the
 * canonical responsive button requirement, and it is the case that makes a
 * per-viewport value obviously different from a single global one.
 *
 * STRINGS, not unit objects. `useCustomUnits( { availableUnits } )` filters
 * core's ALL_CSS_UNITS with `availableUnits.includes( unit.value )`, so an array
 * of objects never matches and the hook returns []. UnitControl treats an
 * explicit [] as "no units" — its own defaults only apply to `undefined` — so
 * the dropdown disappeared entirely and every field was locked to px. That made
 * the `%` this comment argues for unreachable, and readme.txt advertised mobile
 * widths of `100%` the UI could not produce.
 *
 * Every unit here must also pass Responsive_Styles::is_safe_length() on the PHP
 * side, or the value would be stored and then silently dropped at render.
 *
 * @type {string[]}
 */
export const WIDTH_UNITS = [ 'px', '%', 'em', 'rem' ];

/**
 * Starting value when the author switches to a unit for the first time.
 *
 * Passed as `defaultValues`, which is the key useCustomUnits actually reads —
 * the per-unit `default` on a unit object is not consulted.
 *
 * @type {Object<string, number>}
 */
export const WIDTH_UNIT_DEFAULTS = {
	px: 200,
	'%': 100,
	em: 10,
	rem: 10,
};

/**
 * Whether to print the live detection state into the inspector.
 *
 * OFF for release. When on it renders a <pre> block into the Styles tab showing
 * the device, both probe readings, the resolved state and the stored values, so
 * the mechanism can be watched rather than guessed at — invaluable while
 * working on `use-style-state.js`, and a debug artifact anywhere near a user.
 *
 * Flip to true and rebuild to get it back.
 *
 * @type {boolean}
 */
export const SHOW_DIAGNOSTICS = false;
