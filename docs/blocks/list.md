# List — `zealblocks/list` and `zealblocks/list-item`

A bulleted, icon or numbered list whose items can hold any block. Decided with
Rahul on 2026-11-15; the reasoning, and a hands-on check of Spectra's list, are
in the List audit (`temp-doc/block-audits/ZEALBLOCKS-LIST-AUDIT.md`, §3a and
§7, outside the repo).

```
Editor tree:  List › List Item › [ icon: a setting ] + Text (+ any blocks)

<ul class="wp-block-zealblocks-list has-icon" role="list">
  <li class="wp-block-zealblocks-list-item">
    <span class="wp-block-zealblocks-list-item__icon" aria-hidden="true"><svg>…</svg></span>
    <div class="wp-block-zealblocks-list-item__content">
      <p class="wp-block-zealblocks-text">Fast setup</p>
      … any blocks the author added, including a nested list …
    </div>
  </li>
</ul>
```

## Why this shape

- **Spectra's layout, typed like core's List.** An icon on the left and a
  content area on the right that takes any block, as in Spectra; but the
  cursor is in the first item on insert, Enter makes the next item, Tab nests.
  Spectra's list has no text field until "+" is used, Enter never makes an
  item, and Tab does nothing (checked live).
- **The item is the content container.** No Container block per item: an item
  needs padding, background, border, spacing and an icon, not overlays and
  video. A Container can still go inside an item for a card.
- **The icon is a setting, printed as an element.** Chosen on the list,
  overridable per item (`icon`, or `none` to switch it off); rendered by the
  server from the icon library as `<span aria-hidden="true"><svg>`, so it can
  be styled like a real element and is never announced. Spectra's bullets are
  unnamed images in the accessibility tree.
- **Numbers are native:** `<ol>` with `start`, `reversed` and a
  `list-style-type`; no icons in a numbered list.

## Attributes

| Block | Attribute | What it does |
|---|---|---|
| List | `ordered` | `<ol>` instead of `<ul>` |
| List | `type` | `decimal`, `decimal-leading-zero`, `lower-alpha`, `upper-alpha`, `lower-roman`, `upper-roman` (allow-listed) |
| List | `start`, `reversed` | Native; a start that is not a number is dropped |
| List | `icon` | Library slug; empty = native bullets; an unknown slug = native bullets |
| List | `iconAlign` | `top` (centred on the first line, `1lh`) or `center` (on the whole item) |
| List item | `icon` | Overrides the list's icon; `none` switches it off |

Per device in `style.zealblocks`, as custom properties on the list:
`itemGap` (`--zealblocks-list-gap`, applied with a `has-item-gap` class that
also takes over the items' margins), `iconSize`, `iconGap`, `iconColor`,
`markerColor`, `markerSize`; an item can override `iconColor`. Z-index,
animation and display conditions are the shared modules. Context passes the
list's icon and numbering to its items.

## Typing (`src/list/keyboard.js`, `src/list/actions.js`)

The Text block attaches a capture keydown listener when it is the first block
of an item; it runs before RichText's own and marks the event handled.

| Key | In an item's first Text |
|---|---|
| Enter | The next item, splitting at the caret |
| Enter on an empty item | Nested: out one level. Last item: out of the list (a Text after it) |
| Shift+Enter | A line break (RichText's own) |
| Backspace at the start | Joins the item to the line above (into its last Text, through a nested list) |
| Tab / Shift+Tab | Nest under the item above / out one level; also toolbar buttons |

Two details that matter:

- **The caret is read from the page**, not the store: the store's selection is
  updated on `selectionchange`, an event after Home or End moved the caret.
- **Indenting into a new nested list copies the item into it**: core refuses to
  move a block into a list that has not rendered yet (its allowed blocks are
  registered on render). The caret, or the block selection, moves to the copy.

## Spacing

Blocks inside an item sit close: no margin around them, 0.25em between them.
The selector carries `:not(#_)` to beat theme editor styles like Astra's
`.editor-styles-wrapper .block-editor-block-list__layout.is-root-container p`
without `!important`, so a margin the author sets still applies.

## Files

| File | What |
|---|---|
| `src/list/render.php`, `src/list-item/render.php` | The `<ul>`/`<ol>` and each `<li>` |
| `src/list/edit.js`, `settings.js`, `style-controls.js`, `preview.js` | The list in the editor |
| `src/list-item/edit.js` | The item, its icon override and colour, indent/outdent buttons |
| `src/list/actions.js`, `keyboard.js` | Typing |
| `src/list/constants.js`, `icons.js` | Names, presets, toolbar icons |
| `src/list/style.scss` | Both blocks' styles (an item never appears without a list) |
| `includes/icon-handler/class-editor-provider.php` | Preloads the seven preset icons |

## Tests

- `BlockContractTest`: presets PHP ↔ JS, numbering styles across JS, render
  and block.json, the context keys.
- `tests/js/list.test.js`: the canvas preview.
- `tests/integration/test-render.php`, "List": markup, icons and overrides,
  nesting inside the item, per-device CSS, native numbering, hostile values,
  empty and hidden lists.
- `tests/e2e/specs/list/`: typing (Enter, split, Shift+Enter, Tab, Shift+Tab,
  Backspace, leaving), toolbar, presets, numbering, per-item icons, a Tablet
  value, the "+" in an item, and the accessibility tree on the page.

## Next (audit §7)

Phase 2: icon style presets (circle, badge, outline, tint) with icon
background, border, padding and hover; layout presets (icon on top, inline);
dividers; transforms from and to core's List and Spectra's. Phase 3: number
badges, whole-item link, custom SVG icons.
