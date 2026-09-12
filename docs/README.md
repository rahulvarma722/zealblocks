# Zealblocks — developer documentation

A Gutenberg block collection built on the WordPress 7.1 block API. Four blocks:
a buttons container and its child, an icon, and a text block. Core 7.1 already
emits per-viewport CSS for its own style paths, so the plugin inherits that
rather than reimplementing it; what it adds is per-viewport support for
properties core has no support for, stored in core's own `style` attribute
under a namespaced key and generated with core's breakpoints.

## Where to start

| Document | What it covers |
|---|---|
| [Architecture](ARCHITECTURE.md) | Namespace, autoloader, bootstrap order, class map, file layout |
| [Blocks](BLOCKS.md) | Registration by directory scan, `block.json`, the save/render split, parent–child |
| [Styles](STYLES.md) | SCSS layout, class naming, the per-viewport mechanism, the CSS-variable indirection |
| [Testing](TESTING.md) | The three suites, what each is for, and how to add to them |
| [Build and release](BUILD-AND-RELEASE.md) | `npm run build:zip`, the release gate, linting, GitHub + WordPress.org |
| [Renaming](RENAMING.md) | Changing the plugin's name, and what becomes permanent after the first release |
| [Responsive styles experiment](RESPONSIVE-STYLES-EXPERIMENT.md) | The R&D log behind the per-viewport work: what was tried, what core allows, two bugs found |

## The 60-second version

```
zealblocks.php              header + constants + boot (GLOBAL namespace)
  └─ includes/            everything else, namespace Zealblocks
       class-autoloader.php        Zealblocks\* -> includes/class-*.php
       class-plugin.php            module registry: a list of what is enabled
       class-helper.php            environment getters (breakpoints, paths)
       class-responsive-styles.php turns per-viewport values into CSS
       block/                      code that talks to the block API
         class-registrar.php         registers every block found in build/
         class-render.php            shared render-template helpers
  ├─ src/                 authored blocks — edit.js, block.json, scss, render.php
  └─ build/               wp-scripts output; THIS is what gets registered
```

Two facts explain most of the surprising decisions in this codebase:

1. **Blocks are registered from `build/`, not `src/`.** `wp-scripts` copies
   `block.json` and `render.php` across at build time, and the compiled
   `block.json` references asset files that only exist there. `build/` is
   gitignored, so a fresh clone needs `npm install && npm run build` before the
   plugin does anything at all.

2. **Per-viewport values live inside core's `style` attribute** under a
   namespaced key, not in attributes of our own. That is what makes a Zealblocks
   control behave like a core one — same breakpoints, same state model, same
   reset behaviour — and it is why `render.php` has to generate the CSS itself.

## Conventions

- **PHP** — WordPress-Extra + WordPress-Docs, enforced by `composer lint`.
  Namespaced `Zealblocks\*`, autoloaded, no global functions or classes added.
- **JS/CSS** — `@wordpress/scripts` defaults, enforced by `npm run lint:js` and
  `npm run lint:css`.
- **No literals for identity.** Block names come from `block.json`, option keys
  and handles from `ZEALBLOCKS_SLUG`. See [Renaming](RENAMING.md) for why.
- **Comments explain *why*.** The what is readable from the code; the reason a
  non-obvious choice was made is not, and this codebase leans on core
  internals often enough that the reason matters.
