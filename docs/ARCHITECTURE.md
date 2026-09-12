# Architecture

## File layout

```
zealblocks.php                          plugin header, constants, boot
includes/
  class-autoloader.php                Zealblocks\*  ->  includes/{class,interface,trait}-*.php
  interface-module.php                the contract every feature implements
  class-plugin.php                    module registry
  class-helper.php                    shared environment getters
  class-responsive-styles.php         per-viewport values -> CSS
  block/                              code that talks to the block API
    class-registrar.php               registration + category + JS translations  [Module]
    class-render.php                  shared render-template helpers
src/
  button/                             authored source for zealblocks/button
  buttons/                            authored source for zealblocks/buttons
build/                                wp-scripts output (gitignored, but SHIPPED)
bin/
  build-zip.sh                        release gate + packaging
  rename.sh                           rename the whole plugin
docs/                                 this documentation
```

## Why `block/` is a folder, and what may go in it

In a block plugin, "block related" is nearly as broad as "helper" — almost
everything relates to blocks. A folder with that admission rule becomes the same
dumping ground one level down.

So the criterion is narrower: **`block/` holds code that talks to the WordPress
block API.** Not code that merely gets used by blocks.

| Class | In `block/`? | Why |
|---|---|---|
| `Block\Registrar` | yes | `register_block_type()`, `block_categories_all`, script translations |
| `Block\Render` | yes | Render-template plumbing — `get_block_wrapper_attributes()`, attributes |
| `Responsive_Styles` | no | Generates CSS. Knows nothing about the block API |
| `Helper` | no | Environment queries |
| `Plugin`, `Autoloader`, `Module` | no | Plugin infrastructure |

Two levels of nesting is the cap. `Zealblocks\Blocks\Text\Presets\Sizes` is a
directory tree pretending to be a design.

## Namespace and autoloading

Everything except the main file lives under the `Zealblocks` namespace and is
loaded on demand.

```php
Zealblocks\Autoloader          includes/class-autoloader.php
Zealblocks\Module              includes/interface-module.php      <- interface-
Zealblocks\Plugin              includes/class-plugin.php
Zealblocks\Helper              includes/class-helper.php
Zealblocks\Block\Registrar     includes/block/class-registrar.php
Zealblocks\Block\Render        includes/block/class-render.php
Zealblocks\Responsive_Styles   includes/class-responsive-styles.php
```

Three prefixes are tried in order — `class-`, `interface-`, `trait-` — because
PHP gives an autoloader no way to know which kind it was asked for:
`class_exists()`, `interface_exists()` and `trait_exists()` all route here
identically. Two extra `file_exists()` calls on a miss is cheaper than encoding
the kind into every type name (`Module_Interface`, `I_Module`) forever.

The mapping strips the namespace, lowercases the rest, turns `_` into `-`, and
prefixes `class-`. Sub-namespaces become sub-directories, so
`Zealblocks\Block\Registrar` resolves to
`includes/block/class-registrar.php` with no extra registration.

### Why not Composer's autoloader

Composer is a **dev** dependency here — it installs PHPCS and nothing else, and
`vendor/` is excluded from the release ZIP. Depending on `vendor/autoload.php`
at runtime would invert that: the plugin could not boot without shipping
Composer's autoloader plus its `composer/` support files, several hundred files
of machinery to resolve five classes. It would also make `composer install` a
build step for anyone cloning the repo rather than only a linting one.

The hand-written autoloader is about thirty lines and has no runtime
dependency.

### Three namespace consequences worth knowing

**Global classes must be fully qualified.** Inside a namespace, an unqualified
class name resolves *within that namespace* — there is no fallback to global.
So `$x instanceof WP_Block_Type` inside `Zealblocks\Block\Registrar` would test against
`Zealblocks\WP_Block_Type`, which does not exist, and silently evaluate false.
Core classes are written `\WP_Block_Type`, `\WP_Theme_JSON`.

**Functions and constants do fall back.** Unqualified `add_action()`,
`esc_html()`, `ZEALBLOCKS_PATH` and `ABSPATH` resolve to global if no namespaced
version exists, which is why they are left unqualified throughout.

**`render.php` is a special case.** Core requires it from inside a closure in
`wp-includes/blocks.php`, which is *global* scope regardless of where the file
sits on disk. Every plugin class it uses is therefore written fully qualified,
leading separator included: `\Zealblocks\Responsive_Styles::build_rules()`.

## Boot order

`zealblocks.php` stays in the global namespace, because a plugin's main file is
also its header block and WordPress reads that by parsing the file rather than
loading it.

```
1.  Guard          defined( 'ABSPATH' ) || exit
2.  Constants      ZEALBLOCKS_VERSION, ZEALBLOCKS_SLUG, ZEALBLOCKS_PATH
                   ZEALBLOCKS_MIN_PHP, ZEALBLOCKS_MIN_WP
3.  Autoloader     require + register — the only require in the file
4.  Boot           Zealblocks\Plugin::init()
                     ├─ filter `zealblocks_modules` (the extension point)
                     └─ for each module: new, then ->register()
                          └─ Block\Registrar: add_action( 'init', … )
                                     add_filter( 'block_categories_all', … )
```

**There is no runtime version check**, deliberately. Core validates
`Requires at least` and `Requires PHP` inside `activate_plugin()`
(`wp-admin/includes/plugin.php`) and refuses to activate below either floor;
the plugins list screen flags incompatibility too.

Core does not re-check an already-active plugin on later loads, so a host
downgrading afterwards goes unnoticed — but that produced no crash to catch:
the plugin uses no syntax newer than its floor, and its one WordPress 7.1
dependency is guarded at the point of use in `Helper::media_queries()`, with a
documented pre-7.1 fallback.

