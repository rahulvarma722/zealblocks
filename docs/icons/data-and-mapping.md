# Icons — data structures and mapping

## Three generated files

| file | size | contents | consumer | loading |
|---|---|---|---|---|
| `includes/icon-handler/icons.php` | 1.46 MB | label + geometry | front end **and** editor | lazy `require` |
| `includes/icon-handler/categories.php` | 83 KB | titles + membership | editor only | lazy `require` |
| `src/ui/icon-library/icons-data.js` | 1.34 MB | geometry **only** | picker only | async chunk |

**Never edit these by hand.** `npm run update-icons` overwrites all three.

## Shapes

### `icons.php` — the front end's resolver

```php
return array(
	'heart' => array(
		'label'  => __( 'Heart', 'zealblocks' ),
		'width'  => 512,
		'height' => 512,
		'path'   => 'M241 87.1l15 20.7 15-20.7C296 52.5 …',
	),
	// ×1,992
);
```

**No categories.** PHP resolves one slug per icon on the page and never groups
or searches, so category data would be weight on every front-end request.

### `categories.php` — the picker's text

```php
return array(
	'titles' => array(
		'charity' => __( 'Charity', 'zealblocks' ),
		// ×68
	),
	'members' => array(
		'heart' => array( 'charity', 'gaming', 'holidays', 'maps', … ),
		// one row per categorised icon
	),
);
```

Membership is **many-to-many**: 840 of 1,475 categorised icons belong to more
than one. `heart` is in nine.

Categories live on the **icon**, not the other way round. Upstream is keyed
category → icons because that is how their website browses; every consumer here
needs the inverse, so the generator inverts it once.

### `icons-data.js` — geometry only

```js
export const ICONS = {
	'heart': { width: 512, height: 512, path: 'M241 87.1l15 20.7 …' },
	// ×1,992
};
```

**Zero `__()` calls, no labels, no categories.** This is load-bearing, not an
optimisation — see [localization.md](localization.md).

## Why the split

Drawing an icon a block **already has** needs one slug and about 700 bytes.
Browsing the picker needs all 1,992 and their categories.

Serving both from one source would mean every editor session downloading the
whole library to render one glyph.

```
                     needs              gets
front end            1 icon             icons.php  (lazy, ~1 ms / 2 MB)
editor, saved icon   1 icon             inlined by PHP, 0 requests
picker, open         1,992 + text       async chunk + /v1/icon-catalog
```

## Field names match across PHP and JS

`width`/`height`, never `w`/`h`. The picker hands a chosen icon straight to the
editor's render cache, and a shape difference would mean translating between
them at every hand-off — a bug that gets written once and missed everywhere
after.

## Mapping: slug → artwork

The slug is the contract. It is the JSON key from Font Awesome, unchanged.

```
block attribute          "heart"
      │
      ├── PHP      Icon_Library::get( 'heart' )
      │              → icons.php['heart']
      │              → <svg viewBox="0 0 512 512"><path d="M241 87.1…"/></svg>
      │
      └── editor   useIcon( 'heart' )
                     → cache (seeded from window.zealblocksData.icons)
                     → miss: GET /zealblocks/v1/icons?slugs=heart
                     → <svg viewBox="0 0 512 512"><path d="M241 87.1…"/></svg>
```

### Unknown slugs

Both resolvers return nothing rather than guessing:

```php
Icon_Library::get( 'does-not-exist' );     // null
Icon_Library::render( 'does-not-exist' );  // ''
```

`render.php` then returns before emitting a wrapper, so an unknown icon
produces **no markup at all** rather than an empty box that still occupies
layout and still announces itself to a screen reader.

That is also the validation: a slug not in the library cannot produce markup, so
there is no allow-list to maintain and no way for a stored value to inject
anything.

### Slugs are not stable across major Font Awesome versions

Upstream renames icons between majors. A bump can orphan saved content — which
is exactly what happened migrating the Icon block off core's registry: every
`core/…` slug stopped resolving. See [maintenance.md](maintenance.md).

## What is stored where

| | |
|---|---|
| **Database** | the slug only, inside `post_content` as a block attribute |
| **No tables** | the plugin creates none |
| **No options** | nothing in `wp_options` |
| **Files** | all artwork, bundled and read-only |

```html
<!-- wp:zealblocks/button {"text":"Buy","icon":"cart-shopping","iconPosition":"left"} /-->
<!-- wp:zealblocks/icon {"icon":"heart","label":"Favourite","rotation":90} /-->
```

Nothing about an icon is ever written to the database beyond that string.
