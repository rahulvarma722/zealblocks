# Icon — `zealblocks/icon`

A standalone SVG icon from the plugin's own library.

> **This block moved off core's icon registry in 0.0.2-beta.** It previously
> used `wp_get_icon()` and stored namespaced names like `core/star-filled`.
> Those slugs no longer resolve and must be re-selected. See
> [../icons/](../icons/README.md) for the library itself.

## Attributes

| attribute | type | what it does |
|---|---|---|
| `icon` | string | the slug, e.g. `heart` |
| `label` | string | alternative text; empty means decorative |
| `isInline` | boolean | flows with surrounding text instead of sitting on its own line |
| `flipHorizontal` | boolean | mirrors on the X axis |
| `flipVertical` | boolean | mirrors on the Y axis |
| `rotation` | number | 0–359 degrees |

## Rendering

```php
$svg = Icon_Library::render( $icon_name, array(
	'class' => 'wp-block-zealblocks-icon__svg',
	'label' => $label,
) );
if ( '' === $svg ) { return; }
```

An unknown slug returns `''`, and the block returns before emitting a wrapper —
so nothing renders rather than an empty box that still occupies layout and still
announces itself to a screen reader. That is also the validation: a slug not in
the library cannot produce markup.

## Alternative text — the accessibility branch

Leave `label` empty and the icon is `aria-hidden` decoration. Set it and the
icon becomes `role="img"` with an `aria-label` and is announced as content.

That distinction is the most commonly missed part of icon accessibility, and
`Icon_Library::render()` and the editor's `<Icon>` implement it identically.
They have to — a labelled icon announced on the front end and silently not in
the editor was a real bug until the JS side gained its `label` prop.

## Flip and rotation — on the SVG, never the wrapper

```php
$processor = new WP_HTML_Tag_Processor( $svg );
if ( $processor->next_tag( 'svg' ) ) {
	$processor->add_class( 'is-flip-horizontal' );
	$processor->set_attribute( 'style', sprintf( 'rotate:%ddeg;', $rotation ) );
}
```

A transform on the **wrapper** would rotate any background, border and padding
the block supports have put there. The user asked to rotate the icon, not the
box.

`WP_HTML_Tag_Processor` parses the markup properly, so adding a class cannot
corrupt an attribute the way `str_replace` on `'<svg'` could.

Rotation is `(int)` then `% 360`. A cast cannot produce anything but an integer,
so there is no string to escape into the style attribute, and a stored `720`
cannot emit a meaningless declaration.

**`style.scss` selects `svg.is-flip-horizontal`.** The editor put those classes
on the wrapper for a while, which meant flipping did nothing in the canvas while
working perfectly once published.

## `is-inline` is opt-in

The default is a block-level wrapper. An icon is usually its own element — a
feature bullet, a card badge, a standalone mark — so `display: block` is right.
Inline matters only when the icon genuinely sits in a run of text.

Both `is-placeholder` and `is-inline` set `display`, at equal specificity, so
the editor emits only one: the placeholder is never inline whatever the setting
says. Relying on stylesheet order there would be fragile.

## The editor

`src/icon/edit.js` uses the shared library — no block-specific picker:

```jsx
import IconControl, { IconPicker, useIcon, Icon } from '@/ui/icon-library';
```

One `IconPicker` is rendered with **controlled** `open` state and driven from
both the toolbar button and the empty-state placeholder.

That is deliberate. `ToolbarButton` is an Ariakit composite item with its own
roving tabindex, and handing it to Radix's `asChild` to clone is the kind of
pairing that works until it quietly does not, in a place no test reaches. A
caller in that position drives the picker and passes no children.

### Three states

| state | what renders |
|---|---|
| no `icon` | placeholder with "Browse the icon library" |
| `icon` set, not resolved | placeholder with a spinner |
| resolved | the `<Icon>` |

The middle state is brief and rare — only reachable for a slug PHP did not
inline, such as pasted content. Showing the empty placeholder there would tell
the user their icon had been lost.

The preview is drawn by the same component the front end mirrors, so the canvas
cannot show something publishing would not produce. The old path injected
registry markup with `dangerouslySetInnerHTML`; that is gone.

## Block supports

`anchor`, `align` (left/center/right), `color` (text and background),
`__experimentalBorder`, `spacing`, `dimensions.width`, `ariaLabel`.

`dimensions.width` is how the icon is sized. No `size` is passed to
`Icon_Library::render()`, so the SVG keeps its intrinsic `viewBox` and
`style.scss` makes it fill the wrapper — the user's width setting wins and
stays overridable. Hard-coding `width`/`height` attributes would only give CSS
something to fight.
