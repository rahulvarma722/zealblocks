# Container — `zealblocks/container`

Groups any blocks. Core does the layout; this block adds what core leaves out.

One block, four ways in, as core's Group: **Container** (flow, the default),
**Row** (flex), **Stack** (flex, vertical) and **Grid** are variations, so the
layout is an attribute and a Row can become a Grid without rebuilding its
content. A plain Container inserted empty offers seven column presets.

## What core does, and what this adds

| | from |
|---|---|
| flow / flex / grid layout, gap, justification, orientation, columns, min column width | core `layout` support |
| per-device orientation, gap and columns (`style['@mobile'].layout`) | core 7.1 viewport states |
| child sizing: fit / fill / fixed in flex, column and row span in grid, per device | core, `allowSizingOnChildren` |
| grid visualiser and resize handles | core |
| padding, margin, colours, background image, border, shadow, min height, height, width, aspect ratio (per device), sticky | core supports |
| text, background and border colour on hover and keyboard focus | `Hover` (shared) |
| hover shadow, hover lift | this block |
| max width, max height, overflow, per device | this block |
| reverse order, per device, flex only | `Reverse_Order` |
| HTML element, accessible name | this block |
| a link over the whole container | this block |
| overlay: colour or gradient, opacity, blend mode, hover, per device; an image | this block |
| self-hosted background video with a pause button | `Background_Video` |
| align self and order in a flex or grid parent, per device | this block |
| position and offsets for a nested Container, per device | `Position` (shared with Text) |
| animation, display conditions, z-index | shared modules |

## Attributes

| attribute | type | what it does |
|---|---|---|
| `tagName` | string | `div`, `section`, `header`, `footer`, `main`, `article`, `aside` or `nav`; anything else renders as `div` |
| `ariaLabel` | string | core's `ariaLabel` support, which has no control in core; the block adds one in Advanced |
| `url` | string | the container's link |
| `linkTarget` | string | `_blank` adds the opener guard |
| `rel` | string | author's tokens, kept and allow-listed |
| `linkLabel` | string | the link's accessible name |
| `overlayImage` | object | `{ id, url }`, one for every device |
| `overlayImageSize` | string | `cover`, `contain` or `repeat` (tile) |
| `overlayImagePosition` | object | focal point `{ x, y }` |
| `videoUrl`, `videoId` | string, number | a self-hosted video file |
| `videoPoster`, `videoPosterId` | string, number | shown before it plays, and instead of it |
| `videoPosition` | object | focal point, as `object-position` |
| `videoOnMobile` | boolean | false hides it, and never loads it, in core's mobile band |
| `positionPreview` | boolean | the shared "Preview in editor" switch for position |

