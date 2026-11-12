# Hover colours (shared)

Text and background colours on hover, per device, with a transition. They
match Spectra Free's Text Hover and Background Hover, including the background
taking either a colour or a gradient.

Text uses them today. Button (B-01, B-02), Icon (I-01, I-02) and Buttons
(BS-02) build on this.

## Where it lives

| piece | file |
|---|---|
| property-map entries, wrapper class | `includes/block/class-hover.php` (`Zealblocks\Block\Hover`) |
| pseudo-state selectors | `Block_Render::responsive()`, with the allow-list `Render::PSEUDO_STATES` |
| controls (Color panel) | `src/shared/hover/controls.js`: `HoverControls` |
| canvas preview | `src/shared/hover/preview.js`: `getHoverPreview()` |
| keys and classes | `src/shared/hover/constants.js` |
| transition, editor preview | `src/shared/hover/_hover.scss`: `transition()` and `preview()` |

## Adding it to a block

No block.json attribute is needed. The values live in the block's `style`
attribute, in core's viewport-state shape (`style.zealblocks.textHover`,
`.backgroundHover`, `.hoverDuration`, per layer).

Pick a **variable prefix** for the block, such as `--zealblocks-button-hover-`,
and use the same one in all four places below. `BlockContractTest` checks
Text's.

1. **`render.php`**: spread `Hover::properties( $prefix, $states )` into the map
   passed to `Block_Render::responsive()`, and merge
   `Hover::classes( $responsive['rules'] )` into the wrapper classes.
2. **`edit.js`**: render `<HoverControls clientId style setAttributes stateKey device />`
   (with `textLabel` where "Text hover" is the wrong word, such as "Icon
   hover"), and merge `getHoverPreview( attributes.style, device, prefix )`
   into the block props.
3. **`style.scss`**: `@include hover.transition("<block selector>", "<prefix>")`.
4. **`editor.scss`**: `@include hover.preview("<block selector>", "<prefix>")`.

### Choosing the states

`$states` is one state or a list, from `Render::PSEUDO_STATES`
(`:hover`, `:focus`, `:focus-visible`, `:focus-within`):

| block | states | why |
|---|---|---|
| Text | `':hover'` | not focusable on the front end |
| Button (a link or button) | `array( ':hover', ':focus' )` | keyboard users see what mouse users see, as in Spectra |
| Icon (with a link), Buttons | `array( ':hover', ':focus-within' )` | the focus lands on a child: the link, or a Button |

A list becomes a selector list: `.x:hover,.x:focus{color:… !important}`, inside
each band's media query too. States not in the allow-list are dropped, because
the state is concatenated into a selector. With none left, the value applies
with no state.

## How it works

- **The colours are real declarations, never custom properties.** A variable
  the active band does not define would make `color: var(--x)` invalid at
  computed-value time and reset the colour to its inherited value on hover, so
  a Mobile-only hover colour would break hover on Desktop. A rule that simply
  does not exist outside its band has no such failure.
- **They are `!important`**, as core marks its own state rules, because a
  hover colour must beat the inline `color` and the
  `.has-x-color { … !important }` preset class core puts on the same element.
- **The duration is a custom property**, read by the transition with a 0.2s
  fallback. An undefined one falling back is exactly right here, so this is
  the one place a variable is safe.
- **`has-hover` comes from the surviving rules of all bands**, so an unsafe
  colour leaves no class, and the transition is on in every band once any band
  has a colour. A duration alone switches nothing on.
- **Reduced motion** sets the transition to 0s.
- **The editor previews with variables**, because the canvas has no per-instance
  stylesheet of ours. `getHoverPreview()` resolves the colour for the previewed
  device and adds `has-hover-color` / `has-hover-background` only when that
  device has a value, so the canvas rule never reads an undefined variable. The
  canvas previews `:hover` only, because in the editor the block takes focus to
  be edited.

## Known

`has-hover` is not namespaced, unlike `has-zealblocks-z-index`. It is kept for
Text's existing markup, and every rule using it is scoped to the block's own
class, so a theme's `.has-hover` rule would have to target our block to
collide. Renaming it would change Text's front-end classes, so that is left as
a separate decision.
