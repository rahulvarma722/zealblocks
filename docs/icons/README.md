# Icons

Zealblocks bundles **1,992 Font Awesome Free icons** and resolves them by slug.
Two blocks use them — `zealblocks/icon` and `zealblocks/button` — through one
shared library.

## Contents

| | |
|---|---|
| [source-and-generation.md](source-and-generation.md) | Where the icons come from, how `npm run update-icons` works, how to verify upstream |
| [data-and-mapping.md](data-and-mapping.md) | The three generated files, their shapes, and how a slug becomes artwork |
| [editor.md](editor.md) | Picker, inspector control, REST routes, caching, inlining |
| [frontend.md](frontend.md) | `Icon_Library::render()`, escaping, RTL mirroring |
| [localization.md](localization.md) | Why the picker's text lives in PHP, and the trap that forced it |
| [maintenance.md](maintenance.md) | Updating Font Awesome, adding a block, troubleshooting |

## The one thing to understand first

**A block stores a slug, never artwork.**

```
post_content:   <!-- wp:zealblocks/button {"icon":"heart"} /-->
                                                   ^^^^^
```

Everything else follows from that. Post content stays small, a regenerated icon
set applies to pages already published, and fixing an icon's geometry never
means touching the database.

Both renderers resolve that slug independently — PHP for the front end, React
for the editor — and they are written to agree. A difference between them shows
up as the block visibly changing when the page is published, so
`Icon_Library::render()` (PHP) and `<Icon>` (JS) are deliberate mirrors of each
other. Change one, change the other.

## End-to-end flow

```
  Font Awesome Free 7.3.1  (GitHub, pinned tag, sha256-verified)
            │
            │  npm run update-icons          bin/generate-icons-json.js
            ▼
  ┌─────────────────────────────┬──────────────────────────────┐
  │ includes/icon-handler/      │ src/ui/icon-library/         │
  │   icons.php      1.46 MB    │   icons-data.js     1.34 MB  │
  │   label + geometry          │   geometry ONLY, no text     │
  │   categories.php   83 KB    │                              │
  │   titles + membership       │                              │
  └─────────────────────────────┴──────────────────────────────┘
            │                                   │
   front end + editor                    picker only
            │                                   │
            ▼                                   ▼
  Icon_Library::render()              async webpack chunk
  Catalog::index()                    + /v1/icon-catalog  (text)
            │                                   │
            ▼                                   ▼
      <svg> in the page               the picker grid
```

## Where the code lives

```
bin/generate-icons-json.js              the generator

includes/icon-handler/
  class-library.php                     slug → geometry, front end + editor
  class-catalog.php                     titles, membership, labels — editor only
  class-rest.php                        /zealblocks/v1/icons, /icon-catalog
  class-editor-provider.php             inlines a post's icons into the editor
  icons.php          GENERATED          1,992 rows: label, width, height, path
  categories.php     GENERATED          68 titles + per-icon membership
  source.json        GENERATED          upstream version + sha256

src/ui/icon-library/
  index.js                              the public API — import from here only
  icon-control.js                       the inspector field
  icon-picker.js                        the dialog, search, virtualised grid
  use-icon.js                           slug → geometry in the editor, cached
  icons-data.js      GENERATED          geometry only, no translatable text
```

## Design decisions, and where they are explained

| decision | why | where |
|---|---|---|
| Two data files, not one | the front end needs one icon; the picker needs all of them | [data-and-mapping.md](data-and-mapping.md) |
| Picker data is an async chunk | 1.34 MB must not sit in the editor bundle | [editor.md](editor.md) |
| That chunk carries **no text** | strings in a chunk can never be translated | [localization.md](localization.md) |
| `icons.php` loads lazily | ~2,000 `__()` calls before `init` raise `_doing_it_wrong` | [frontend.md](frontend.md) |
| Icons are inlined, not preloaded | `apiFetch` preloading cannot match a batch request | [editor.md](editor.md) |
| Data is PHP/JS, never JSON | `wp i18n make-pot` cannot read JSON | [localization.md](localization.md) |