Everything per device lives in `style.zealblocks`, like every other block:
`backgroundHover`, `textHover`, `borderHover`, `hoverDuration`, the five
`shadowHover*` parts (the Button's keys and controls), `hoverLift`, `maxWidth`,
`maxHeight`, `overflow`, `zIndex`, `reverse`, `overlay`, `overlayOpacity`,
`overlayBlend`, `overlayHover`, `overlayHoverOpacity`, `alignSelf`, `order`,
`position` and `positionTop/Right/Bottom/Left`.

Every Container is `position: relative`, at zero specificity: the overlay, the
video, the link and an absolutely placed child are all placed against it, and
core's sticky position or a chosen position still wins. It also means an
absolutely positioned block anywhere inside a Container now anchors to that
Container, as in Elementor and Spectra.

## The link — not a wrapping `<a>`

Interactive content inside an `<a>` is invalid HTML. The audit
(`temp-doc/block-audits/ZEALBLOCKS-CONTAINER-AUDIT.md`, outside the repo) found what browsers make of it:
Spectra's linked container with a button inside renders two broken links, and
Elementor V4 refuses the link outright.

So the root stays a `<div>` (or the chosen tag), and the link is an **empty
`<a>` as its first child**, stretched over it:

```html
<article class="… has-link">
  <a class="wp-block-zealblocks-container__link" href="…" aria-label="Pricing plan"></a>
  <h2>Pricing plan</h2> … <a class="wp-block-zealblocks-button" href="/buy">Buy</a>
</article>
```

- `z-index: -1` inside `isolation: isolate`: above the container's background,
  under its content.
- The content gets `pointer-events: none`, so a click on text or an image falls
  through to the link. Links, buttons, form fields, `summary`, media and
  anything focusable get `pointer-events: auto` back, so they keep working.
- Keyboard order: the card link, then the controls inside it. The focus ring is
  drawn on the container (`:has(> __link:focus-visible)`), because the content
  would cover the link's own outline. Browsers without `:has()` keep the
  link's outline.
- The name: `linkLabel`, else the first heading's text, else the first twelve
  words. An empty link with no name is not announced as anything useful.
- The first visible child loses its top margin, as core takes it off a first
  child.
- `position: relative` at zero specificity, so core's sticky position still
  wins.
- Text inside a linked container cannot be selected with the mouse. That is
  the cost of a whole-card link without nesting.
- The editor never gets `has-link`, or nothing in the canvas could be clicked.

## Hover and focus

States `:hover` and `:has(:focus-visible)`, as on Buttons: focus on the card's
link or on a button inside it shows the hover state, and a mouse click on a
`<button>` child does not leave it on. See [../hover.md](../hover.md).

The shadow and the lift are custom properties spent in `style.scss`. Their
focus selector carries `:not(.editor-styles-wrapper *)`: in the editor the
children take focus to be typed into, and a card that rose under the cursor
would be unusable. The lift uses `translate`, not `transform`, so the entrance
animation's transform is untouched, and is off for reduced motion.

## Reverse order

`Reverse_Order::responsive()` turns `style[band].zealblocks.reverse` into
`flex-direction` rules with a class of their own.

Not a single `row-reverse` class: the direction depends on core's orientation,
which can differ per device. A Row that stacks on mobile would be forced back
into a row. So once any band is reversed, every band gets an explicit direction
from that band's orientation and flag. Mobile falls back to the base, never to
Tablet, as core's states do. Only boolean `true` reverses; an explicit `false`
on a device undoes a reversed base. Grids have no direction and get nothing.

Known quirk, shared with Elementor and Spectra: core's justification is
`flex-start`, which in a reversed row is the right-hand side. "Justify left"
puts reversed items on the right.

Screen readers and the Tab key follow the source order, whatever the visual
order. The control says so.

## Layers

Back to front inside a container, each `isolation: isolate` so negative
z-indexes stay inside it and the overlay's blend mode sees only this
container:

| layer | z-index |
|---|---|
| the container's own background (core) | — |
| the video | -2 |
| the overlay, `::before` | -1 |
| the link | -1, later in the tree |
| the content | in flow |
| the pause button | 1 |

The video, its button and the link come first in the markup and are out of
flow, so the first block after them loses its top margin, as core takes it off
a first child.

## Overlay

Fill, opacity, blend mode and the two hover values reach `::before` as custom
properties, since a pseudo-element cannot carry a style attribute, and the hover
values fall back to the base ones, so an author can change only the opacity on
hover. `mix-blend-mode` would be dropped by core's style engine anyway
(`safecss_filter_attr()` does not allow it); a custom property is not.

The image is one layer above the fill: `--zealblocks-container-overlay-image`
on the root, `url("…") x% y% / size repeat`. The URL goes through
`esc_url_raw()`, then `;`, `(`, `)`, `'`, `\` and spaces are percent-encoded:
WordPress splits a style attribute on `;`, and a URL holding one broke the
property in two.

Picking a first overlay colour seeds a 50% opacity on the base layer: full black
over a photo is never what an author means.

## Background video

`includes/block/class-background-video.php` and `src/container/video-view.js`.
WCAG 2.2.2 asks for a way to pause moving content that starts by itself. The
audit found Spectra and Elementor offer none, and keep playing under reduced
motion.

- The markup has no `src` and no `autoplay`: without JavaScript nothing plays and
  only the poster loads, so there is never motion without a working pause
  button.
- The script, enqueued only for a page with a video, loads it near the viewport,
  plays it muted while visible, pauses it off screen, and unhides the pause
  button, whose label says what it will do.
- Reduced motion: no download, the poster stays, and the button offers "Play".
- Off on mobile: a stored rule hides it in core's mobile band, and the script
  is handed the same media query so a phone never requests the file.
- A URL whose path is not a video MIME type renders nothing.

## Child settings

For a Container inside another block, in Dimensions beside core's own child
sizing. Align self and order are offered in a flex or grid parent; position in
any parent. All are offered again wherever a value is stored, so a Container
moved to the top level never keeps a setting nobody can see.

- `order` travels as `--zealblocks-container-order` and a `has-order` class:
  core's style engine drops an `order` declaration.
- First and Last store -9999 and 9999.
- Position is the Text block's control, moved to `src/shared/position/` and
  `includes/block/class-position.php`. An absolute child with no z-index paints
  under later positioned siblings, which every Container now is; the help text
  says to set a z-index.

## Max width and height

Marked `!important`. The page sets a max width on every content child: Astra
with `.entry-content[data-ast-blocks-layout] > *` (two classes' worth, found
live), block themes through the constrained layout. A width the author set on
one block has to beat the width the theme set on all of them.

## Presets

`presets.js`. Each is a core grid with `columnCount`, a mobile layer of one
column, and children that are Containers with `layout: { type: 'constrained' }`
set explicitly. A column with no layout and no children would show the picker
itself. A child wider than one column gets a mobile span of 1: a span of 2 in a
one-column grid makes the browser add a column.

## Files

| file | what |
|---|---|
| `render.php` | tag, link, hover, sizes, reverse, overlay, video, child settings, classes |
| `includes/block/class-reverse-order.php` | per-device reverse rules |
| `includes/block/class-background-video.php`, `video-view.js` | the video, its button and script |
| `includes/block/class-position.php`, `src/shared/position/` | position, shared with Text |
| `edit.js` | presets placeholder, inspector, canvas preview |
| `preview.js` | what the canvas shows for the previewed device |
| `style-controls.js` | sizes (Dimensions), lift (Border & Shadow), reverse (Layout) |
| `overlay-controls.js` | the overlay, in Background |
| `child-controls.js` | align self, order, position, in Dimensions |
| `video-controls.js` | the Background video panel |
| `values.js` | pure helpers for those controls |
| `presets.js`, `icons.js` | presets and the variation icons |
| `style.scss` / `editor.scss` | layers, overlay, video, link, shadow, lift / presets, hover preview |

## Tests

- `tests/unit/ReverseOrderTest.php`; the Container in `BlockContractTest`
  (hover prefix in four places; tags, overflow keywords, blend modes, self
  alignments, overlay image sizes and the reverse key between PHP and JS;
  the shared position keys); the opacity, blend and align-self types in
  `ResponsiveStylesTest`; `Render::focal_point()` in `BlockRenderTest`.
- `tests/js/container.test.js`: canvas preview, presets, overlay, child
  settings and the control helpers.
- `tests/integration/test-render.php`, "Container": markup, link, overlay and
  its image URL, video markup and script, child settings, CSS, hidden.
- `tests/e2e/specs/container/`: the front end in a real browser at three
  widths (the video tests use a video from the media library and skip without
  one), and the editor.
