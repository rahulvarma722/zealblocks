# Blocks

Four blocks: an icon, a text block, and a container with its only permitted
child.

## Icon — `zealblocks/icon`

Built on **core's icon API**, new in WordPress 7.1, rather than a bundled icon
set:

```php
wp_get_icon( $name, array( 'size' => null, 'label' => $label ) )
```

That resolves a namespaced name — `core/star-filled` — against
`WP_Icons_Registry`. 88 icons ship with core, in the `core` collection.

Attributes: `icon`, `flipHorizontal`, `flipVertical`, `rotation`, `label`.

### Why core's registry and not our own SVGs

The button block shows the alternative: `src/button/icon.js` holds four SVG
paths and `render.php` holds a PHP twin, kept in step **by hand**, and a key
added to one and not the other makes the icon vanish on save. The registry has
no such seam — the editor reads it over REST, the front end reads it in PHP,
and both see the same source.

It also means anything a plugin registers with `wp_register_icon()` appears in
this block with no JavaScript at all. Registration is PHP-only; the editor picks
it up over `/wp/v2/icons`.

### The icon name needs no allow-list

`wp_get_icon()` returns `''` for anything not in the registry, so an
unregistered or hostile name **cannot produce markup**. Verified for six cases
— unregistered, unnamespaced, path traversal, script injection, a raw `<svg>`
tag, and empty — all of which render nothing.

That is why `render.php` has no allow-list here, unlike the tag name in an
earlier version of the Text block: there, the value landed in an element position and
had to be validated; here, core resolves it or refuses.

### The picker

`src/icon/icon-picker.js` — a searchable grid in a modal, opened from the
toolbar, the inspector, or the empty-state placeholder.

A grid rather than a `<select>`, because a dropdown of 88 icons shows their
**labels** and hides the one thing you are choosing by. A modal rather than an
inline panel, because 88 glyphs in a 280px sidebar is four per row and a lot of
scrolling — you cannot scan it, which is the only thing a visual picker has to
allow.

**Filtering is client-side**, and that is a consequence of how the endpoint
behaves rather than a shortcut: `/wp/v2/icons` declares `page` / `per_page`
through `WP_REST_Controller::get_collection_params()` but its `get_items()`
never applies them — `per_page=5` still returns all 88. The whole set arrives in
one response regardless, so a `search` round-trip per keystroke would cost
latency for data already in memory.

`filterIcons()` matches **name as well as label**, mirroring
`WP_Icons_Registry::get_registered_icons()`, so typing `chevron` finds
`core/chevron-down` even where the label reads differently. Verified against the
server for six terms including mixed case — the counts match exactly, so the
picker cannot show a different result set than core would.

The icon list and the collection list are each fetched **once per editor
session** and cached at module scope: the data is identical for every Icon block
on the page, and there can be many. A failed request clears its own cache so the
next block retries rather than leaving the picker empty for the session.

The collection filter renders only when more than one collection is registered.

Each icon is a real `<button>` with an accessible name, so the grid is keyboard
reachable and responds to Enter and Space without reimplementing any of it.
`aria-pressed` rather than `aria-selected` — these are toggle buttons, not
options in a listbox, and screen readers announce the two differently.

### Layout: block by default, inline on request

```css
.wp-block-zealblocks-icon           { display: block; line-height: 0; width: 1.5rem }
.wp-block-zealblocks-icon.is-inline { display: inline-block; vertical-align: middle }
.wp-block-zealblocks-icon.aligncenter { margin-inline: auto }
```

An icon is usually its own element — a feature bullet, a card badge, a
standalone mark — so block-level is the default and the `isInline` attribute is
opt-in.

**`aligncenter` uses auto margins, not flex.** Core's icon block uses
`display: flex; justify-content: center`, which works *for core* because core
sets no width on its wrapper, so the flex container spans the column. This
wrapper has a width, so a flex container would be exactly as wide as the icon
and centring inside it would do nothing at all.

