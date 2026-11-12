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
| `iconRotation` | number | degrees; read as 0 to 359 (`Render::angle()`) |
| `showText` | boolean | `false` with an icon: icon-only, the text becomes the `aria-label` |
| `showIconOnHover` | boolean | turns the hover icon on |
| `hoverIcon` | string | icon slug shown on hover and keyboard focus |
| `hoverIconPosition` | enum | `left` or `right` of the text |
| `hoverIconRotation` | number | degrees, as `iconRotation` |
| `hoverIconFlipForRTL` | boolean | mirror the hover icon in RTL locales |
| `hoverIconAriaLabel` | string | icon-only buttons: the `aria-label` while the hover icon shows |

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

The hover icon has its own toggle, `hoverIconFlipForRTL` (`has-hover-icon-rtl-flip`).
With a rotation, the flip is applied **after** it
(`transform: scaleX(-1) rotate(…)`), so the whole rotated icon is mirrored: an
arrow turned to point down and right points down and left. In Spectra the
inline `rotate()` overrides the flip, so a rotated icon is not mirrored at all.

## Rotation, icon-only buttons and the hover icon (B-08 to B-10)

Plain attributes in the Settings panel, not per-device styles: Spectra does not
vary them by device, and neither does the Icon block's rotation.

**Rotation.** Each rotated SVG carries `has-rotation` and its own
`--zealblocks-button-icon-rotation`; `style.scss` turns that into
`transform: rotate()`. An unrotated icon prints exactly as before. The RTL
stylesheet keeps the rule unchanged: RTLCSS negates a literal `rotate()` angle
but leaves `var()` alone. The control shows whenever there is an icon; Spectra
hides it on icon-only buttons, though it still applies the rotation.

**Icon only.** "Show text" off, with an icon that resolves, drops the text span
and prints the text, tags stripped, as `aria-label`. The editor shows the text
as an "Aria label" field instead, and stores what is typed escaped, so `<` stays
a character. Without an icon, or with a slug that does not resolve, the text
shows whatever the attribute says, and removing the icon in the editor turns
"Show text" back on. An icon-only button with empty text still renders, with no
`aria-label` (an empty one names nothing); the field's help text asks for one.

**Hover icon.** Printed after the icon, hidden by `style.scss` until
`:hover` or `:focus-visible`, then shown in place of the icon, or beside the
text when there is no icon. It takes the icon size and the hover icon colour.
Its side uses `order`: `has-icon-left` reverses the row, so `order: -1` puts it
on the left of a normal row and on the right of a reversed one.

**Hover aria label.** Only on icon-only buttons, where no visible text names
the button. `Hover_Label::attributes()` writes it to
`data-zealblocks-hover-label` and enqueues `build/shared/hover-label-view.js`,
a small script that sets it as the `aria-label` while the button is hovered or
focused, and puts the original back once it is neither. Loaded only on pages
that need it, like the animation script.

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

## Hover, focus, icon colours, gap and hover shadow

Everything below is per device, stored under `style.zealblocks` like the width,
and needs no `block.json` attribute.

| control | panel | key(s) | front end |
|---|---|---|---|
| Text hover, Background hover (colour or gradient), Hover transition | Color | `textHover`, `backgroundHover`, `hoverDuration` | shared [Hover](../hover.md): real rules, `!important` |
| Border hover | Color | `borderHover` | `border-color` under the same states; width and style stay the normal border's |
| Icon, Icon hover (only with an icon) | Color | `iconColor`, `iconHover` | custom properties the icon reads |
| Text-icon gap (only with an icon) | Dimensions | `iconGap` | custom property the `:has(icon)` rule reads, default `0.5em` |
| Shadow hover: colour, X, Y, blur, spread | Border & Shadow | `shadowHover{X,Y,Blur,Spread,Color}` | five custom properties combined into one `box-shadow`, `!important` |

**States: `:hover` and `:focus-visible`.** A keyboard user sees what a mouse
user sees. This deliberately differs from Spectra's `:focus`: a mouse click
focuses a `<button>`, and with `:focus` the hover styling would stay on until
the visitor clicked elsewhere.

**Why some are variables.** The icon is a child, so its colours and the gap use
the same technique as the icon size: a custom property on the root, spent by
`style.scss`, each with a fallback so a band that does not define it is
unaffected. With no icon colour set, the icon simply follows the button's text
colour, including the text hover colour while hovered. The gap has to be a
variable for a second reason: the default `gap` sits on a `:has()` rule that
would out-rank a plain per-instance declaration.

**Shadow hover** is five variables rather than one value, so a tablet override
of the colour alone keeps the desktop offsets. Adding a first part seeds the
others with Spectra's default, `0 4px 8px 0 rgba(0, 0, 0, 0.2)`
(`setShadowHoverValue()`). It is `!important` to beat the inline `box-shadow`
that core's shadow support writes.

`has-hover` (the transition) is on whenever any hover styling is, including a
shadow or icon hover alone; `has-shadow-hover` switches the shadow rule on.

Margin, padding on all four sides and writing mode are core supports
(`block.json`). Writing mode shows only on themes that turn on
`settings.typography.writingMode`; see [text.md](text.md).

### Colours in `rgb()` / `hsl()` are printed as hex

Core's style engine drops any declaration using `rgb()`, `rgba()`, `hsl()` or
`hsla()` outside a gradient (`safecss_filter_attr()`). The drop is whole and
silent. `Responsive_Styles::printable()` converts such colours to hex, keeping
the alpha as a fourth byte, for every block. This is what fixed the Text
block's default `rgba(0, 0, 0, 0.3)` shadow, which had been rendering
colourless.

## No inline `<style>`

Per-viewport CSS goes through the **style engine** under the `zealblocks`
context, and core prints that store with `wp_add_inline_style()`. The block's
own markup contains no `<style>` element at all.

That is a Plugin Review requirement — use the enqueue APIs — and it is asserted
rather than assumed: the integration suite checks for the **absence** of
`<style>` in the block output and reads the CSS back from the store.
