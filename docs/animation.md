# Entrance animation (shared)

A block plays an entrance animation when it scrolls into view: 23 types
(Fade, Flip, Slide, Zoom in, Zoom out and their directions), duration, delay,
easing, and an option to replay every time. It matches Spectra Free's Animation
extension, and its start states are AOS's, so an animation moved across looks
the same.

Text uses it today. Button, Icon and Buttons opt in under task S-05.

## Where it lives

| piece | file |
|---|---|
| validation, wrapper markup, script registration | `includes/block/class-animation.php` (`Zealblocks\Block\Animation`, a Module) |
| the front-end script | `src/shared/animation/view.js` → `build/shared/animation-view.js` (its own webpack entry) |
| Settings-tab panel | `src/shared/animation/panel.js` |
| editor preview | `src/shared/animation/preview.js` |
| picker values and defaults | `src/shared/animation/constants.js` |
| CSS | `src/shared/animation/_animation.scss` (two mixins) |

## Adding it to a block

1. **`block.json`**: declare the five attributes in `Animation::ATTRIBUTES`,
   exactly. `BlockContractTest` fails if any differ.
2. **`render.php`**: merge `Animation::wrapper( $attributes )` into the wrapper:

   ```php
   $animation        = Animation::wrapper( $attributes );
   $extra_attributes = array_merge( $extra_attributes, $animation['attributes'] );
   $classes          = array_merge( $classes, $animation['classes'] );
   ```

   If the block also writes its own `style`, join the two strings; a plain
   merge would drop one.
3. **`edit.js`**: render `<AnimationPanel … onPreview={ playPreview } />`,
   call `useAnimationPreview( attributes )`, and spread `getAnimationProps()`
   into the block props (`className`, `style`, `data`).
4. **SCSS**: `@include animation.front("<block selector>")` at the root of
   `style.scss`, and `@include animation.preview("<block selector>")` in
   `editor.scss`.

## How it works

`wrapper()` writes `data-zealblocks-animation="<type>"`, the `has-animation`
class, and the timing as custom properties
(`--zealblocks-animation-duration/-delay/-easing`). Everything is validated,
because it lands in attribute and style positions: the type and easing against
fixed lists, and the times clamped to 0–5000 ms. For an animated block, it also
**enqueues the script**.

`view.js` watches every `[data-zealblocks-animation]` element and adds
`is-animated` when a tenth of it is in view. The CSS then plays one keyframe
animation from the type's start state to rest. With repeat on, the class is
removed when the block leaves the viewport, so it plays again next time.

- **One script for every block type, loaded only when needed.** It is not a
  block.json `viewScript`, because core loads those on every page the block
  appears on, animated or not. A page with an animated Text and an animated
  Button runs one observer.
- **The CSS ships inside each block's own stylesheet**, through the mixins, so
  it loads wherever that does: in the head on a classic theme too. A separate
  stylesheet enqueued at render time would print in the footer, and an
  above-the-fold block would show, vanish, then animate in.
- **Before it plays, a block is only transparent, never moved.** The observer
  measures the transformed box, so a block parked off to the side for a
  slide-in would never "enter" and would stay hidden.
- **Nobody is left with hidden content.** The hidden start is behind
  `@media (scripting: enabled) and (prefers-reduced-motion: no-preference)`:
  without JavaScript, or with reduced motion, the block is simply there.
  Without `IntersectionObserver`, every block is marked animated at once.
- **The editor plays the same keyframes once**, when the type changes or
  Preview is pressed, never on load.

## Lists that must agree

The type list exists in three places: `Animation::TYPES` (PHP validation),
`ANIMATION_GROUPS` (the picker) and `$starts` (the start states). The easings
and defaults also exist in both PHP and JS. `BlockContractTest::
test_animation_lists_match_across_php_js_and_scss` compares them. Without it,
a type in the picker but not in PHP would be dropped on render, and one
missing from `$starts` would play with no start state, both silently.

## Troubleshooting

- **A block never appears.** Check that `build/shared/animation-view.js`
  exists (`npm run build`) and that the page loads `zealblocks-animation-js`.
  The integration suite checks both.
- **It animates in the editor but not on the page.** The block's `render.php`
  is not merging `Animation::wrapper()`, or its `style.scss` does not include
  `animation.front()`.
