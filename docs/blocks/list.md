# List — `zealblocks/list` and `zealblocks/list-item`

An icon or numbered list. Each item is an **Icon block** on the left and a
**Container block** on the right, and the Container starts with a Text, so the
author types straight away and can add any other block below it. Decided with
Rahul on 2026-11-15 and reworked to this structure on 2026-11-16; the
reasoning, and a hands-on check of Spectra's list, are in the List audit
(`temp-doc/block-audits/ZEALBLOCKS-LIST-AUDIT.md`, §3a and §7, outside the
repo).

```
Editor tree:  List › List Item › [ Icon ] + [ Container › Text (+ any blocks) ]

<ul class="wp-block-zealblocks-list has-icon" role="list">
  <li class="wp-block-zealblocks-list-item">
    <div class="wp-block-zealblocks-icon"><svg aria-hidden="true">…</svg></div>
    <div class="wp-block-zealblocks-container is-layout-flow …">
      <p class="wp-block-zealblocks-text">Fast setup</p>
      … any blocks the author added, including a nested list …
    </div>
  </li>
</ul>
```

## Why this shape

- **Spectra's structure, typed like core's List.** An Icon block and a
  Container per item, as in Spectra, so the icon has every Icon block setting
  (colour, background, border, padding, shadow, hover, rotation) and the
  content takes any block. But the cursor is in the first item's Text on
  insert, Enter makes the next item, Tab nests. Spectra's list has no text
  field until "+" is used, Enter never makes an item, and Tab does nothing
  (checked live).
- **The Icon and the Container are locked in place** (`lock: { move, remove }`)
  and the item accepts only those two, so every item keeps both. What goes
  inside the Container is the author's.
- **The icon is decorative.** The Icon block has no label, so its SVG is
  `aria-hidden` and screen readers hear the list and its text. Spectra's
  bullets are unnamed images in the accessibility tree.
- **Numbers are native:** `<ol>` with `start`, `reversed` and a
  `list-style-type`. The Icon blocks stay in the content, hidden by the list's
  stylesheet, so switching back to icons brings them back as they were.

## The icon: list-wide and per item

- **On the list** (Settings › List › Icon): seven presets or any library icon.
  Picking one sets the list's `icon` and the icon of every item still showing
  the list's previous icon (`setListIcon()` in `actions.js`), as one undo step.
  The field has no Remove button (`clearable={ false }` on the shared
  `IconControl`): a list always has an icon.
- **On one item:** select its Icon block and change it there ("Select an icon"
  in its toolbar, or its Settings). A later list-wide change leaves that item's
  icon alone.
- **New items** made by Enter copy the current item's Icon and Container
  settings. The list's first item, and an item added from the inserter, take
  the list's icon.
- Size, colour and gap are set on the list, per device, as custom properties;
  an Icon block's own width or colour wins (inline style or a preset class).

## Attributes

| Block | Attribute | What it does |
|---|---|---|
| List | `ordered` | `<ol>` instead of `<ul>` |
| List | `type` | `decimal`, `decimal-leading-zero`, `lower-alpha`, `upper-alpha`, `lower-roman`, `upper-roman` (allow-listed) |
| List | `start`, `reversed` | Native; a start that is not a number is dropped |
| List | `icon` | The list's icon (default `check`): what new items take, and what a list-wide change replaces |
| List | `iconAlign` | `top` (on the first line) or `center` (on the whole item) |

The item has no attributes of its own beyond core supports.

Per device in `style.zealblocks`, as custom properties on the list:
`itemGap` (`--zealblocks-list-gap`, applied with a `has-item-gap` class that
also takes over the items' margins), `iconSize`, `iconGap`, `iconColor`,
`markerColor`, `markerSize` (numbers only). And the items' hover colours,
`textHover`, `backgroundHover`, `hoverDuration` (below). Z-index, animation and display
conditions are the shared modules. Context passes the list's icon and
numbering to its items.

## Item hover colours (LS-07)

Styles › Color: **Item text hover**, **Item background hover** and **Hover
transition**, per device, through the shared Hover (`docs/hover.md`, "Targets").

- **Per item, not per list:** hovering one item colours that item. The text
  colour goes on the item's own content (the blocks in its Container, except
  a nested list); the background on the item (`<li>`).
- **A nested list keeps its colours**, and its own hover settings apply to its
  items. Hovering a nested item also hovers the item it is in, as with any
  nested element, so that item's own text takes the colour too.
- **The icon keeps its colour** (an icon hover is phase 2, LS-10).
- **Keyboard:** also on `:focus-within`, so a link focused in an item colours
  the item. The canvas previews `:hover` only.
- Rules are `!important` (as all hover colours here), so they beat an item's
  or a Text's own colour while hovered. Reduced motion: no transition.

## Typing (`src/list/keyboard.js`, `src/list/actions.js`)

The Text block attaches a capture keydown listener when it is the first block
of an item's Container; it runs before RichText's own and marks the event
handled.

