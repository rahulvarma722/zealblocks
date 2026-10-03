# Icons — setup and maintenance

## Local setup

```bash
npm install
npm run build          # blocks register from build/, so this is required
```

The generated icon files are **committed**, so a fresh checkout has all 1,992
icons without running the generator. You only run it to change version or source.

## Updating Font Awesome

```bash
node bin/generate-icons-json.js --version=7.4.0
```

Then, in order:

```bash
# 1. the icon count and the diff
git diff --stat includes/icon-handler/ src/ui/icon-library/icons-data.js

# 2. provenance is recorded
cat includes/icon-handler/source.json

# 3. no translatable strings crept into the chunk
grep -c "__(" src/ui/icon-library/icons-data.js        # must be 0

# 4. the suites
npm run lint:js && npm run build
./vendor/bin/phpcs && ./vendor/bin/phpunit
WP_CLI=/tmp/wp ./bin/test-integration.sh

# 5. regenerate translations — labels and categories have changed
wp i18n make-pot . languages/zealblocks.pot \
  --exclude=node_modules,vendor,tests,dist,bin,src
```

### What a version bump can break

**Renamed slugs orphan saved content.** Upstream renames icons between majors,
and a block stores the slug. An icon renamed upstream stops resolving, and the
block renders nothing — silently, because an unknown slug is indistinguishable
from no icon.

Before shipping a major bump, diff the slug sets:

```bash
git show HEAD:includes/icon-handler/icons.php | grep -o "^	'[^']*'" | sort > /tmp/before
grep -o "^	'[^']*'" includes/icon-handler/icons.php | sort > /tmp/after
comm -23 /tmp/before /tmp/after        # slugs that disappeared
```

Anything listed needs a decision: an alias map, a content migration, or an
accepted break documented in the changelog.

**Category titles change**, which means new untranslated strings. Minor, but it
shows as English headings in a translated picker until the `.pot` is refreshed.

## Changing the source entirely

`bin/generate-icons-json.js` is written around Font Awesome's metadata shape.
Swapping to another icon set means rewriting `buildIconSet()` and the two
fetches, but the **output contract** is what the rest of the plugin depends on:

| file | must export |
|---|---|
| `icons.php` | `slug => { label (translated), width, height, path }` |
| `categories.php` | `{ titles: slug => translated, members: slug => [cats] }` |
| `icons-data.js` | `ICONS = slug => { width, height, path }` — **no text** |

Keep those and nothing downstream changes. Update the attribution in
`readme.txt` and both generated headers to match the new licence.

## Adding icons to a new block

```jsx
import IconControl, { useIcon, Icon } from '@/ui/icon-library';

const iconData = useIcon( icon );

<IconControl value={ icon } onChange={ ( v ) => setAttributes( { icon: v } ) } />
<Icon icon={ iconData } className="wp-block-yourblock__icon" />
```

```php
use Zealblocks\Icon_Handler\Library as Icon_Library;

$svg = Icon_Library::render( $slug, array( 'class' => 'wp-block-yourblock__icon' ) );
if ( '' === $svg ) { return; }
```

Add `"icon": { "type": "string", "default": "" }` to `block.json`. Nothing else
— `Editor_Provider` finds `attrs.icon` on any `zealblocks/*` block automatically,
so inlining works with no registration step.

## Troubleshooting

### Icons are English in a translated site

Check which layer:

```bash
wp eval 'add_filter("locale", fn() => "xx_XX", 99);
  echo Zealblocks\Icon_Handler\Library::get("heart")["label"];'
```

- **Translated here, English in the picker** → the catalog route is fine; the
  problem is elsewhere. Check the browser's Network tab for `icon-catalog`.
- **English here too** → no `.mo` for the domain. Check
  `WP_LANG_DIR/plugins/zealblocks-<locale>.mo` exists.
- **Inspector labels English, icon names fine** → normal. Editor-bundle strings
  need `zealblocks-<locale>-<md5>.json`, which Loco does not generate by default.

### An icon renders in the editor but not on the front end

The slug resolves in JS but not PHP, which means the two data files disagree —
almost always a partial regeneration. Re-run `npm run update-icons` and commit
all three files together.

### An icon renders nowhere

```bash
wp eval 'var_dump( Zealblocks\Icon_Handler\Library::get( "your-slug" ) );'
```

`NULL` means the slug is not in the library — check spelling against
`includes/icon-handler/icons.php`, and remember `core/…` slugs from before the
migration do not exist.

### The picker is empty or spins forever

The chunk or the catalog failed. Check the browser console and the Network tab
for `icons-data.js` and `icon-catalog`. The loader deliberately never caches a
failure, so closing and reopening retries.

### `_doing_it_wrong: Translation loading … triggered too early`

Something is calling into the library before `init`. Find it:

```bash
wp eval 'var_dump( ( new ReflectionProperty(
  "Zealblocks\Icon_Handler\Library", "icons" ) )->getValue() );'
```

Non-null before a render means an early caller. Both generated files must only
be reached through `Library::all()` and `Catalog::all()`.

### Flip or rotation works on the front end but not in the editor

The classes are on the wrapper instead of the SVG. `style.scss` selects
`svg.is-flip-horizontal`. See [frontend.md](frontend.md).

### A block bundle suddenly grew by ~1.3 MB

Something static-imported `icons-data.js`.

```bash
grep -c "M241 87.1" build/button/index.js      # must be 0
```

Import from `@/ui/icon-library`, never deeper.

## Known limitations

- **No custom upload.** A custom SVG cannot be a slug, so it needs the attribute
  to carry a second kind of value and server-side sanitisation.
- **`core/…` slugs do not resolve.** The Icon block moved off core's registry in
  0.0.2-beta; icons saved with 0.0.1 must be re-selected.
- **The chunk ships all 1,992 paths** to draw roughly 120. Splitting metadata
  from artwork would cut the initial payload by ~84%.
- **`icons.php` loads whole** to resolve one slug — ~1 ms and ~2 MB with opcache.
