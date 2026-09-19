# WordPress.org directory assets

These files are published to the **`assets/`** directory of the plugin's SVN
repository — a sibling of `trunk/` and `tags/`. They are **never** part of the
plugin ZIP, so they add nothing to what users download.

They live here, in git, rather than only in SVN, so that banners and
screenshots are reviewed and versioned alongside the code that they depict.

`.github/workflows/assets.yml` pushes this directory on any change, with no
version bump or release required.

## Required files

| File | Size | Where it appears |
|---|---|---|
| `icon-128x128.png` | 128 × 128 | Search results and the plugin card |
| `icon-256x256.png` | 256 × 256 | The same, on retina displays |
| `banner-772x250.png` | 772 × 250 | Header of the plugin page |
| `banner-1544x500.png` | 1544 × 500 | The same, on retina displays |
| `screenshot-1.png` … | any | The Screenshots tab, in readme order |

`.jpg` and `.gif` are accepted too.

## Screenshot order is not arbitrary

`screenshot-N.png` maps to the Nth entry under `== Screenshots ==` in
`readme.txt`. Those captions are currently:

1. A Buttons container holding two Button blocks, one with an arrow icon.
2. The Custom Width and Icon Size controls in the Styles tab.
3. Editing a Mobile-only width with Responsive styles enabled.
4. The Zealblocks category in the block inserter.

Add or reorder a caption and the image numbering has to move with it.
