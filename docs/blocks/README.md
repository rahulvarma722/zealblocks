# Blocks

Four blocks: a container, its only permitted child, an icon, and a text block.

| block | file | what it is |
|---|---|---|
| [`zealblocks/buttons`](button.md) | `src/buttons/` | flex container, accepts Button only |
| [`zealblocks/button`](button.md) | `src/button/` | link or button with an optional icon |
| [`zealblocks/icon`](icon.md) | `src/icon/` | a standalone SVG icon |
| [`zealblocks/text`](text.md) | `src/text/` | a paragraph with a visual style preset |

## Registration

`includes/block/class-registrar.php` scans `build/` and registers everything it
finds. **Blocks register from `build/`, never `src/`** — nothing in `src/` is
loaded at runtime, which is why `npm run build` is required after a checkout.

The block namespace `zealblocks/…` is written as a literal in each
`block.json`, because that is the only place `register_block_type()` reads it
from. A constant beside it could only duplicate the value and drift from it.

The registrar also calls `wp_set_script_translations()` per handle, reading the
handle back off the registered type rather than rebuilding the name — that
naming is core's private business.

## The save/render split — the trap worth knowing

Every block here returns `null` from `save()` and renders in PHP through
`render.php`. That keeps one source of truth for markup, but it has a sharp
edge:

**A block returning `null` writes nothing to post content except its attributes.**

```html
<!-- wp:zealblocks/text {"content":"Hello","styleAs":"caption"} /-->
```

So an attribute declared with `"source": "rich-text"` — which tells core to
parse the value back out of saved markup — reads back **empty**, because there
is no markup to parse. The editor looks correct until you reload.

This shipped as a bug once and reached the front end. There is now a round-trip
test: attributes → `serialize_blocks()` → parse → render, plus one through a
real post and `the_content`.

The same trap applies to a container that returns `null` and discards its inner
blocks.

## `render.php`

Each block's `render.php` is `require`d by core from inside a **static closure**
(`wp-includes/blocks.php:629`), so every assignment is function-scoped despite
looking global. That is why the files carry:

```php
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
```

A file-level `use` works in a file with no `namespace` declaration, because
`use` is lexical and per-file:

```php
use Zealblocks\Block\Render as Block_Render;
use Zealblocks\Icon_Handler\Library as Icon_Library;
```

### Shared helpers — `Zealblocks\Block\Render`

| method | what it does |
|---|---|
| `text( $attrs, $key )` | a string attribute, or `''` |
| `one_of( $value, $allowed, $fallback )` | validates against a fixed list |
| `tokens( $value, $allowed )` | validates a space-separated set |
| `url( $url )` | `esc_url()` with the protocol allow-list |
| `responsive( … )` | per-viewport CSS through the style engine |

`one_of()` matters wherever a stored value lands in a **structural** position —
an element name, a class that must have a rule behind it. A value in an element
position is an XSS boundary, not a styling preference.

## `block.json` notes

- `"version"` must match the plugin version. `build-zip.sh` cannot see these
  four files; `BlockContractTest` is what catches a mismatch.
- `"role": "content"` marks attributes that carry user content, for core's
  content-only editing mode.
- Styles are split by filename: `style.scss` → front end **and** editor canvas,
  `editor.scss` → editor only. Renaming one silently changes where it loads.

## Adding a block

1. `src/<name>/` with `block.json`, `index.js`, `edit.js`, `render.php`
2. `style.scss` / `editor.scss` as needed
3. `npm run build` — the registrar finds it automatically
4. Add it to `tests/unit/BlockContractTest.php`'s expectations

No registration list to update. The registrar scans.
