# Text — `zealblocks/text`

Text with a **visual style preset** chosen independently of its HTML tag.

| control | panel | stored as | per device |
|---|---|---|---|
| **HTML tag** — Spectra's 41 tags, grouped; the toolbar offers the common ten | Settings | `tagName` | no |
| **Style as** — Display / H1–H6 / Lead / Body / Caption / Eyebrow | Settings | `styleAs` | no |
| **Drop cap** | Typography | `dropCap` | no |
| **Column gap** | Typography | `style.zealblocks.columnGap` | yes |
| **Text shadow** — colour, X, Y, blur | Border & Shadow | `style.zealblocks.textShadow{X,Y,Blur,Color}` | yes, per part |
| **Text hover / Background hover** (colour or gradient) | Color | `style.zealblocks.textHover`, `backgroundHover` | yes |
| **Hover transition** (ms) | Color | `style.zealblocks.hoverDuration` | yes |
| **Position** — relative / absolute / fixed, four offsets | Dimensions | `style.zealblocks.position`, `positionTop/Right/Bottom/Left` | yes |
| **Z-index** (−100 to 1000) | Dimensions | `style.zealblocks.zIndex` | yes |
| **Overflow** | Dimensions | `style.zealblocks.overflow` | yes |
| **Preview position in editor** | Dimensions | `positionPreview` | no |
| **Entrance animation** — 23 types, duration, delay, easing, repeat | Settings → Animation | `animation*` | no |
| **Display conditions** — logged in/out, role, browser, OS, days | Settings → Display conditions | `displayConditions` | no |

Everything else — font, size, colours, spacing, border, box shadow, per-device
values for those, hiding per device — is core's, through `supports` and
WordPress 7.1 style states.

**Writing mode appears only if the theme turns it on.** `block.json` declares
`typography.__experimentalWritingMode`, but core shows the control (labelled
**Orientation**, not "Writing mode") only when the theme sets
`settings.typography.writingMode: true`. Core's own default is `false`. So:

- **Twenty Twenty-Five** sets it to `true`, and the control shows.
- **Astra** leaves it `false`, and the control is absent.

This is not a Zealblocks bug, and Spectra's Text behaves the same way. The front
end needs no opt-in: a stored value renders as `style="writing-mode:vertical-rl"`.

## The preset is a class, never an inline style

```html
<p class="has-style-caption wp-block-zealblocks-text">Section title</p>
```

That lets `style.scss` resolve each preset against the active theme's font-size
presets — falling back to a `clamp()` only when the theme declares none — and a
theme can override the whole scale in one place.

An inline `font-size` would beat the theme forever.

The value is validated against the same fixed list `style.scss` implements. An
unknown preset is dropped rather than emitted, so the block never carries a
class with no rule behind it.

## The HTML tag is an XSS boundary

The tag lands in an **element position**, so `render.php` validates it against
an allow-list identical to the `block.json` enum and falls back to `p`. The
integration suite asserts that `{"tagName":"script"}` renders a paragraph.

`Style as` is independent of it: an `h2` styled as a caption keeps the document
outline correct and still looks like a caption.

## Content is filtered with `wp_kses_post()`, not `LABEL_HTML`

The `RichText` sets no `allowedFormats`, so the editor offers every core format:
link, highlight and inline colour (`<mark>`), underline (`<span style>`), keyboard
(`<kbd>`), language (`<bdo>`), inline image and inline math, besides bold and
italic. The render must keep all of them, so it uses core's post-body list.

**This shipped as a bug.** The render used `Block_Render::LABEL_HTML`, the Button
label list (`strong b em i s sub sup code br`). Links, highlights, kbd, language,
underline and images showed in the editor and vanished on the page, and the
Elements → Link colour control had nothing to colour. Post content was never
affected, so the fix brought existing posts back without a re-save.

`wp_kses_post()` still removes `<script>`, `<iframe>`, event handlers,
`javascript:` / `data:` URLs and unsafe CSS (`expression()`, `behavior`,
`url(javascript:…)`). Core allows an `https` `url()` in an inline background, as
it does in any post. The "Text — inline formats survive the front end" section of
the integration suite covers all of this.

