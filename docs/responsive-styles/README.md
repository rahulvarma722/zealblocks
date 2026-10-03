# Responsive styles

Per-viewport values for block attributes, built on WordPress 7.1's **style
states** rather than a parallel system.

| | |
|---|---|
| [experiment.md](experiment.md) | the R&D bench, findings, and what core is still missing |

## What ships

The Button block's **Custom Width** and **Icon Size** each hold a different
value per device.

```json
"style": {
  "zealblocks": { "width": "200px", "iconSize": "1.5em" },
  "@tablet":    { "zealblocks": { "width": "150px" } },
  "@mobile":    { "zealblocks": { "width": "100%", "iconSize": "2em" } }
}
```

| layer | key |
|---|---|
| base — applies at every width | `style.zealblocks` |
| tablet | `style["@tablet"].zealblocks` |
| mobile | `style["@mobile"].zealblocks` |

## Resolution — mobile falls back to base, not tablet

```
Desktop  → the base layer, no media query
Tablet   → @tablet,  else base
Mobile   → @mobile,  else base      ← NOT @tablet
```

This is the rule most likely to be got wrong, and it is pinned by a unit test
named in capitals for that reason. Mobile inheriting from tablet would mean a
tablet-only override silently changing phones.

`src/button/responsive-width/style-value.js` holds `getResolvedValue()`,
`getStateValue()` and `setStateValue()`. They are pure and unit-tested — no
WordPress, no React.

## Writing a value

`setStateValue()` **prunes empty layers** rather than leaving them behind:

```js
// clearing the last @mobile property removes the @mobile object entirely
{ style: { zealblocks: { width: '200px' } } }
```

Debris in post content is content the user never wrote and cannot see.

## Front-end CSS

`Responsive_Styles::build_rules()` emits rules through the **style engine**
under the `zealblocks` context. Core prints the store with
`wp_add_inline_style()`.

The block's markup carries **no `<style>` element**. That is a Plugin Review
requirement, and the integration suite asserts the absence rather than trusting
it.

Media queries come from `Helper::media_queries()`, which resolves them from
core's own viewport definitions — not hard-coded breakpoints — so the plugin
follows whatever core and the theme agree on.

## The scoping class

Each block instance gets `zealblocks-btn-<8 hex>`, derived from its content so
it is stable across renders. Rules target that class, so two buttons with
different widths on one page do not collide.

## Styling a descendant — the custom-property indirection

Inline styles and `get_block_wrapper_attributes()` write to the block **root**
only. The Button's icon is a descendant, so it cannot be reached directly.

The value is written to the root as a custom property and consumed in CSS:

```scss
&__icon { width: var(--zealblocks-button-icon-size, 1em); }
```

A media query then only has to reassign the variable on the root. One
indirection, and any descendant becomes per-viewport stylable.

## Editor parity

`src/button/responsive-width/` holds the controls. The editor previews the
**resolved** value for the device currently being edited, which is why
`getResolvedValue()` is shared by both sides rather than reimplemented.

`useStyleState()` wraps reading and writing so a control never manipulates the
nested shape directly.

## Why not a custom attribute shape

Core's style states are the mechanism core itself will extend. A parallel
`responsiveWidth` attribute would work today and diverge the moment core ships
its own per-viewport UI — and the content would need migrating.

The trade-off, and what core is still missing, is in
[experiment.md](experiment.md).
