=== Zealblocks ===
Contributors:      amandubey
Tags:              blocks, button, responsive, icons, breakpoints
Requires at least: 7.1
Tested up to:      7.1
Requires PHP:      8.1
Stable tag:        0.0.1
License:           GPL-2.0-or-later
License URI:       https://www.gnu.org/licenses/gpl-2.0.html

Blocks that extend WordPress 7.1 rather than reinvent it — a typographic scale that follows your theme, and per-viewport button sizing.

== Description ==

Zealblocks adds blocks that build on WordPress 7.1's block API instead of
duplicating it. Core's typography, colour, spacing and border controls — and
core's per-viewport style states — are declared as supports and inherited, not
reimplemented. What Zealblocks adds is the part core leaves out.

= Blocks =

* **Icon** — an SVG icon from the WordPress icon library, with flip, free rotation and a proper decorative/meaningful accessibility choice.
* **Text** — a paragraph with a visual style preset: Display, H1–H6, Lead, Body, Caption or Eyebrow, chosen independently of the theme's default paragraph sizing.
* **Buttons** — a flex container for one or more buttons, with block gap, padding and wide/full alignment.
* **Button** — a button-style link with an optional icon, and per-viewport width and icon size.

= Built on the WordPress icon library =

The Icon block uses the icon registry WordPress 7.1 added, so it draws on the 88
icons that ship with core rather than bundling its own set — and any icon a
theme or plugin registers appears in it automatically.

Icons are marked up correctly for assistive technology: leave the alternative
text empty and the icon is hidden from screen readers as decoration; set it and
the icon is announced as content. That distinction is the most commonly missed
part of icon accessibility.

= The typographic scale follows your theme =

The Text block's presets are emitted as classes, and each one resolves through your
theme's own `theme.json` font-size presets before falling back to a fluid
`clamp()`. So a theme with a real type scale drives the look, a theme without
one still renders sensibly, and a theme can override the whole scale in one
place. Nothing is written as an inline style, which is what would otherwise beat
the theme permanently.

The Eyebrow preset — the small uppercase label that sits above a heading — has
no equivalent in core, and is the one most often faked with an undersized H6.

= On responsive values =

WordPress 7.1 emits per-viewport CSS for its own style paths, so Zealblocks does
not need to reinvent that and does not try to. Where Zealblocks adds a property
core has no support for, it stores the value inside core's own `style` attribute
under a namespaced key, in core's viewport-state shape, and generates the CSS
using core's media queries:

`style.zealblocks.width` for the base layer, `style.@tablet.zealblocks.width`
and `style.@mobile.zealblocks.width` for the overrides. Icon size uses the
same shape under `iconSize`.

The breakpoints come from `WP_Theme_JSON::get_viewport_media_queries()`, which
reads `settings.viewport` from theme.json. Change your breakpoints there and
Zealblocks follows, because it never had its own.

Desktop is the base layer rather than a third band, matching core: it carries no
media query and applies at every width, so Mobile falls back to the base value
when unset, never to Tablet.

= Icons =

Four built-in icons (arrow, chevron, download, external), positionable left or
right. Position is done with `flex-direction: row-reverse` rather than `order`,
so the DOM order stays text-then-icon and the button's accessible name is
unaffected by where the icon appears. Icons are marked `aria-hidden` — they are
decorative, and the button text is the accessible name.

= Privacy =

Zealblocks does not collect, store or transmit any data. It makes no external
network requests, sets no cookies, creates no database tables, and registers no
REST endpoints or AJAX handlers.

= Source code =

The JavaScript in `build/` is compiled and minified by `@wordpress/scripts`.
The unminified sources, the build configuration and the full development
history are public at:

https://github.com/rahulvarma722/zealblocks

To build from source: `npm install && npm run build`.

== Installation ==

1. Upload the plugin through **Plugins > Add New**, or extract the ZIP into `wp-content/plugins/`.
2. Activate **Zealblocks** through the **Plugins** menu.
3. In the editor, insert **Buttons** from the **Zealblocks** category in the block inserter.
4. Select a button and open the **Styles** tab to find **Custom Width** and **Icon Size**.

To set a per-viewport value, switch the editor preview to Tablet or Mobile with
Responsive styles enabled, then change the value. With Responsive styles off, a
narrow preview edits the base layer — the same behaviour as core's controls.

== Frequently Asked Questions ==

= Why does it require WordPress 7.1? =

Per-viewport style states are a 7.1 feature. The controls read and write core's
viewport-state layers and detect which state the editor is in from core's own
slots, none of which exist earlier. On WordPress 6.x the controls would appear to
work while writing values the editor could not show back to you.

= Where do the breakpoints come from? =

`WP_Theme_JSON::get_viewport_media_queries()`, which reads `settings.viewport`
from your theme.json. The defaults are 480px for mobile and 782px for tablet,
identical to core's. Zealblocks has no breakpoints of its own to configure.

= Why is Desktop not listed alongside Tablet and Mobile? =

Because Desktop is the base layer, not a breakpoint. A value set on Desktop
carries no media query and therefore applies at every width; Tablet and Mobile
are overrides on top of it. This is core's model, and following it is what makes
Mobile fall back to your Desktop value rather than to your Tablet value.

= Can I use these buttons inside core's Buttons block? =

No. This plugin's Button declares `zealblocks/buttons` as its parent, so it
can only be inserted into a Buttons container. The container supplies the flex
layout and block gap the button expects.

= Does it work with Full Site Editing and template parts? =

Yes. The per-viewport CSS goes through the WordPress style engine — the same
path core uses for its own per-viewport styles — and is printed once with
`wp_add_inline_style()`: in the head on block themes, in the footer on classic
themes. Nothing is emitted inline next to the block.

= Does it add any front-end JavaScript? =

No. Every block renders server-side in PHP and ships no front-end script.

== Screenshots ==

1. A Buttons container holding two Button blocks, one with an arrow icon.
2. The Custom Width and Icon Size controls in the Styles tab.
3. Editing a Mobile-only width with Responsive styles enabled.
4. The Zealblocks category in the block inserter.

== Changelog ==

= 0.0.1 =
* Initial release.
* Buttons container block with flex layout, block gap, padding and wide/full alignment.
* Button block with link controls, four icons, and left/right icon position.
* Per-viewport Custom Width and Icon Size using WordPress 7.1 style states and core's viewport media queries.

== Upgrade Notice ==

= 0.0.1 =
Initial release.
