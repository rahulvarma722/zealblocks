# Icons — localization

**2,060 strings — 1,992 icon labels and 68 category titles — live in PHP, not
in the picker's JavaScript. That is the single most important fact in this
document, and it is not an optimisation.**

## The trap

`src/ui/icon-library/icons-data.js` builds into an **async webpack chunk**,
fetched by the webpack runtime rather than enqueued with `wp_enqueue_script`.

WordPress resolves JS translations by `md5()` of a **registered script handle's
`src`** (`_load_script_textdomain_from_src`). A chunk is not a handle, so a
string inside it has nothing to be found under.

What that looked like in practice:

```
wp i18n make-pot      → 2,058 strings extracted from build/icons-data.js   ✓
wp i18n make-json     → zealblocks-<locale>-9145c32….json written          ✓
WordPress             → never requests that file                           ✗
```

Everything appeared to work. The strings extracted, translators could translate
them, the JSON was generated — and every icon name stayed English in every
locale, with no error anywhere.

## The fix

Move the text to PHP, where translation already works end to end:

| | before | after |
|---|---|---|
| `icons-data.js` | geometry + labels + categories, 2,058 `__()` | geometry only, **0 `__()`** |
| `icons.php` | labels | labels (unchanged) |
| `categories.php` | — | titles + membership, 68 `__()` |
| picker gets text from | the chunk | `GET /zealblocks/v1/icon-catalog` |

Proof, from `wp i18n make-pot` before and after:

```
before                              after
2058  build/icons-data.js           ← gone entirely
1992  includes/…/icons.php          1992  includes/…/icons.php
                                      68  includes/…/categories.php
  33  build/button/index.js           33  build/button/index.js
```

`build/icons-data.js` no longer appears in the POT at all. Every remaining JS
string sits in a block's own `index.js`, which **is** a handle's `src`, so
`make-json` keys it correctly with no mapping.

## The rule

> **Never add a translatable string to `icons-data.js`.**

It will extract, it will generate a JSON, and it will never be loaded. The
generated file's header says so, but nothing enforces it. If you add text to the
picker, the string belongs in PHP and reaches the browser through the catalog
route.

## Why the data files are code, not JSON

`wp i18n make-pot` extracts from **PHP and JavaScript and nothing else**.

A label in a `.json` file could never reach a `.pot`, so it could never be
translated. The picker **searches labels**, so an untranslated label means a
French user cannot find an icon by typing French.

Identical msgids collapse, so translating `Heart` once fixes the front-end
`aria-label` and the picker tile together.

## Generating translations

```bash
wp i18n make-pot . languages/zealblocks.pot \
  --exclude=node_modules,vendor,tests,dist,bin,src
```

`src/` is excluded and `build/` scanned, because `make-json` keys files by their
**built** path — that is what WordPress looks up.

```bash
wp i18n make-json languages/     # JS translations, one file per handle
wp i18n make-mo   languages/     # PHP translations
```

Both land in `WP_LANG_DIR/plugins/` on a hosted plugin. `wp_set_script_translations()`
is called per registered block handle in `includes/block/class-registrar.php`,
with **no path argument**, so core reads from `WP_LANG_DIR/plugins` — exactly
where translate.wordpress.org delivers.

## What translates, and what needs what

| | source | delivered by |
|---|---|---|
| icon labels | `icons.php` | `.mo` / `.l10n.php` |
| category titles | `categories.php` | `.mo` / `.l10n.php` |
| block titles, descriptions | `block.json` | core handles it |
| inspector labels, control text | `build/*/index.js` | `zealblocks-<locale>-<md5>.json` |

PHP strings work with a `.mo` alone. **Editor-bundle strings additionally need
the JSON** — Loco Translate does not emit one by default, so those stay English
until it is generated.

## The rejected alternative

`wp_set_script_translations( $handle, $domain, $path )` does support a
handle-named JSON:

```php
$handle_filename = $domain . '-' . $locale . '-' . $handle . '.json';
if ( $path ) {
	$translations = load_script_translations( $path . '/' . $handle_filename, … );
	if ( $translations ) return $translations;   // returns, does NOT merge
}
```

It **returns instead of merging**, so one bundled file per locale would shadow
translate.wordpress.org entirely for that locale. Hand-maintaining every
language is not a trade worth making for a .org-hosted plugin.

`wp i18n make-json --use-map` can fold a chunk's strings into a handle's JSON,
and works — but only for translations **you** build. translate.wordpress.org
runs its own `make-json` and knows nothing about the map, so .org-delivered
translations would still miss them. Moving the text to PHP removes the problem
rather than patching it.

## Verifying

```bash
# no translatable strings in the chunk
grep -c "__(" src/ui/icon-library/icons-data.js       # must be 0

# the chunk must not appear in the POT
grep "build/icons-data.js" languages/zealblocks.pot   # must be empty
```

End to end, with a real translation installed:

```bash
wp eval 'add_filter("locale", fn() => "hi_IN", 99);
  echo Zealblocks\Icon_Handler\Library::get("accessible-icon")["label"];'
```

And over HTTP, the request the editor actually makes:

```bash
curl -u user:app-password \
  "http://localhost/wp-json/zealblocks/v1/icon-catalog?_locale=user"
```

## `_doing_it_wrong` and `after_setup_theme`

Both generated PHP files call `__()` on include, so both load lazily. See
[frontend.md](frontend.md).

Worth knowing when testing: core's guard **short-circuits** when no translation
file exists for the domain —

```php
if ( ! $wp_textdomain_registry->has( $domain ) ) { return false; }
```

— so with no translations installed the notice can never fire, and a clean test
run proves nothing. Install a translation first, then test.