If a future feature genuinely cannot degrade, guard it **at its own call site**.
A global gate disables the whole plugin over one feature's dependency.

One caveat on the floor itself: PHPCompatibility 9.3.5 predates PHP 8 and has
no sniffs for its syntax, and newer versions require PHPCS 4.x which WPCS does
not yet support. So `testVersion` catches removed/added *functions* but not new
*syntax* — which is why CI runs the suite on 8.1 itself. Executing on the floor
is the only real check that the floor holds.

## Constants

| Constant | Purpose |
|---|---|
| `ZEALBLOCKS_VERSION` | Canonical version. `bin/build-zip.sh` refuses to package unless this, the `Version:` header and readme's `Stable tag` agree. |
| `ZEALBLOCKS_SLUG` | Folder name, text domain, script handles, block category. |
| `ZEALBLOCKS_PATH` | Absolute plugin path, used by the autoloader and block scan. |
| `ZEALBLOCKS_MIN_PHP` / `ZEALBLOCKS_MIN_WP` | The declared floor, checked at load. |

There is deliberately **no** namespace constant — `register_block_type()` reads
block names only from `block.json`, so a constant could only duplicate that
literal and drift from it. See [Renaming](RENAMING.md).

## The classes

### `Plugin` — the module registry
A list of what is enabled, not a place where behaviour accumulates. It
instantiates each entry in `MODULES`, checks it implements `Module`, and calls
`register()`.

The list passes through a `zealblocks_modules` filter first, and that is the
extension point the plugin is built around. A growing plugin acquires features
faster than it acquires places to put them, and the usual failure is a bootstrap
that becomes a wall of conditionals — `if ( $pro ) … if ( get_option( … ) ) …`.
Filtering the list means a feature can be gated by anything: a licence, a
setting, an environment, a test. The filter runs before any module is
constructed, so a disabled module costs nothing.

Entries can come from third parties through that filter, so `instantiate()` is
defensive: `class_exists()` triggers the autoloader, the interface check keeps
the contract honest, and a bad entry is skipped rather than fatal.

Instances are kept and reachable via `Plugin::module()`, so a test or a
collaborating module can get at one.

### `Module` (interface)
One method, `register()`, which adds hooks and must not do work directly — a
module that queries or renders there runs on every request including
admin-ajax and cron.

Why an interface rather than a convention: without a contract, a typo'd method
name fails at runtime, on a hook, possibly only on the front end. With one, PHP
refuses to load the module and the failure is at the mistake.

Why instances rather than static `init()`: the static form was fine while
nothing had dependencies. It stops being fine the moment a module needs a
collaborator or a test needs to substitute one — a static method cannot be
given a fake, and static state does not reset between test cases.

### `Block\Render`
The parts every render template repeats: attribute reads, allow-lists, token
filtering, per-instance responsive rules, and the `LABEL_HTML` allow-list. Extracted when `button/render.php` hit 408 lines with
23 escaping call sites, roughly half of which were not about buttons at all.

All static, and correct as such: these are pure functions with no state and
nothing to inject. The `Module` note above is about where instances *do* earn
their keep.

No `load_plugin_textdomain()` call: core has loaded translations for
.org-hosted plugins just-in-time since 4.6, and Plugin Check flags the manual
call as discouraged. The text domain must still match the folder slug for that
to work.

### `Block\Registrar`
Registers every block found by scanning `build/` — adding a block means adding
a directory under `src/`, with no PHP to update. Also:

- Adds the plugin's block category, matching the `category` field each
  `block.json` declares, or the blocks land in "Uncategorized".
- Calls `wp_set_script_translations()` for each registered block.
  `register_block_type()` handles the strings *inside* `block.json` but not the
  `__()` calls in the compiled editor script, which is where the control labels
  actually live. Handles are read back off the returned `\WP_Block_Type` rather
  than reconstructed, because the naming is core's private business
  (`generate_block_asset_handle()`).

### `Helper`
One place to ask a question about the environment: the breakpoints in force,
the media queries for each viewport state, the plugin's paths and slug, whether
this request is the editor.

**The rule that keeps it from becoming a junk drawer:**

| | Belongs |
|---|---|
| A getter returning a fact about the site | `Helper` |
| A function transforming its arguments | the class that owns that concern |

So `Helper::media_queries()` lives here, while `Responsive_Styles::build_rules()`
does not — it *asks* Helper for the bands and gets on with generating CSS. A
"helpers" class with no such rule eventually holds everything, becomes
impossible to test in isolation, and every file depends on it.

Results are memoised **per request**. `wp_get_global_settings()` is not free and
was previously resolved once per block instance; a page can hold dozens.
`flush()` exists for tests, which change theme.json between cases in one
process — nothing in the plugin needs it, because theme.json does not change
mid-request.

`breakpoints()` validates what it reads. theme.json is authored by hand and can
say anything, so a value that is not a well-formed CSS length falls back rather
than reaching a stylesheet.

### `Responsive_Styles`
Converts namespaced per-viewport values into CSS, using the bands
`Helper::media_queries()` resolves. Covered in [Styles](STYLES.md).

## What this plugin does not do

Worth stating, because their absence is deliberate and a reviewer will check:

- No options are stored, no settings page, no `register_setting()`.
- No database queries, no `$wpdb`.
- No AJAX handlers, no REST routes — so no nonces to verify.
- No external HTTP requests, no tracking, no update checker.
- No front-end JavaScript. Every block renders server-side.
- No bundled copies of libraries WordPress already ships.