**The default size is a plain declaration**, not `:not([style*="width"])`. That
guard was wrong twice: an inline `style="width:64px"` from the `dimensions`
support already beats a class selector on specificity, so it was unnecessary —
and `[style*="width"]` also matches `max-width` and `min-width`, so setting
either would have silently switched the default size off.

### The empty state must not be sized like an icon

`blockProps` has to sit on the outermost element for editor selection, the
toolbar and the block outline to work, so the `Placeholder` renders inside the
same wrapper the icon does — and inherits `width: 1.5rem` and `line-height: 0`,
which crushed the whole panel into a 24px box. An `is-placeholder` class undoes
just the layout, leaving any colour and border from the block supports visible.

`is-inline` is only emitted when an icon is actually selected. Both classes set
`display` at equal specificity, so which won would otherwise depend on
`editor.scss` loading after `style.scss` — not emitting the conflict is more
robust than relying on stylesheet order.

### Accessibility is core's branch, and it is the point

| Label | Output |
|---|---|
| empty | `aria-hidden="true" focusable="false"` — decoration |
| set | `role="img" aria-label="…"` — content |

Getting that wrong is the most common icon-accessibility mistake. Using
`wp_get_icon()` means it is already right, and the label is escaped by core.

### `size => null`, deliberately

`wp_get_icon()` would otherwise bake `width` and `height` **attributes** into
the SVG at 24px. Passing null leaves the intrinsic `viewBox` alone, so sizing
belongs to the `dimensions.width` support: core serialises it onto the wrapper
and `style.scss` makes the SVG fill it. A user's width setting then wins,
instead of CSS fighting a hard-coded attribute.

### Flip and rotation go on the SVG

Applied with `WP_HTML_Tag_Processor` rather than string surgery, which is also
what core's icon block does — parsing the markup means adding a class cannot
corrupt an attribute.

**Not on the wrapper**, because a transform there would rotate any background,
border and padding with it. The user asked to rotate the icon, not the box.

Flips are classes; rotation is an inline `rotate` because it is a free numeric
value. Keeping them separate lets them compose — a single `transform` shorthand
would have one overwrite the other. Rotation is cast with `(int)` and taken
modulo 360, so a stored `720` emits nothing and `-90` becomes `270deg`.



## Text — `zealblocks/text`

A paragraph with a **visual style preset** chosen independently of the theme's
default sizing.

| Control | Attribute |
|---|---|
| **Style as** — Display / H1–H6 / Lead / Body / Caption / Eyebrow | `styleAs` |

`styleAs` is emitted as a **class, never an inline style**, so `style.scss` can
resolve each preset against the active theme's font-size presets — falling back
to a `clamp()` only when the theme declares none — and a theme can override the
whole scale in one place. An inline `font-size` would beat the theme forever.

```html
<p class="has-style-caption wp-block-zealblocks-text">Section title</p>
```

The value is validated against the same fixed list `style.scss` implements. An
unknown preset is dropped rather than emitted, so the block never carries a
class with no rule behind it.

### The element is always `<p>` — for now

A configurable HTML tag is **future scope**, and its absence is asserted rather
than assumed:

```php
zealblocks_check( 'a stray tagName attribute is ignored entirely', … );
```

When it returns, the validation belongs in `render.php` against an allow-list.
The tag name lands in an **element position**, which makes it an XSS boundary
rather than a styling preference — `<script>` or `<iframe>` reaching that line
would be exploitable. That test failing is the reminder.

Removed along with it: the settings-backed vocabulary (`Text_Tags`,
`Settings`), the `zealblocks_text_tags` / `zealblocks_enabled_text_tags` filters,
the PHP→JS bridge that carried the enabled list, and the heading-outline
guardrail — which had nothing left to check once the level could not be chosen.

**A consequence worth recording:** without the tag control there is no
tag/visual-style decoupling, which was what distinguished this block from
`core/paragraph` plus its typography supports. As it stands the differentiator
is the preset scale itself.

### `content` has no `source` — and that is load-bearing

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

**This shipped as a bug and reached the front end.** It is the same trap as a
container returning `null` and discarding its inner blocks, and it fails just as
silently — the editor looks correct until you reload.

