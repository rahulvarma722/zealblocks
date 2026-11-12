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
| `flipForRTL` | boolean | mirrors the icon in right-to-left languages |
| `url` | string | link; the wrapper becomes an `<a>` |
| `linkTarget` | string | `_blank` adds the opener guard |
| `rel` | string | author's tokens, kept and allow-listed |

Hover colours have no attribute: they live in `style.zealblocks`
(`textHover`, `backgroundHover`, `hoverDuration`), per device, like every
other per-device value.

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
	$processor->add_class( 'has-rotation' );
	$processor->set_attribute( 'style', sprintf( '--zealblocks-icon-rotation:%ddeg;', $rotation ) );
}
```

A transform on the **wrapper** would rotate any background, border and padding
the block supports have put there. The user asked to rotate the icon, not the
box.

`WP_HTML_Tag_Processor` parses the markup properly, so adding a class cannot
corrupt an attribute the way `str_replace` on `'<svg'` could.

Rotation goes through `Block_Render::angle()`: whole degrees, 0–359. A cast
cannot produce anything but an integer, so there is no string to escape into
the style attribute, and a stored `720` cannot emit a meaningless declaration.

The angle is a custom property that `svg.has-rotation { rotate: var(…) }`
spends, not an inline `rotate`, because the RTL rule below has to read it.
Before I-03 it was an inline `rotate:45deg`; the rendered result is the same.

**`style.scss` selects `svg.is-flip-horizontal`.** The editor put those classes
on the wrapper for a while, which meant flipping did nothing in the canvas while
working perfectly once published.

## Right-to-left mirroring (I-03)

`flipForRTL` adds `has-rtl-flip` to the wrapper; `style.scss` acts on it only
under `[dir="rtl"]`, behind `/*rtl:ignore*/`. Opt-in, because direction is
per icon: an arrow should flip, a heart must not.

It mirrors the icon **as drawn in LTR**: the horizontal `scale` toggles, and
the rotation is negated (`rotate: calc(var(…) * -1)`). `rotate` applies after
`scale`, so flipping alone would turn an arrow rotated to point down-right into
one pointing up-left; negating the angle makes it point down-left. An icon
already flipped horizontally un-flips. In Spectra the inline `rotate()`
overrides the RTL flip, so a rotated icon is not mirrored at all.

## Hover colours (I-01, I-02)

Icon colour and background (colour or gradient) on hover, per device, through
the shared `Block\Hover` (see [../hover.md](../hover.md)). The states are
`:hover` and `:focus-visible`, so a keyboard user on a linked icon sees what a
mouse user sees; Spectra uses `:hover` and `:focus-within`. The canvas previews
`:hover` only. In the Color panel the text-colour row is labelled "Icon hover",
since the text colour is what fills the icon.

## The link (I-04)

A usable URL turns the wrapper itself into the `<a>`, as in Spectra, so the
whole box is the click target. `href`, `target` and `rel` come from
`Block_Render::link()`, shared with the Button: the URL through `esc_url()`,
the target allow-listed, the author's `rel` tokens kept and allow-listed, and
`noreferrer noopener` added for a new tab. An unusable URL (`javascript:`,
`data:`) leaves a plain `<div>`.

**Naming.** An SVG inside a link does not name it, so when linked the name
moves to the `<a>` as `aria-label` and the SVG is hidden: the alternative text
when there is some, otherwise the icon's own name ("Arrow Right"), so the link
is never announced as a bare URL. Spectra leaves a link around a decorative
icon with no name at all. The editor shows the Alternative text field whenever
the icon is linked, with a warning until it is filled in, since the icon's name
says what it shows, not where it goes.

**Colour.** A linked icon keeps the colour it would have unlinked:
`a.wp-block-zealblocks-icon` inherits, on hover and focus too, so a theme's
link colours do not repaint it. The canvas has no link, and the front end now
matches it. A colour set on the block, and the hover colours, still win.

The editor's link button and popover are `src/shared/link/`, the same component
the Button uses.

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
