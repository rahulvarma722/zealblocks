# Build and release

Merged from what used to be a separate releasing doc, because the build *is*
the first half of the release — the same script does both.

## Setup

```bash
npm install                                   # JS toolchain
composer install                              # PHPCS + WPCS + PHPCompatibility
```

Neither is needed to *run* the plugin, only to build and lint it. Nothing in
`vendor/` or `node_modules/` ships.

> **Local gotcha:** if `NODE_ENV=production` is set in your shell, `npm ci`
> installs **nothing** — every dependency here is a devDependency, so npm
> correctly skips them all and reports "up to date". Use
> `NODE_ENV=development npm ci --include=dev`. CI does not set the variable.

## Commands

| Command | Does |
|---|---|
| `npm run build:zip` | **Build the release ZIP** |
| `./bin/build-zip.sh` | Same, direct |
| `./bin/build-zip.sh --check` | ...then run Plugin Check on the **artifact** |
| `npm run build` | Compile `src/` → `build/` only |
| `npm run start` | Watch mode |
| `composer lint` / `npm run lint:php` | PHPCS |
| `composer format` / `npm run format:php` | PHPCBF |
| `npm run lint:js` / `lint:css` | ESLint / Stylelint |
| `./bin/rename.sh <slug>` | Rename the plugin — see [Renaming](RENAMING.md) |

`build-zip.sh` runs the linters and the build itself, so you do not need to run
them separately before packaging.

## How the ZIP is built

Four phases, failing at the first problem so a bad ZIP is never produced.

### 1. Preflight

Version agreement across the `Version:` header, `ZEALBLOCKS_VERSION` and readme
`Stable tag` · `Stable tag` is not `trunk` · no placeholder text · required
readme headers · short description ≤150 chars · ≤5 tags · `build/` exists with
at least one block · **runs the build** · no debug artifacts
(`SHOW_DIAGNOSTICS`, `console.log`, `var_dump`, `error_log`, `print_r`) ·
`ABSPATH` guard on every shipped PHP file · **PHPCS** · **ESLint + Stylelint** ·
`php -l`.

It *runs* the build rather than checking whether `build/` looks stale. Two
mtime-based attempts at that were both wrong for the same reason: webpack does
not rewrite an asset whose content is unchanged, so a source touched without
changing its output leaves `build/` legitimately older than `src/` forever, and
no timestamp comparison distinguishes that from a genuinely stale build.

### 2. Staging

Copies into a temp directory as `zealblocks/`, from an **allow-list**:

```
zealblocks.php  readme.txt  LICENSE  includes/  build/  src/  package.json
```

The allow-list is the key decision. Exclusion lists rot — add a directory,
forget to exclude it, and it ships. With an allow-list anything new is absent
by default. A second sweep then deletes `node_modules`, `vendor`, `.git`,
`.github`, `.gitignore`, `.eslintrc.js`, `composer.*`, `phpcs.xml.dist`,
`package-lock.json`, `docs`, `bin`, `dist` if any somehow appear, and prunes
`*.map`, `.DS_Store`, `*.LICENSE.txt`.

`src/` ships because `readme.txt` says it does — Guideline 4 requires the
source behind minified code to be available, and the readme is the promise
reviewers read.

### 3. Verify the staged tree

Against **the artifact**, not the repo. Each mirrors a Plugin Check *error*: no
hidden files · no `.sh` / `.exe` / `.phar` · no nested archives · no stray root
markdown · no bundled core libraries · the readme's `src/` claim actually holds
· required headers present in the staged main file.

### 4. Package

`dist/` is **cleared first** — every `*.zip`, not just the current version's
filename, with each removal logged. Otherwise old builds accumulate and it
stops being obvious which file is the one you just made, which is how
`zealblocks-0.0.1.zip` gets uploaded an hour after the bump to `0.0.2`.

Then zips from the temp dir, so the archive root is a single `zealblocks/` folder,
and asserts ≤10 MB.

## Checking the artifact

