# Zealblocks — developer documentation

A Gutenberg block collection built on the WordPress 7.1 block API.

## Where to start

| if you want to… | read |
|---|---|
| understand the plugin's shape | [architecture.md](architecture.md) |
| work on a block | [blocks/](blocks/README.md) |
| work on icons | [icons/](icons/README.md) |
| work on per-viewport values | [responsive-styles/](responsive-styles/README.md) |
| understand the CSS conventions | [styles.md](styles.md) |
| add or run tests | [testing.md](testing.md) |
| cut a release | [build-and-release.md](build-and-release.md) |

## The 60-second version

Four blocks — `buttons`, `button`, `icon`, `text` — all of which return `null`
from `save()` and render in PHP. Blocks register from `build/`, so
`npm install && npm run build` is required after a checkout or the plugin
activates while registering nothing.

Two features carry most of the complexity:

- **Icons** — 1,992 bundled Font Awesome icons, resolved by slug, with a
  searchable picker. Roughly 4,500 hand-written lines plus three generated files.
- **Responsive styles** — per-viewport values built on core's style states.

## Layout

```
includes/              PHP. Namespaced Zealblocks\, PSR-4-ish autoloading
  block/               registration and render helpers
  icon-handler/        the icon library (+ 2 generated files)
src/                   JS and SCSS sources — NOT loaded at runtime
  <block>/             one folder per block
  ui/                  shared editor UI: icon library, Tailwind, shadcn dialog
build/                 what actually loads. Generated. gitignored
bin/                   generator, zip builder, integration runner
tests/                 unit (PHP), js (Jest), integration (real WordPress)
docs/                  you are here
```

## Conventions

- **Comments explain why, not what.** If a line's reason is not obvious from the
  code, it gets a comment; otherwise it does not.
- **Decisions are recorded where they bind**, not in a changelog. A constraint
  that will trip someone up belongs next to the code that depends on it.
- **Generated files are committed** and marked as generated in their headers.
  Never edit them by hand.
- **Verify in compiled output**, not source. Several real bugs here passed every
  gate while being broken — a Tailwind class that silently generated nothing, an
  RTL rule inverted by RTLCSS, translations keyed to a file nothing loads.

## Documentation layout

Feature-based. A feature gets a folder when it is large enough to need one, and
a single file otherwise.

```
docs/
├── README.md                    this file
├── architecture.md              boot, autoloading, modules, editor data
├── icons/                       6 files — the largest feature
├── blocks/                      shared concerns + one file per block
├── responsive-styles/           the shipped feature + the R&D bench
├── styles.md
├── testing.md
└── build-and-release.md
```

When adding a feature, document what a developer actually needs to **set it up,
understand its data flow, extend it and troubleshoot it** — not every section
mechanically. Only what applies.
