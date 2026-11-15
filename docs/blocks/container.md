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
| padding, margin, colours, background image, border, shadow, min height, height, width, sticky | core supports |
| text, background and border colour on hover and keyboard focus | `Hover` (shared) |
| hover shadow, hover lift | this block |
| max width, max height, overflow, per device | this block |
| reverse order, per device, flex only | `Reverse_Order` |
| HTML element, accessible name | this block |
| a link over the whole container | this block |
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

Everything per device lives in `style.zealblocks`, like every other block:
`backgroundHover`, `textHover`, `borderHover`, `hoverDuration`, the five
`shadowHover*` parts (the Button's keys and controls), `hoverLift`, `maxWidth`,
`maxHeight`, `overflow`, `zIndex` and `reverse`.

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
| `render.php` | tag, link, hover, sizes, reverse, classes |
| `includes/block/class-reverse-order.php` | per-device reverse rules |
| `edit.js` | presets placeholder, inspector, canvas preview |
| `preview.js` | what the canvas shows for the previewed device |
| `style-controls.js` | sizes (Dimensions), lift (Border & Shadow), reverse (Layout) |
| `presets.js`, `icons.js` | presets and the variation icons |
| `style.scss` / `editor.scss` | link, shadow, lift / presets, hover preview |

## Tests

- `tests/unit/ReverseOrderTest.php`; the Container in `BlockContractTest`
  (hover prefix in four places; tags, overflow keywords and the reverse key
  between PHP and JS).
- `tests/js/container.test.js`: canvas preview and presets.
- `tests/integration/test-render.php`, "Container": markup, link, CSS, hidden.
- `tests/e2e/specs/container/`: the front end in a real browser at three
  widths, and the editor.