```bash
./bin/build-zip.sh --check          # WP_CLI=/path/to/wp if not on PATH
```

Requires wp-cli and the plugin-check plugin.

**Do not point Plugin Check at the working tree.** The repo legitimately holds
`bin/`, `dist/`, `.github/`, `.eslintrc.js`, `phpcs.xml.dist`, `.gitignore` —
none of which ship — so scanning it reports a fistful of errors that say
nothing about the submission, and trains you to skim past them. `--check`
installs the extracted ZIP alongside and scans that.

One narrow filter: Plugin Check derives the expected text domain from the
*directory name*, so a copy scanned as anything but `zealblocks` reports a
mismatch on every translated string. Those two codes are dropped and the script
says so. Nothing else is ignored.

## Cutting a release

```bash
# 1. Bump the version in ALL SIX places.
#      zealblocks.php    Version: header        <- gate checks
#      zealblocks.php    ZEALBLOCKS_VERSION       <- gate checks
#      readme.txt      Stable tag             <- gate checks
#      readme.txt      Changelog heading
#      package.json    version
#      src/*/block.json  version              <- block asset cache-busting
#
# 2. Add a changelog entry to readme.txt.
# 3. Verify.
./bin/build-zip.sh --check

# 4. Commit, tag, push.
git commit -am "release: 0.0.2"
git tag v0.0.2
git push origin main --tags
```

The gate enforces agreement on three of the six, so a miss there fails the
package. The other three it cannot check — keep them in step by hand.

## GitHub

`.github/workflows/release.yml` fires on a `v*` tag: builds on PHP 8.1 (the
declared minimum, so the release validates the floor the readme promises),
refuses if the tag disagrees with the `Version:` header, runs `build-zip.sh`,
and attaches two assets — `zealblocks-<version>.zip` plus a stable-named
`zealblocks.zip`, so this link always resolves to the newest:

```
https://github.com/rahulvarma722/zealblocks/releases/latest/download/zealblocks.zip
```

`.github/workflows/ci.yml` runs the same linters on every push and PR.

### Without Actions

```bash
./bin/build-zip.sh
gh release create v0.0.2 dist/zealblocks-0.0.2.zip --generate-notes
```

`gh release create` uses the REST API, not Actions, so this works even when
Actions is unavailable.

### Do not tell anyone to use "Code → Download ZIP"

That archive is the **repository**, not the plugin: `build/` is gitignored, so
it contains no compiled blocks and the plugin activates while registering
nothing. It also names the folder `zealblocks-<branch>` instead of `zealblocks`,
and ships `bin/`, `.github/` and the dot-files.

### Why the ZIP is not committed

A ZIP in the repo is a binary git can never forget — every version adds its
full size to history permanently and the diff says nothing. Release assets live
outside the object store. It also keeps `dist/` gitignored, which matters
beyond tidiness: Plugin Check reports a compressed file inside a plugin
directory as an **error**, and the Developer FAQ states plainly that ZIPs may
not be included in a plugin.

## WordPress.org

Guideline 3: a stable version **must** be available from the directory page,
and distributing elsewhere while letting the directory copy go stale can get a
plugin removed. GitHub releases are an addition, never a replacement.

Guideline 8: publishing a downloadable ZIP is fine. A plugin that **updates
itself** from anywhere other than WordPress.org is not. Do not add a
GitHub-based update checker.

```bash
svn co https://plugins.svn.wordpress.org/zealblocks
# copy the ZIP's CONTENTS into trunk/ — not the ZIP
svn cp trunk tags/0.0.2
svn ci -m "Release 0.0.2"
```

Set `Stable tag` in `trunk/readme.txt` to the tagged version. Icons, banners
and screenshots go in SVN `assets/` at the repository root — **never** inside
the plugin ZIP.

| Asset | Size |
|---|---|
| Icon | `icon-128x128.png`, `icon-256x256.png` |
| Banner | `banner-772x250.png`, `banner-1544x500.png` |
| Screenshots | `screenshot-1.png` … numbered to match the readme's list order |
