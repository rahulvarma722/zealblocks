# Testing

Three suites, split by what they need to run.

| Suite | Needs | Speed | Command |
|---|---|---|---|
| **PHP unit** | Nothing — plain PHP | ~7ms | `composer test` |
| **JS unit** | Node | ~0.6s | `npm run test:js` |
| **Integration** | A live WordPress + wp-cli | ~2s | `npm run test:integration` |

```bash
npm test                    # both unit suites
npm run test:integration    # WP_CLI=/path/to/wp if not on PATH
```

The two unit suites run in the release gate (`bin/build-zip.sh`) and in CI, so a
failure blocks the ZIP. The integration suite is opt-in, because a release
should not be blocked by wp-cli being absent from someone's machine.

## The split, and why it matters

**Unit tests must not know about WordPress.** `tests/unit/bootstrap.php` stubs
only the trivial functions — `wp_json_encode`, `apply_filters` with nothing
attached, `wp_get_global_settings` with no theme.json. That is enough to test
*our* logic and nothing more.

Anything whose **WordPress behaviour is the point of the test** belongs in
integration, because a stub would simply agree with whatever we assumed. Three
real examples from this codebase:

- `esc_url()` *drops* a `javascript:` URL rather than escaping it — which is why
  the tag choice must branch on the escaped value
- `wp_kses()` lowercases attribute names, so it cannot express `viewBox`
- `get_block_wrapper_attributes()` merges classes and `esc_attr()`s each value

Each of those is a fact about WordPress. Asserting them against a stub proves
nothing.

## PHP unit — `tests/unit/`

Plain PHPUnit 10, no WordPress, no Docker, 23 tests in about 7ms.

| File | Covers |
|---|---|
| `BlockContractTest.php` | **invariants that span files** — see below |
| `AutoloaderTest.php` | class / interface resolution, declined names, path traversal |
| `BlockRenderTest.php` | attribute reads, allow-lists, token filtering, `responsive()` |
| `ResponsiveStylesTest.php` | layer reads, the length allow-list, negatives, CSS output |

Fast enough to run on every save. If a test needs a WordPress function that is
not stubbed, that is a signal it belongs in integration — not a signal to add
another stub.

### Contracts that span files

`BlockContractTest.php` is a different kind of test and worth calling out.

A block is declared across `block.json`, `index.js` and `render.php`, and some
rules binding them are invariants **no single file can check**:

| Invariant | What goes wrong without it |
|---|---|
| `source` on an attribute requires a `save()` that writes markup | Core parses the value out of markup that never gets written. Content stored nowhere, block renders empty |
| A block with inner blocks must not `save: () => null` | Core writes a self-closing comment and **discards every child** at save time |
| A declared `render` template must exist | Block registers and renders nothing |
| `name` / `category` / `textdomain` must match the plugin | Blocks land in Uncategorized; translations never load |
| `block.json` `version` must match the plugin version | Browsers stay on a stale asset bundle |

The first two **both shipped as real bugs**, and both were documented as traps
in [BLOCKS.md](BLOCKS.md) *first*. That did not help, because a comment cannot
fail a build. The checks now live at the same scope as the invariants: they read
the files together and assert the relationship.

Blocks are discovered by scanning `src/`, so a new block is covered the moment
it exists — there is no list to forget.

**Each guard was verified by reintroducing its bug**, which is the only way to
know a guard works. Worth doing whenever you add one; a check that cannot fail
is decoration.

## JS unit — `tests/js/`

Jest via `wp-scripts test-unit-js`, 13 tests.

Covers `style-value.js`: reading and writing across the three style-state
layers, immutability, and layer pruning. The most important single assertion is
`MOBILE FALLS BACK TO BASE, NOT TABLET` — core's bands are mutually exclusive
ranges, and getting that wrong produces a tablet-into-mobile cascade that
disagrees with every core control on the same block, while looking correct until
you switch device.

## Integration — `tests/integration/`

38 checks, run inside a real WordPress via wp-cli:

```bash
npm run test:integration
WP_CLI=/path/to/wp ./bin/test-integration.sh
```

Covers registration and the module registry, the happy render path, hostile
input through every attribute, edge cases, and **PHP notices** — the suite
installs an error handler scoped to plugin files and fails on any notice,
warning or deprecation. That handler has already earned its place: it caught an
undefined variable left behind by a refactor that all fifteen output assertions
had happily passed.

### Why wp-cli and not wp-env

The standard answer is `wp-env`, which needs Docker. This runs against **any**
WordPress — a Local site, a staging install, a CI container — so it works
without Docker and does not need a second WordPress downloaded to test against.

The trade-off is honest: it tests against *your* WordPress version rather than a
pinned matrix. For a plugin that declares a single floor (`Requires at least:
7.1`) and reads core internals, testing against the real thing you develop on is
the more useful signal.

### Two harness bugs worth knowing about

Both were found by deliberately breaking a check to confirm the suite fails —
which is worth doing whenever you add a gate.

1. `wp eval-file` includes the file **inside a function**, so a top-level
   `$counter` is a local variable and `global $counter` in a helper binds to a
   different, unset one. Counts stayed at zero while every check printed PASS,
   and the exit code never fired. The counters live in `$GLOBALS` now.

2. A wrapper script that pipes wp-cli's output through `grep` reports **grep's**
   exit status, not wp-cli's. `bin/test-integration.sh` therefore checks two
   independent signals: the exit code *and* the printed summary line.

## What is not covered yet

Worth stating plainly so nobody assumes otherwise:

- **The editor.** `edit.js` and `use-style-state.js` have no tests. The state
  detection mounts probes into core's slots, so testing it needs
  `@wordpress/element` render helpers and mocked stores — worthwhile, not done.
- **Visual regression.** No screenshot comparison of rendered blocks.
- **Multiple WordPress versions.** One floor is declared and one version tested.
- **PHP 8.1 specifically.** CI runs the declared minimum; local runs 8.2.

## Adding tests

Pure PHP logic → `tests/unit/`. Needs WordPress → add a `zealblocks_check()` line to
`tests/integration/test-render.php`. Pure JS → `tests/js/`.

Keep the assertion messages specific. `assertTrue( $result )` tells you nothing
at 3am; `'negative width rejected'` tells you what broke.