A block holding only an inline image is content, not empty, so it renders. A
block holding only markup with no text and no image renders nothing.

## Drop cap

A `has-drop-cap` class with core/paragraph's rule copied into `style.scss`,
scoped to this block — core's rule only loads on pages that contain a
paragraph. Not emitted for `span` (`::first-letter` does nothing inline) or
for text aligned center or to the end edge; the editor disables the toggle in
the same cases. Respects the theme's `typography.dropCap` setting.

## Entrance animation

Shared with every animated block, so it is documented once in
[../animation.md](../animation.md). Text opts in through the four pieces listed
there: the five attributes in `block.json`, `Animation::wrapper()` in
`render.php`, the panel and preview hook in `edit.js`, and the two SCSS mixins.

## Display conditions

Shared with every block that has them, so documented once in
[../display-conditions.md](../display-conditions.md), including the page-cache
limitation. Text's `render.php` checks them first, before any other work, so a
hidden Text block leaves no markup, CSS rule or script behind.

## Per-device styles

Stored in core's `style` attribute under `zealblocks`, in core's
viewport-state shape, through the same helpers as the Button's width — see
[styles.md](../styles.md). The controls fill core's `typography`, `color` and
`border` groups, because those are among the seven the responsive view renders.

Three output strategies, chosen per property:

| value | front end | why |
|---|---|---|
| column gap | real `column-gap` on the root | the root is the element it styles |
| text shadow | four custom properties, combined in `style.scss` | a Tablet colour alone inherits the Desktop offsets through the cascade |
| hover colours | real `:hover` rules, `!important`, per band (shared: [../hover.md](../hover.md)) | a variable undefined in the active band would reset the colour on hover |
| position, offsets, z-index, overflow | real declarations on the root | `:where(.has-zealblocks-z-index)` adds a zero-specificity `position: relative` so a z-index alone works |

The shadow's stylesheet fallbacks draw nothing, so a Mobile-only shadow leaves
Desktop untouched. The editor seeds `1px 1px 2px rgba(0,0,0,.3)` when a shadow
is first added, so picking only a colour still shows something.

Hover rules are important for the same reason core's state rules are: they must
beat the inline `color` and the `.has-x-color { … !important }` preset class on
the same element. `Render::store_rules()` passes the flag to the style engine.

Values are validated by type before they reach the style engine
(`Responsive_Styles::is_safe_value()`): lengths, signed lengths, colours,
backgrounds (colour or gradient), times, integers (z-index) and the keyword
lists for position and overflow (`Responsive_Styles::KEYWORDS`). Colours accept any bare
`var(--name)`, because theme palettes such as Astra's are custom properties.

In the canvas, `preview.js` resolves each value for the previewed device and
writes it inline. Hover colours become custom properties with a class that
exists only when that device has a value — the editor-only rule is in
`editor.scss`.

Z-index is shared with the blocks that have no Position panel; its control,
class and `position: relative` rule are documented once in
[../z-index.md](../z-index.md). Text renders it as an item in its own Position
fill (`ZIndexItem`) and previews it with position, behind "Preview in editor".

## `content` has no `source` — and that is load-bearing

```json
"content": { "type": "string", "default": "", "role": "content" }
```

Core stores it inside the block comment delimiter:

```html
<!-- wp:zealblocks/text {"content":"Hello","styleAs":"caption"} /-->
```

Declaring `"source": "rich-text"` instead — which is what `core/heading` and
`core/paragraph` do — tells core to parse the value back out of the **saved
markup**. Those blocks have a real `save()` that writes that markup. This one
returns `null`, so there would be nothing to parse from: the text is written
nowhere, reads back empty, and the block renders nothing on the front end.

**This shipped as a bug and reached the front end.** It fails silently — the
editor looks correct until you reload.

Every other integration check hand-wrote the block delimiter, which quietly
guaranteed the attribute was present. That is not what the editor does, so those
checks could not catch it. There is now a round-trip test that goes attributes →
`serialize_blocks()` → parse → render, plus one through a real post and
`the_content`.

If this block ever gains a real `save()`, `source` should come back with it.