Every other integration check hand-wrote the block delimiter, which quietly
guaranteed the attribute was present. That is not what the editor does, so those
checks could not catch it. There is now a round-trip test that goes
attributes → `serialize_blocks()` → parse → render, plus one through a real post
and `the_content`.

If this block ever gains a real `save()`, `source` should come back with it. The
two decisions belong together.

## Buttons and Button

A container and its only permitted child.

```
zealblocks/buttons   Buttons       flex container, wide/full align, block gap
  └─ zealblocks/button   Button       link or button, optional icon, per-viewport width
```

`button` declares `"parent": [ "zealblocks/buttons" ]`, so it cannot be inserted
anywhere else; `buttons` declares `"allowedBlocks": [ "zealblocks/button" ]`, so
nothing else can go inside. The container supplies the flex layout and gap the
child expects, which is why neither is useful alone.

## Registration

`Zealblocks\Block\Registrar::register_blocks()` scans `build/*/` for `block.json` and registers
each directory it finds. There is no array of block names anywhere.

**It reads `build/`, not `src/`.** `wp-scripts` copies `block.json` and
`render.php` across at build time, and the compiled `block.json` points at
`index.js` / `style-index.css` / `index.asset.php`, which exist only in
`build/`. Registering from `src/` would fail on the missing assets.

The consequence to remember: **`build/` is gitignored but must ship.** A fresh
clone registers zero blocks until `npm run build` runs, and a release ZIP
without `build/` installs cleanly and does nothing. `bin/build-zip.sh` runs the
build itself so the second case cannot happen.

## Source layout

```
src/button/
  block.json            metadata, attributes, supports
  index.js              registerBlockType( metadata.name, … )
  edit.js               editor UI
  icon.js               the four icons + their labels (JS side)
  render.php            front-end markup
  style.scss            shared, front end AND editor canvas
  editor.scss           editor-only affordances
  responsive-width/     the per-viewport control — see docs/STYLES.md
src/buttons/
  block.json  index.js  edit.js  render.php  style.scss  editor.scss
```

## The save/render split — the trap worth knowing

`button` and `buttons` both render server-side from `render.php`. But their
`save` functions differ, and getting it wrong is silent and destructive.

**`button` — `save: () => null`.** Correct. Nothing is written to post content;
the front-end markup comes entirely from `render.php`.

**`buttons` — `save: () => <InnerBlocks.Content />`.** Also correct, and *not*
`null`. It is tempting to return `null` for a block that renders in PHP, but
for a **container** that is wrong: with no save output, core serialises the
block as a self-closing comment — `<!-- wp:zealblocks/buttons /-->` — and every
inner block is discarded at save time. The buttons vanish along with their
text, URLs and styles, and nothing warns the user.

"Dynamic" means the block's *own markup* is generated at render time. Inner
blocks still have to exist in post content, because that is where they are
stored. `render.php` receives them already rendered, as `$content`.

`InnerBlocks.Content` emits the children and no wrapper, which is what this
block needs — `render.php` supplies the wrapping `div` itself.

## `render.php`

All four render templates carry a file-level `phpcs:disable
WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound`. The
variables are *not* global: core wraps render templates in a static closure and
requires them from inside it (`wp-includes/blocks.php:629-631`), so every
assignment is function-scoped. PHPCS sees a file whose top level assigns
variables and cannot know that. Core's own block templates trip the same sniff.

### `button/render.php`

The anchor **is** the block root — `get_block_wrapper_attributes()` is spread
onto it, so every class and inline style core generates from `supports` lands
on the element the user actually clicks. This differs deliberately from
`core/button`, which nests `.wp-block-button__link` inside a wrapper div; core
needs that extra element so a width setting can size the flex item
independently of the link.

Order of operations:

1. **Empty label → render nothing.** An invisible button still occupies a flex
   slot.
2. **Sanitise every attribute.** Values come from post content: written by
   someone with edit rights, but long-lived, portable between sites, and
   reachable by anything that can write a post.
