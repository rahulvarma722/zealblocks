# Buttons and Button

A pair. `zealblocks/buttons` is a flex container; `zealblocks/button` is its
only permitted child.

## `zealblocks/buttons` — the container

Accepts Button and nothing else, enforced in `block.json`:

```json
"allowedBlocks": [ "zealblocks/button" ]
```

Supports flex layout, block gap, padding and wide/full alignment. It renders its
inner blocks through `render.php` like everything else — a container returning
`null` from `save()` would discard its children silently, which is the same trap
described in [README.md](README.md).

## `zealblocks/button` — attributes

| attribute | type | notes |
|---|---|---|
| `text` | string | the label |
| `url` | string | `esc_url()` with the protocol allow-list |
| `linkTarget` | string | `_blank` adds an opener guard |
| `rel` | string | user-supplied, merged with the guard |
| `title` | string | `title` attribute |
| `tagName` | enum | `a` or `button` |
| `icon` | string | an icon slug — see [../icons/](../icons/README.md) |
| `iconPosition` | enum | `left` or `right` |
| `flipForRTL` | boolean | mirror the icon in RTL locales |

## The opener guard — a regression worth knowing

`rel="noopener"` is added whenever `target="_blank"`, **merged with** whatever
the author typed rather than replacing it.

The guard used to fire only when `rel` was empty. An author who typed
`nofollow` into "Link rel" got `<a target="_blank" rel="nofollow">` with no
opener guard at all — the exact case the guard exists for. There is an
integration test pinning this.

## Icon position — `row-reverse`, not `order`

```scss
&.has-icon-left:has(.wp-block-zealblocks-button__icon) {
	flex-direction: row-reverse;
}
```

The DOM order stays **text then icon** regardless of visual position, so the
button's accessible name is unaffected by where the icon appears. `order` would
move the icon visually while leaving a confusing reading order; `row-reverse`
moves both together.

The block only becomes a flex container when it actually has an icon, so a plain
text button keeps its natural `inline-block` behaviour.

## RTL mirroring

`flipForRTL` adds `has-rtl-flip`, and `style.scss` gates the transform on
`[dir="rtl"]`. Opt-in per block, because direction is per-icon: an arrow should
flip, a heart must not.

The `/*rtl:ignore*/` directive above that rule is load-bearing — see
[../icons/frontend.md](../icons/frontend.md).

## Per-viewport width and icon size

The button is where the responsive-styles work lives. Custom Width and Icon Size
can each hold a different value per device, stored in WordPress 7.1 style
states:

```json
"style": {
  "zealblocks": { "width": "200px", "iconSize": "1.5em" },
  "@tablet":    { "zealblocks": { "width": "150px" } },
  "@mobile":    { "zealblocks": { "width": "100%", "iconSize": "2em" } }
}
```

Full treatment in [../responsive-styles/](../responsive-styles/README.md).

### The icon is a descendant, which is the whole problem

Inline styles and `get_block_wrapper_attributes()` write to the block **root**
only, and core's per-viewport CSS targets the root unless the block declares
feature selectors. So the icon size is written to the root as a custom property
and consumed by the descendant:

```scss
&__icon {
	width:  var(--zealblocks-button-icon-size, 1em);
	height: var(--zealblocks-button-icon-size, 1em);
}
```

One indirection, and the icon becomes stylable per viewport — a media query only
has to reassign the variable on the root.

## No inline `<style>`

Per-viewport CSS goes through the **style engine** under the `zealblocks`
context, and core prints that store with `wp_add_inline_style()`. The block's
own markup contains no `<style>` element at all.

That is a Plugin Review requirement — use the enqueue APIs — and it is asserted
rather than assumed: the integration suite checks for the **absence** of
`<style>` in the block output and reads the CSS back from the store.