| Key | In an item's Text |
|---|---|
| Enter | The next item, splitting at the caret; blocks below the Text stay |
| Enter on an empty item | Nested: out one level. Last item: out of the list (a Text after it) |
| Shift+Enter | A line break (RichText's own) |
| Backspace at the start | Joins the item to the line above (into its last Text, through a nested list); the blocks below the Text move to the end of that item's Container |
| Tab / Shift+Tab | Nest under the item above / out one level; also toolbar buttons on the item |

Details that matter:

- **The caret is read from the page**, not the store: the store's selection is
  updated on `selectionchange`, an event after Home or End moved the caret.
- **Indenting into a new nested list copies the item into it**: core refuses to
  move a block into a list that has not rendered yet (its allowed blocks are
  registered on render). The caret, or the block selection, moves to the copy.
- **The first item is not a block template.** Core selects the first block a
  template inserts, which would be the Icon; the list inserts its first item
  itself and puts the caret in the Text, marked as not persistent so the
  insertion is one undo step.
- A nested list goes at the end of the item's Container, so the HTML is always
  `li > div > ul`, never `ul > ul`.

## Layout and spacing

- A `<ul>` is a flex row per item: the Icon (`flex: none`, the list's icon
  size) and the Container (`flex: 1`).
- **The icon meets the middle of the first line at any line height.** It is
  centred in a line box of its own (`min-height: 1lh`), and that box's
  baseline, given by an empty `::before` character with empty alternative
  text, is aligned to the text's first baseline (`align-items: baseline`). A
  line box's middle is the same distance above its baseline at any line
  height, so a theme that gives paragraphs their own line height (Astra:
  26.4px against 29.7px on the `li`) does not move the icon. Measured: within
  0.2px in the editor, exact on the page.
- **The Container is plain flow** (`layout: default`) with Block spacing
  0.25em, which the author can change on the Container. The list removes the
  Container's own margin, the margin above its first block and below any, with
  `:not(#_)` to beat theme editor styles like Astra's `.editor-styles-wrapper
  .block-editor-block-list__layout.is-root-container p` without `!important`,
  so a margin the author sets still applies.
- **A nested list's last item adds no bottom margin.** In a plain list it would
  collapse with its parent item's; a flex item stops that, so a theme's `li`
  margin would count twice. With this, the line spacing matches a core List on
  Astra within a pixel (26/37px against 27/36px).
- Astra resets `.entry-content ul` margins (`margin: revert`), which outranks
  core's Container gap: a nested list sits flush under its text, as a core
  List's does there.

## Files

| File | What |
|---|---|
| `src/list/render.php`, `src/list-item/render.php` | The `<ul>`/`<ol>` and each `<li>` around its two blocks |
| `src/list/edit.js`, `settings.js`, `style-controls.js`, `preview.js` | The list in the editor; its first item; the list-wide icon |
| `src/list-item/edit.js` | The `<li>`, its two blocks, indent/outdent buttons |
| `src/list/actions.js`, `keyboard.js` | Typing, `createItem()`, `setListIcon()` |
| `src/list/constants.js`, `icons.js` | Block names, the item template, presets, toolbar icons |
| `src/list/style.scss` | Both blocks' styles (an item never appears without a list) |
| `includes/icon-handler/class-editor-provider.php` | Preloads the seven preset icons |

## Tests

- `BlockContractTest`: presets PHP ↔ JS, numbering styles across JS, render
  and block.json, the context keys.
- `tests/js/list.test.js`: the canvas preview; the item template (Icon and
  Container locked, Container holding a Text, the default icon).
- `tests/integration/test-render.php`, "List": the `li > Icon + Container >
  Text` markup, a decorative icon, per-item icons, the Container's flow layout
  and gap, nesting inside the Container, per-device CSS, native numbering with
  hidden icons, hostile values, an unknown icon, empty and hidden lists.
- `tests/e2e/specs/list/` (test cases TC-LS-xx in `temp-doc/ZEALBLOCKS-TEST-PLAN.md` §9a):
  - `editing.spec.js`: the item's structure and locks; Enter, split,
    Shift+Enter, Tab, Shift+Tab, Backspace, leaving; Enter copying the item's
    icon and Backspace bringing blocks along; toolbar; Arrow Up/Down between
    items; one undo per Enter; Duplicate; save and reload with every block
    valid.
  - `settings-and-page.spec.js`: presets on every item; numbering; one item's
    icon kept through a list-wide change; item spacing and icon colour with a
    Tablet value; what the Container and the item accept; the accessibility
    tree on the page.
  - `controls.spec.js` (also item hover: text and background, a Mobile
    colour, keyboard focus, the nested list and icon unchanged, reduced
    motion, the transition): every inspector control operated, then the stored
    value, the canvas and the page: all 7 presets, "Or any icon" (no Remove),
    all 6 numbering styles, icon position, icon size and gap with Mobile
    values, number colour and size, typography, background, padding, margin,
    border, radius, link colour, text alignment, z-index per device, extra
    class, animation, display conditions; an item's own styles; one Icon
    block's width and colour over the list's; an icon badge; an item
    Container's Block spacing and its "+".
  - `front-end.spec.js`: per-device values at 480/481/782/783; wrapping
    beside the icon; 360px, three levels, no overflow; right to left; spacing
    against a core List on Astra and Twenty Twenty-Five (previewed); keyboard;
    axe-core with no violations on both themes.

## Known theme interactions

- **Headings inside an item on Astra** keep Astra's `margin-top: 1.5em`
  (`.entry-content :where(h1…h6)`), which has the same weight as core's
  Container gap and comes later, so it wins over the Container's Block
  spacing. The same happens in any Container or core Group on Astra.
  Paragraphs and Text follow the Block spacing.
- **Twenty Twenty-Five** spaces core's List items by 0.5rem with custom CSS
  for `core/list` only; this List keeps its own rhythm there (one line per
  item) until "Space between items" is set.

## Next (audit §7)

Phase 2: icon style presets (circle, badge, outline, tint) applied to the
items' Icon blocks; layout presets (icon on top, inline); dividers; transforms
from and to core's List and Spectra's. Phase 3: number badges, whole-item link,
custom SVG icons.
