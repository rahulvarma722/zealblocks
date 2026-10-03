# Icons — the front end

## Rendering

```php
use Zealblocks\Icon_Handler\Library as Icon_Library;

$svg = Icon_Library::render( $slug, array(
	'class' => 'wp-block-zealblocks-button__icon',
	'label' => $label,      // optional
) );
```

Returns `''` for an unknown slug. Both blocks check that and return before
emitting a wrapper.

Output:

```html
<svg class="zealblocks-icon wp-block-zealblocks-button__icon"
     xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 512 512" fill="currentColor"
     aria-hidden="true" focusable="false"><path d="M241 87.1…"/></svg>
```

The wrapper is rebuilt on every call rather than stored, which is why the
generated file keeps only a path — the same geometry can take different classes
and labels without regenerating anything.

## Accessibility — the branch that matters

```php
'' !== $label
	? ' role="img" aria-label="…"'
	: ' aria-hidden="true" focusable="false"'
```

An icon **with** a label is content and announces itself. One **without** is
decoration and must not, or a screen reader reads the button's text twice.

`src/ui/icon-library/use-icon.js` mirrors this exactly. The two have to agree —
a labelled icon announced on the front end and silently not in the editor is a
real bug, and was one until the JS side gained its `label` prop.

## Escaping

`Icon_Library::render()` escapes every interpolated value:

```php
esc_attr( $class ), (int) $icon['width'], (int) $icon['height'],
esc_attr( $label ), esc_attr( $icon['path'] )
```

Width and height are cast to `int`; the path and classes go through
`esc_attr()`. The slug itself never reaches the output — it is only a lookup
key, and a slug not in the library produces `''`.

That is why `render.php` can `phpcs:ignore` the echo: the markup is built here
from escaped parts, not concatenated from request data.

### Why not `wp_kses()`

Core's `WP_Icons_Registry::sanitize_icon_content()` runs `wp_kses` with a
three-tag allowlist and **fails silently** — and it lowercases `viewBox`, which
breaks every icon. Building the element from escaped parts is both safer and
cheaper than sanitising markup we generated ourselves.

## Lazy loading — not optional

`icons.php` calls `__()` about 2,000 times on include. WordPress raises
`_doing_it_wrong` for a text domain used before `after_setup_theme`
(`wp-includes/l10n.php:1444`), so requiring it at plugin bootstrap would trip
that on every request.

`Library::all()` is a lazy static. The file loads on **first lookup**, which is
always inside a render callback, long after `init`.

```php
private static $icons = null;

private static function all() {
	if ( null !== self::$icons ) { return self::$icons; }
	$file = __DIR__ . '/icons.php';
	self::$icons = is_readable( $file ) ? require $file : array();
	return self::$icons;
}
```

`is_readable()` means a checkout that has never run `npm run update-icons`
renders no icons rather than fatalling.

### Cost

| | time | memory |
|---|---|---|
| opcache warm (production) | **~1 ms** | **~2 MB** |
| no opcache | ~4 ms | ~6 MB |

Reading one icon costs the whole file — there is no partial include. A page with
no icons pays nothing, because nothing calls into it.

With opcache the compiled literal array lives in shared memory and `require`
bumps a refcount rather than rebuilding. `Library::all()` only ever reads it, so
it stays shared.

### Verifying the lazy load

```bash
# with translations installed, so the guard can actually fire
wp eval 'do_blocks( "<!-- wp:zealblocks/icon {\"icon\":\"heart\"} /-->" );'
```

Nothing should load `icons.php` at `plugins_loaded`, `setup_theme`,
`after_setup_theme` or `init`, and no `_doing_it_wrong` should be raised.
`categories.php` should **never** load on a front-end request at all.

## RTL mirroring

Opt-in per block, because direction is per-icon: an arrow should flip, a heart
must not.

```php
'' !== $icon_markup && ! empty( $attributes['flipForRTL'] ) ? 'has-rtl-flip' : ''
```

```scss
/*rtl:ignore*/
[dir="rtl"] .wp-block-zealblocks-button.has-rtl-flip .wp-block-zealblocks-button__icon {
	transform: scaleX(-1);
}
```

**`/*rtl:ignore*/` is load-bearing.** wp-scripts runs RTLCSS over `style.scss` to
build `style-index-rtl.css`, and RTLCSS rewrites `[dir="rtl"]` to `[dir="ltr"]`.
RTL sites load **only** the generated file, so without the directive the rule
would match exclusively in LTR — dead in the one case it exists for, with
nothing in the LTR stylesheet to hint at it.

Verify after any change to that rule:

```bash
npm run build
grep -o '\[dir=rtl\][^{]*has-rtl-flip[^}]*}' build/button/style-index.css
grep -o '\[dir=rtl\][^{]*has-rtl-flip[^}]*}' build/button/style-index-rtl.css
# both must be identical
```

Costs nothing in LTR: the rule cannot match, so no transform and no compositing
layer.

## Icon block transforms

`src/icon/render.php` applies flip and rotation to the **SVG**, not the wrapper
— a transform on the wrapper would rotate any background, border and padding
with it.

```php
$processor = new WP_HTML_Tag_Processor( $svg );
if ( $processor->next_tag( 'svg' ) ) {
	$processor->add_class( 'is-flip-horizontal' );
	$processor->set_attribute( 'style', sprintf( 'rotate:%ddeg;', $rotation ) );
}
```

`WP_HTML_Tag_Processor` parses properly, so adding a class cannot corrupt an
attribute the way `str_replace` on `'<svg'` could.

Rotation is `(int)` then `% 360`, normalised to 0–359. A cast cannot produce
anything but an integer, so there is no string to escape into the style
attribute.

**The classes must be on the SVG**, because `style.scss` selects
`svg.is-flip-horizontal`. The editor had them on the wrapper for a while, which
meant flipping did nothing in the canvas while working correctly once published.
