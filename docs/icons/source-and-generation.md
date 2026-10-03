# Icons — source and generation

## The source

| | |
|---|---|
| Project | **Font Awesome Free** |
| Version | **7.3.1** (pinned tag, never a branch) |
| Licence | **CC BY 4.0** — https://fontawesome.com/license/free |
| Repository | https://github.com/FortAwesome/Font-Awesome |

Two files are read, both from the **same tag**:

| file | raw URL | what we take |
|---|---|---|
| `metadata/icons.json` | `raw.githubusercontent.com/FortAwesome/Font-Awesome/7.3.1/metadata/icons.json` | label, width, height, SVG path |
| `metadata/categories.yml` | `…/7.3.1/metadata/categories.yml` | category titles and their member icons |

### Attribution is not optional

CC BY 4.0's single obligation is credit. It is given in three places:

- `readme.txt` → `= Credits =`
- the header of `includes/icon-handler/icons.php`
- the header of `src/ui/icon-library/icons-data.js`

Font Awesome's own attribution comment does not survive the extraction — we take
the `path` string, not their markup — so these are the only credit that ships.
**Do not remove them.**

## What we include and exclude

### Included

| field | from | used for |
|---|---|---|
| slug | the JSON key | what a block stores |
| `label` | `entry.label` | the picker tile, `aria-label`, search |
| `width` / `height` | `entry.svg.*.width/height` | the `viewBox` |
| `path` | `entry.svg.*.path` | the `<path d="">` |
| categories | `categories.yml`, **inverted** | the picker sidebar |

### Excluded, and why

Eight raw fields are dropped: `raw`, `viewBox`, `changes`, `unicode`,
`ligatures`, `styles`, `free`, `voted`.

`raw` alone is about a third of the input — the same artwork as `path`, wrapped
in markup we rebuild in one line. `viewBox` is an array of
`[0, 0, width, height]`, so both numbers are already held.

**4.63 MB in → 1.46 MB out.**

### Style selection — `brands || solid`, in that order

```js
const art = entry.svg?.brands || entry.svg?.solid;
```

Brand icons exist **only** in the brands style. Checking `solid` first would
silently drop GitHub, Facebook and every logo. An icon with neither, or missing
`path`/`width`/`height`, is skipped and counted.

## Running the generator

```bash
npm run update-icons                       # pinned to 7.3.1
node bin/generate-icons-json.js --version=7.4.0   # a different tag
```

Output:

```
Font Awesome Free 7.3.1
  icons.json      4.63 MB  sha256 8b825be9cbe4a782…
  categories.yml  55 KB    sha256 967e6cf962d27205…

  icons written   1992
  categories      68

  includes/icon-handler/icons.php       1494 KB
  includes/icon-handler/categories.php    83 KB
  src/ui/icon-library/icons-data.js     1369 KB
  includes/icon-handler/source.json  provenance recorded
```

## Why a pinned tag

Font Awesome's `7.x` branch moves. Reading from it means two builds a week apart
silently produce different libraries with nothing recording the difference.

The tag plus a recorded sha256 makes the build **reproducible**:
`includes/icon-handler/source.json` carries both.

```json
{
  "source": "Font Awesome Free",
  "version": "7.3.1",
  "license": "CC BY 4.0 — https://fontawesome.com/license/free",
  "icons":      { "sha256": "8b825be9cbe4a782…", "bytes": 4853474 },
  "categories": { "sha256": "967e6cf962d27205…", "bytes": 55899 },
  "generated": "2026-09-30"
}
```

### Fetching categories from the SAME tag matters

A common failure — Spectra has it — is refreshing icon data while reading
categories from a hand-converted file last touched weeks earlier. Icons added
upstream then land in no category and never appear under a sidebar heading.

Fetching both from one tag recovered **42 icons** here: 517 uncategorised
against 559.

## Verifying against upstream

```bash
curl -sL https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.3.1/metadata/icons.json | shasum -a 256
# compare with source.json → icons.sha256
```

A single icon:

```bash
curl -s https://raw.githubusercontent.com/FortAwesome/Font-Awesome/7.3.1/svgs/solid/star.svg
grep -m1 "^	'star' =>" includes/icon-handler/icons.php
```

The `path` and `viewBox` must match exactly. Some Font Awesome paths have
negative coordinates — `star` begins `M309.5-18.9` — which is **their** geometry,
not an extraction error. Upstream's own SVG has the same values.

## Determinism

Regenerating produces **byte-identical** files, so a version bump diffs to only
the icons that actually changed:

```bash
md5 -q includes/icon-handler/icons.php > /tmp/before
npm run update-icons
md5 -q includes/icon-handler/icons.php > /tmp/after
diff /tmp/before /tmp/after        # no output
```

Output is **not lexicographic**. JavaScript hoists integer-like keys to the
front numerically, so `0`–`9` lead. Deterministic is what the diff needs;
sorted is not.
