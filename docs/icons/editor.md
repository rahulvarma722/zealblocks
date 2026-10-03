# Icons — the editor

## What a block author uses

```jsx
import IconControl, { useIcon, Icon } from '@/ui/icon-library';

<IconControl value={ icon } onChange={ ( v ) => setAttributes( { icon: v } ) } />

const iconData = useIcon( icon );
<Icon icon={ iconData } className="…" label={ label } />
```

That is the whole public surface. **Import from `@/ui/icon-library`, never
deeper** — which file holds the data, how it is fetched and how the picker is
built are internal.

`icons-data.js` is deliberately not re-exported. It is 1.34 MB and must only be
reached through the picker's dynamic `import()`; a static re-export in the
barrel would pull it into every bundle that touches the module, silently.

`primeIcon` is also not exported. It writes to the render cache, which only the
picker has any business doing.

## Resolving a saved icon — zero requests

```
PHP, on enqueue_block_editor_assets
  Editor_Settings::print_data()
    ├ parse_blocks( $post->post_content )
    ├ walk innerBlocks, keep only  zealblocks/*
    └ apply_filters( 'zealblocks_editor_data', [], $blocks )
         └ Icon_Handler\Editor_Provider::add_icons()
              collect attrs.icon → unique → cap 200
              → Catalog::with_category( Library::get_many( $slugs ) )
    └ wp_add_inline_script( 'wp-blocks', 'window.zealblocksData = {…}', 'before' )

JS, at module scope in use-icon.js
    seed a Map from window.zealblocksData.icons
```

The inline script prints **before** the bundle, so the global is already there
when `use-icon.js` evaluates. `useIcon()` then returns synchronously on first
render and the preview never flashes in.

**Measured: a post with 110 icons went from 110 requests to 0.**

Deduplication happens before resolving — the same icon used twenty times is one
lookup and one entry.

### Why not `block_editor_rest_api_preload_paths`

It looks like the right tool and does not work. apiFetch's preloading middleware
matches the **exact normalised path**, so a preload of `?slugs=heart,star` never
satisfies a request for `?slugs=heart`. Every icon still goes to the network and
the preload is pure dead payload.

### Why not `block_editor_settings_all`

`core/block-editor` filters settings through an allow-list of keys it knows and
silently drops a plugin's own. The key came back `undefined` with no error
anywhere. A plain JS global has no allow-list and no ordering to reason about.

### Why `Editor_Settings` is not icon-specific

Any feature wanting server-resolved data needs the same two things first: the
post parsed, and only our blocks. Done per feature that is one full tree walk
each. So the walk happens once and anything can contribute through
`zealblocks_editor_data`. Icons are the first caller, not the only one.

An empty value for a key is dropped rather than shipped, so the payload reflects
what is actually in the post.

## The cache

`src/ui/icon-library/use-icon.js` holds a module-scope `Map`, shared by every
block on the page — twenty blocks using one icon resolve it once.

```
useIcon( slug )
  ├ hit            → synchronous, first render
  ├ miss           → apiFetch /zealblocks/v1/icons?slugs=…
  │                   in-flight requests are shared via a `pending` Map,
  │                   so simultaneous mounts fire one request
  └ picker select  → primeIcon() writes straight in, so a just-chosen
                      icon costs nothing
```

A miss only happens for a slug PHP did not inline — pasted content, or an icon
picked in another session of the same page.

## The picker

`src/ui/icon-library/icon-picker.js`, opened from `IconControl` or driven
directly.

On first open it fetches **two things in parallel**:

```js
Promise.all( [
	import( /* webpackChunkName: "icons-data" */ '@/ui/icon-library/icons-data' ),
	apiFetch( { path: '/zealblocks/v1/icon-catalog' } ),
] )
```

| | |
|---|---|
| the chunk | geometry, 1.34 MB (~0.46 MB gzipped), browser-cached after |
| the catalog | labels + category titles, 122 KB, **translated by PHP** |

They merge into `{ CATEGORIES, ICONS }`. The merge is driven by the **catalog**,
not the geometry: an icon with no label cannot be searched for or shown.

Resolved once per session in module scope, so reopening the picker is instant.

### The chunk must stay named

```js
import( /* webpackChunkName: "icons-data" */ … )
```

Without it webpack calls the file `898.js` — a chunk **id** that moves whenever
the module graph does. Anything keyed to the built file's path moves with it.

### Virtualisation

`@tanstack/react-virtual` windows the grid by row: **~120 DOM buttons instead of
1,992.**

Core's grid is `auto-fill, minmax(150px, 1fr)`, so its column count follows the
container — which a virtualiser cannot work from, as it needs a row count up
front. The column count is measured with a `ResizeObserver` and fed in, keeping
core's responsive behaviour and the windowing together.

### Styling

Geometry is copied from core's own icon picker
(`wp-includes/blocks/icon/editor.css`) so it reads as part of the editor:

| | core | here |
|---|---|---|
| sidebar | 280px | 280px |
| grid | `auto-fill, minmax(150px, 1fr)` | 150px min, measured |
| icon | 24px, 12px padding | same |
| label | 12px beneath | same |
| hover | accent **text**, background untouched | same |
| selected | `is-primary` → accent fill, white | same |
| header rule | appears at `scrollTop > 0` | same |

## The inspector control

`src/ui/icon-library/icon-control.js` — preview, actions, details, RTL toggle.

- The whole preview is the picker trigger; a **Replace** bar rises from the
  bottom on hover, and is pinned open when no icon is chosen.
- **Delete** sits top-right as a DOM **sibling** of the trigger. A `<button>`
  cannot contain another, and nesting would make every delete click also open
  the picker.
- The bar is `pointer-events-none` so it never intercepts the click beneath it.
- It reveals on `group-focus-within` as well as hover, so keyboard users get the
  same affordance.
- The source line reads `Library · Charity`, with the category title attached
  server-side by `Catalog::with_category()` on both editor paths.

### The root carries `zb-ui`

Tailwind is configured `important: '.zb-ui'`, so every utility is emitted as
`.zb-ui .foo`. The picker inherits that from its portal container; this control
renders inline in the inspector where no such ancestor exists, so it declares
the scope itself. Utilities apply to **descendants**, so that element cannot
style itself with them.

## REST routes

Both under `zealblocks/v1`, both `edit_posts`, both editor-only.

| route | returns |
|---|---|
| `GET /icons?slugs=a,b,c` | geometry for up to 100 slugs, plus `categoryLabel` |
| `GET /icon-catalog` | every label and category title, translated — 122 KB |

`/icons` is capped at 100 so a crafted request cannot ask the server to assemble
the whole library one slug at a time.

`/icon-catalog` deliberately sends **no `Cache-Control`**. A long `max-age`
looks free, but the URL carries no version and would serve a stale catalog after
every plugin update. The picker already caches it for the session in module
scope, which is the win that matters.

## Bundle impact

```
build/button/index.js    114 KB   zero icon paths
build/icon/index.js      111 KB   zero icon paths
build/icons-data.js     1347 KB   shared async chunk, on first picker open
```

Verify after any change:

```bash
npm run build
grep -c "M241 87.1" build/button/index.js        # must be 0
```

wp-scripts disables webpack's default chunk sharing, so a static import would
give **every** block its own copy.
