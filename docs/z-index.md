# Z-index (shared)

Stacking order against overlapping blocks, set per device. It matches Spectra
Free's Z-Index extension: a range of −100 to 1000, and a block that is not
otherwise positioned becomes `position: relative`, because a z-index does
nothing on a static box.

Text has it inside its Position panel. Button, Icon and Buttons have it as a
control of its own in Dimensions (since S-07), because Spectra Free has no
Position panel on those blocks (Position is a Pro feature).

## Where it lives

| piece | file |
|---|---|
| property map entry, wrapper class | `includes/block/class-z-index.php` (`Zealblocks\Block\Z_Index`) |
| the control | `src/shared/z-index/control.js`: `ZIndexControl` (its own Dimensions fill) and `ZIndexItem` (an item for a fill the block already has) |
| canvas preview | `src/shared/z-index/preview.js`: `getZIndexPreview()` |
| key, range, class | `src/shared/z-index/constants.js` |
| `position: relative` | `src/shared/z-index/_z-index.scss`: the `base()` mixin |

## Adding it to a block

No block.json attribute is needed. The value lives in the block's `style`
attribute, in core's viewport-state shape, like every other per-device value:
`style.zealblocks.zIndex`, `style['@tablet'].zealblocks.zIndex`,
`style['@mobile'].zealblocks.zIndex`.

1. **`render.php`**: add `Z_Index::KEY => Z_Index::PROPERTY` to the property
   map passed to `Block_Render::responsive()`, and merge
   `Z_Index::classes( $responsive['rules'] )` into the wrapper classes.
2. **`edit.js`**: render `<ZIndexControl clientId style setAttributes stateKey device />`
   (`stateKey` and `device` come from `useStyleState()`), and merge
   `getZIndexPreview( attributes.style, device )` into the block props.
3. **`style.scss`**: `@include z-index.base("<block selector>")` at the root.

## How it works

- **The value is a real declaration per band.** Validated as an integer of up
  to six digits (`Responsive_Styles::is_safe_integer()`), so an injected
  `1;}body{…}` is dropped. The −100…1000 range is the editor's, as in Spectra;
  it is not enforced on render.
- **The class comes from the surviving rules**, not the stored values, so a
  block never carries `has-zealblocks-z-index` when its value was dropped. It
  is present in every band once any band has a z-index, so a Mobile-only value
  still takes effect at Mobile.
- **`position: relative` has zero added specificity** (`:where()`), so a
  position chosen in a block's own Position panel always wins over it.
- **The class is namespaced.** Spectra ships a global
  `.has-z-index.has-z-index { z-index: var(--spectra-z-index, auto) !important }`,
  which flattened a generic class to `auto` on any site running both plugins.
- **The control is in the Dimensions panel**, because WordPress 7.1 renders
  only its labelled inspector groups on Tablet and Mobile. A control in
  `group="styles"` would vanish there.

## Values that must agree

`Z_Index::KEY`, `::MIN`/`::MAX` and `::CLASS_NAME` must match
`src/shared/z-index/constants.js`, and the class must match the `base()`
mixin. `BlockContractTest::test_z_index_values_match_across_php_js_and_scss`
checks all of them. A class that differed between the two would leave every
z-index on a static block doing nothing, with no error anywhere.

`BlockContractTest::test_z_index_blocks_include_the_mixin_and_a_control` checks
that every block whose render.php emits a z-index also includes `base()` in
its style.scss and renders a `ZIndexControl` or `ZIndexItem`.

Adding the key to a block's property map changes the hash in its generated
class for blocks that already had per-device values, because the hash covers
every key in the map. That is harmless: the class and its CSS are generated in
the same request.
