# Renaming this plugin

Every identifier is derived from two constants in `zealblocks.php`:

| Constant | Drives |
|---|---|
| `ZEALBLOCKS_SLUG` | folder name, text domain, script handles, block category |
| `ZEALBLOCKS_VERSION` | the canonical version; `bin/build-zip.sh` refuses to package unless it matches the `Version:` header and the readme's `Stable tag` |

Nothing else in the codebase contains the literal string `zealblocks` except
`block.json` files (where the block name must be a static string) and
`style.scss` (where the generated CSS class must be written out).

There is deliberately no `ZEALBLOCKS_NAMESPACE` constant. `register_block_type()`
reads the block name only from `block.json`, so a constant beside it could only
duplicate that literal and drift from it. `bin/rename.sh` rewrites both.

## Before release — cheap

```bash
./bin/rename.sh brick-yard                 # dry run, lists what changes
./bin/rename.sh brick-yard --go            # apply
```

The display name is derived from the slug (`brick-yard` becomes `BrickYard`);
pass one explicitly as the second argument to override it. The script rewrites
every text file outside `node_modules/`, `vendor/`, `build/` and `dist/`, renames
the files whose names carry the slug, updates its own baseline so it can be run
again, and then **verifies no occurrence survives** — it exits non-zero rather
than leaving a half-renamed tree.

Afterwards:

```bash
rm -rf build && npm run build
rm -rf vendor && composer install     # composer.json name changed
./bin/build-zip.sh                    # re-run the release gate
```

Then deactivate and reactivate the plugin, since the folder path changed.

## After release — expensive

Two things persist in the database and the script cannot reach them:

1. **Block names.** Post content stores `<!-- wp:zealblocks/button -->`. Change
   the namespace and every existing post shows "This block contains
   unexpected content."
2. **Static block classes.** `save.js` output is saved into post content, so
   `wp-block-zealblocks-button` is baked into published markup.

Handling that properly means shipping `deprecated` definitions on each block
so the old name still parses, or running a content migration. Neither is
hard, but both are permanent maintenance.

**So:** treat the block namespace as permanent from your first release.
`ZEALBLOCKS_SLUG` and the display name stay cheap to change — which is why the
display name lives in a plugin header rather than in an identifier.

## Rules that keep it that way

- Never write a block name as a literal. Import it from `block.json`:
  `registerBlockType( metadata.name, … )`.
- Never call `get_option( 'zealblocks_x' )` with a hardcoded prefix; build the key
  from `ZEALBLOCKS_SLUG`. There is no options wrapper at present, because the
  plugin stores no settings — add one when it does, rather than keeping an
  unused class around in anticipation.
- Never hardcode a script handle. Build it from `ZEALBLOCKS_SLUG`, or read it back
  off the registered `\WP_Block_Type`, as `Zealblocks\Block\Registrar` does.
- Keep the display name (`Plugin Name:` header, admin titles) out of
  identifiers. It should be free to change at any time.