3. **Escape the URL first, then choose the tag.** `esc_url()` does not merely
   escape — it *drops* the value when the scheme is not allow-listed. Testing
   the raw value for emptiness let `javascript:alert(1)` through the anchor
   branch and emitted `<a href="">`, an anchor with no destination, which is
   exactly what the branch exists to prevent.
4. **No usable URL → `<button type="button">`** rather than a hrefless anchor,
   which is not keyboard focusable.
5. **Build the icon** from a fixed four-entry path map.
6. **Emit per-viewport CSS** — see [Styles](STYLES.md).
7. **Print**, with attributes handed to `get_block_wrapper_attributes()`.

Attribute handling:

| Attribute | Treatment |
|---|---|
| `url` | `esc_url()`; empty result falls back to `<button>` |
| `linkTarget` | allow-listed to `_blank` / `_self` / `_parent` / `_top` |
| `rel` | whole tokens matched against the HTML link-type registry |
| `title` | `sanitize_text_field()` |
| `text` | `wp_kses()` with an explicit inline-formatting list |
| `tagName` | allow-listed to `a` / `button` |
| `icon` | must be a key of the internal path map |
| `iconPosition` | allow-listed to `left` / `right` |

`target` gets an allow-list rather than escaping alone because browsers treat
an unrecognised target as a **named browsing context** — `target="evil"`
silently opens links in a window named `evil` and keeps reusing it, invisibly.

`rel` gets whole-token matching because character filtering is not enough:
`noopener"><script>alert(1)</script>` reduces to
`noopenerscriptalert1script`, safe to print and completely meaningless.

The label uses `wp_kses()` with an explicit list rather than `wp_kses_post()`.
`wp_kses_post()` is the filter for post *bodies*, so it permits `<img>`,
`<iframe>` and `<a>` — and a nested `<a>` inside this anchor is invalid HTML
browsers recover from unpredictably.

The icon SVG is **not** run through `wp_kses()`. It cannot be: kses lowercases
every attribute name before matching, so `viewBox` becomes `viewbox` whatever
the allow-list says, and an allow-list written as `viewBox` matches nothing and
drops the attribute entirely. `viewbox` survives via the HTML parser's
SVG-attribute adjustment, but `viewBox` is what makes the icon scale, and
leaning on parser error-correction is a poor trade for defence-in-depth on a
value that is one of four literals in the same file.

### `buttons/render.php`

Emits the wrapper and prints `$content`. Layout classes — the flex container
and its `blockGap` — are added by `wp_render_layout_support_flag()` on the
`render_block` filter, *after* this file runs.

`$content` is deliberately **unfiltered**. It is already-rendered inner block
HTML, each child escaped by its own callback, so filtering would escape twice.
`wp_kses()` there would be actively destructive: a container cannot know what
its children legitimately emit, so any allow-list narrow enough to be worth
writing would silently delete part of somebody's page. Core's `core/group`,
`core/buttons` and `core/columns` print `$content` raw for the same reason.

## `block.json` notes

**Experimental support keys are correct as written.** `__experimentalBorder`,
`__experimentalFontFamily` and friends look like something to modernise, but
WordPress 7.1's `block-supports/typography.php` and `border.php` read *only*
the experimental keys, and core's own bundled `blocks/blocks-json.php` still
uses them for core blocks. Renaming them to `border` / `fontFamily` would
silently stop server-side style serialisation.

**Icons are duplicated by design, and by hand.** `src/button/icon.js` holds the
JS copy and `render.php` holds the PHP twin, because the editor renders from JS
and the front end from PHP. A key added to one must be added to the other or
the icon disappears on save.

## Adding a block

1. `mkdir src/my-block` with `block.json`, `index.js`, `edit.js`, `render.php`.
2. Set `"name": "zealblocks/my-block"` and `"category": "zealblocks"`.
3. Import the name from metadata — never write it as a literal:
   `registerBlockType( metadata.name, … )`.
4. `npm run build`.

No PHP changes. The scan finds it.
