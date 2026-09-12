# Responsive Styles Experiment — the R&D bench

> **What this is.** Zealblocks is a scratch plugin for probing WordPress 7.1's
> responsive-styles behaviour from the outside — as a third-party plugin, with no
> private APIs and no core patches. The **Button** block carries a custom
> per-viewport attribute end to end so the mechanism can be watched rather than
> guessed at.
>
> **Why it exists.** a production block plugin needed two questions answered before its production
> code could be changed: *can a plugin put a control in the responsive view at
> all*, and *how does a custom attribute behave like a core one*. Answering those
> in a production block plugin would have meant debugging inside 45 blocks and a large routing
> extension. This plugin answers them in ~600 lines.
>
> **Status.** Working and verified — editor (commit `35f1334`) and front end
> (output in §6.1).
>
> **Last verified against code:** 2026-08-26 (WordPress 7.1, Gutenberg trunk
> `36b742ee7f`)

---

## Contents

1. [The two problems](#1-the-two-problems)
2. [What was built](#2-what-was-built)
3. [The experiment bench](#3-the-experiment-bench)
4. [How the value is stored](#4-how-the-value-is-stored)
5. [How the active state is detected](#5-how-the-active-state-is-detected)
6. [Front-end CSS](#6-front-end-css)
7. [Findings](#7-findings)
8. [Two bugs found while building it](#8-two-bugs-found-while-building-it)
9. [Running the experiment](#9-running-the-experiment)
10. [File map](#10-file-map)

---

## 1. The two problems

They are separate, and conflating them is what makes this area confusing. A
control can be perfectly aligned and still invisible, or visible and silently
writing to the wrong layer.

| | Question | Answered in |
|---|---|---|
| **Visibility** | Will the control render at all on Tablet/Mobile? | §3, §7.1 |
| **Alignment** | When it does render, which layer does it write to? | §4, §5, §7.2 |

---

## 2. What was built

`zealblocks/button` ("Button") gained one custom attribute — **Custom Width** —
with no core support behind it, so every part of the pipeline is ours to write:

```
src/button/responsive-width/
    constants.js        the contract + the experiment switch
    use-style-state.js  which viewport state is being edited
    style-value.js      layered read/write inside core's `style`
    index.js            the control + diagnostics readout
src/button/edit.js      wiring + canvas preview
src/button/render.php   front-end output
includes/class-responsive-styles.php   CSS generation
```

Width was chosen because "full width on mobile, auto on desktop" is the canonical
responsive-button requirement — the difference between a per-device value and a
global one is unmistakable on screen.

---

## 3. The experiment bench

One constant in `constants.js` switches the whole thing between three states.
Change it, `npm run build`, reload the editor.

```js
export const EXPERIMENT_GROUP = 'dimensions';
```

| Value | What it demonstrates | Expected result |
|---|---|---|
| `'dimensions'` | **the working arrangement** — one of the seven groups core renders in the responsive view | control appears in the Styles tab on Desktop **and** in the responsive view on Tablet/Mobile |
| `'styles'` | **reproduces the a production block plugin bug** — the general-purpose third-party group, rendered by the Styles tab but not by `StyleStateInspectorSlots` | control has its own panel heading on Desktop, then **vanishes** on Tablet/Mobile while its stored values stay in post content, unreachable |
| `'viewport'` | **negative control** — a group that does not exist in 7.1 | console logs `Unknown InspectorControls group "viewport" provided.` and nothing renders |

The third value is the interesting one long-term: `viewport` is the group added by
Gutenberg draft PR **#82003** for exactly this purpose. When that ships, the same
value should start working **and** keep the control's own panel, because core
renders that slot unlabelled.

### 3.1 Why `styles` is a trap

`styles` is the natural choice — it is the group meant for third-party panels, and
the only one core renders **unlabelled**, which is what lets a fill bring its own
`ToolsPanel`, heading and reset menu.

It is not in the seven. Core's responsive view renders a fixed, hardcoded list:

```
typography · color · background · layout · dimensions · border · elements
```

All seven are **labelled**, so fills there must be bare `ToolsPanelItem`s — core
has already supplied the panel. There is no unlabelled slot in that view at all,
which is why no plugin can own a self-headed panel there on 7.1.

---

## 4. How the value is stored

The point of the experiment: **not** inventing `widthTablet` / `widthMobile`
attributes. The value lives inside core's own `style` object, using core's layer
keys:

```js
style: {
    zealblocks: { width: '200px' },                  // base — applies everywhere
    '@tablet': { zealblocks: { width: '150px' } },   // tablet band only
    '@mobile': { zealblocks: { width: '100%'  } },   // mobile band only
}
```

**This works because `style` is a free-form `{ type: 'object' }` attribute**
(`block-editor/src/hooks/style.js`) with no key allow-list. A namespaced key
survives save and parse untouched. Core generates CSS only for paths it owns, so
nothing of ours is emitted by core — hence §6.

Storing it this way is what makes the control behave like a core one: the state
being edited decides which value is read and written.

### 4.1 Two read rules

| Purpose | Rule | Helper |
|---|---|---|
| what the **control** shows | exact layer, **no fallback** | `getStateValue()` |
| what the **canvas / front end** shows | layer, falling back to base | `getResolvedValue()` |

An empty field on Tablet means "no tablet override" — the truth the user needs to
decide whether to add one. Showing the inherited base value would be a lie.

`getResolvedValue()` is `state ?? base` — **never** `state ?? tablet ?? base`.
Core's bands are mutually exclusive ranges, so mobile falls back to the base.

---

## 5. How the active state is detected

The rule the whole experiment exists to demonstrate:

> **stateKey = f( device, responsive-styles-mode )** — never the device alone.

| Mode | Device | Reads/writes | Effect |
|---|---|---|---|
| off | Desktop | base | all devices |
| off | Tablet | **base** | all devices |
| off | Mobile | **base** | all devices |
| on | Desktop | base | all devices |
| on | Tablet | `@tablet` | tablet only |
| on | Mobile | `@mobile` | mobile only |

Rows 2 and 3 matter: with the mode off, the device switcher is a **preview**, and
core writes every edit to the base. A control writing to `@tablet` there stores a
value the user cannot see and did not ask for.

### 5.1 The mode cannot be read — so it is inferred

`isResponsiveEditing()` and `getSelectedBlockStyleState()` are private selectors
reachable only through `unlock()`, which throws for anything off core's package
allow-list. `useBlockStyleState` is not exported. No filter exposes it.

So two **probes** are mounted in slots core renders conditionally. A fill renders
only when core decided to render the slot, so its presence *is* the signal:

```js
function Probe( { onChange } ) {
    useEffect( () => {
        onChange( true );
        return () => onChange( false );
    }, [ onChange ] );

    return null;   // renders nothing — presence is the message
}
```

| Probe | Slot | Core renders it when |
|---|---|---|
| toolbar | `BlockControls` group `style-state` | `isResponsiveEditing() && hasViewportBlockStyleState()` |
| inspector | `InspectorControls` group `styles` | the normal style view — absent in the responsive view |

```js
const isEditingViewportState =
    toolbarShowsStyleState ||
    ( isNarrowDevice && ! inspectorShowsNormalView );
```

Both are needed: the toolbar unmounts while typing (alone it would flip the state
mid-edit), and the inspector probe cannot tell "responsive view" from "inspector
closed" (harmless here — no control is rendered either way).

This beats sniffing `.editor-preview-dropdown.is-responsive-editing` because it is
**reactive**: no polling, no MutationObserver, and it updates the moment core
changes mode.

### 5.2 The diagnostics readout

`SHOW_DIAGNOSTICS = true` in `constants.js` prints the live state into the
inspector panel:

```
group        dimensions
device       Tablet
toolbarProbe true
stylesProbe  false
editing      @tablet
—
base         200px
@tablet      150px
@mobile      100%
```

This is the fastest way to see the mechanism working — or to see which probe is
lying. Set it to `false` for a clean UI.

---

## 6. Front-end CSS

Core emits nothing for a custom path, so `render.php` does it. **The media
queries come from core**, never from hardcoded breakpoints:

```php
\WP_Theme_JSON::get_viewport_media_queries( $viewport_settings )
```

Public and documented (`@since 7.1.0`), reads `settings.viewport` from theme.json,
and returns exactly the bands core uses for its own output — so a custom control
and a core control on the same block cannot disagree.

The base rule carries **no** media query; each state adds one. The scoping class
is derived from a hash of the values, so two identical buttons collapse onto one
rule instead of emitting a near-duplicate each.

### 6.1 Verified output

```html
<!-- block output: only the scoping class -->
<div class="wp-block-zealblocks-buttons is-layout-flex …">
  <a class="zealblocks-btn-ccc3ba64 wp-block-zealblocks-button" href="https://example.com">Click me</a>
</div>

<!-- printed once by core via wp_add_inline_style(): <head> on block themes, footer on classic -->
<style id="wp-style-engine-zealblocks-inline-css">
.zealblocks-btn-ccc3ba64{width:200px;}
@media (width <= 480px){.zealblocks-btn-ccc3ba64{width:100%;}}
@media (480px < width <= 782px){.zealblocks-btn-ccc3ba64{width:150px;}}
</style>
```

Note the band shapes: `width <= 480px` and `(480px < width <= 782px)` are
**mutually exclusive ranges**. Reimplementing them with stacked `max-width`
queries silently reintroduces a tablet-into-mobile cascade.

---

## 7. Findings

### 7.1 Visibility

- Core's responsive view renders a **fixed list of seven slots** in
  `StyleStateInspectorSlots` — no loop, no config, no `applyFilters` anywhere in
  the inspector path.
- **A custom group cannot be registered.** The registry is a frozen object literal,
  not exported from `@wordpress/block-editor`; unknown names warn and render null.
  Confirmed by the `'viewport'` bench setting.
- A slot renders nothing when it has no fills — so the panel count a user sees is
  per block, not fixed. Four visible panels does not mean four slots exist.
- All seven responsive slots are **labelled**, so no plugin can own a self-headed
  panel there.
- **Filling one of the seven is enough** to appear in the responsive view. That is
  the only route on 7.1, and it is what a production block plugin now does for its container
  Background / Overlay / Shape Divider panels.

### 7.2 Alignment

- A custom attribute **can** be made per-viewport without extra attributes, by
  storing it inside core's `style` under core's layer keys. Values survive
  serialization intact.
- The mode is **not readable**, but it is reliably **inferable** from two public
  conditionally-rendered slots.
- `select( 'core/editor' ).getDeviceType()` is public, and core derives the
  viewport state from the same canvas width — so the two never disagree about
  which viewport is being edited.
- Core's automatic reset scoping does **not** reach a plugin fill: it reads
  `useBlockStyleState()`, whose context comes from the fill's position in the React
  tree, and a plugin fill sits outside `BlockStyleStateProvider`. Without manual
  scoping, "Reset all" on Tablet wipes the **Desktop** value.

---

## 8. Two bugs found while building it

Both are worth knowing because they are easy to hit again.

### 8.1 A container block with `save: () => null` destroys its children

`zealblocks/buttons` is a container rendered through `render.php`, so returning
`null` from `save` looked correct for a "dynamic block". It is not, for a block
with children:

1. Core serializes it as `<!-- wp:zealblocks/buttons /-->` — self-closing.
2. **Every inner block is discarded on save**, with its text, urls and styles.
3. No warning, no validation error. The post reloads with an empty container.

"Dynamic" only means the block's own *markup* is generated at render time. Inner
blocks still have to exist in post content — `render.php` receives them already
rendered as `$content`.

**Fix:** `save: () => <InnerBlocks.Content />`. That emits the children and no
wrapper, which is right when `render.php` supplies the wrapping element itself.

### 8.2 `wp_strip_all_tags()` destroys core's media queries

Core's range syntax contains a `<`, and `strip_tags` reads it as the start of a
tag:

```
in:  .bk{width:200px;}@media (480px < width <= 782px){.bk{width:150px;}}
out: .bk{width:200px;}@media (480px < width
```

Everything after the `<` is deleted, so no per-viewport rule reaches the page.
Escaping is no better — `esc_attr()` mangles the same character, and no escaping
makes `expression(…)` safe inside a declaration.

**Fix:** allow-list the inputs instead. Values pass
`^-?number(px|%|em|rem|vw|vh)$`, the selector is an md5-derived class, the media
query comes from core — and the only remaining risk, a literal `</`, is checked
for once before output.

---

## 9. Running the experiment

```bash
cd wp-content/plugins/zealblocks
npm run build          # or: npm run start   for watch mode
```

Then in the editor: insert **Buttons**, select the inner **Button**.

| # | Steps | Expect |
|---|---|---|
| 1 | Styles ▸ Dimensions, set Width `200px` | applies at every width |
| 2 | View ▸ **Responsive styles** on, switch to **Tablet** | field goes **empty** — no tablet override yet — with a note about falling back to Desktop |
| 3 | Set `150px` on Tablet, `100%` on Mobile | diagnostics show all three stored values |
| 4 | Turn Responsive styles **off**, stay on Tablet | field shows the **Desktop** value; a warning says edits apply to all widths |
| 5 | Edit it | the base changes; `@tablet` untouched (check the diagnostics) |
| 6 | Save, view the front end, resize the window | 200 / 150 / 100% at the three bands |
| 7 | Set `EXPERIMENT_GROUP = 'styles'`, rebuild | own panel on Desktop, **gone** on Tablet/Mobile |
| 8 | Set `EXPERIMENT_GROUP = 'viewport'`, rebuild | console warning, nothing renders |

Step 4→5 is the alignment behaviour; step 7 is the a production block plugin bug in isolation.

---

## 10. File map

**This plugin**

| Path | Role |
|---|---|
| `src/button/responsive-width/constants.js` | `EXPERIMENT_GROUP`, storage shape, `VIEWPORT_STATE_BY_DEVICE`, `SHOW_DIAGNOSTICS` |
| `src/button/responsive-width/use-style-state.js` | the two probes, the combined signal, `stateKey` |
| `src/button/responsive-width/style-value.js` | `getStateValue`, `getResolvedValue`, `setStateValue`, `prune` |
| `src/button/responsive-width/index.js` | the control, reset scoping, diagnostics readout |
| `src/button/edit.js` | hook wiring, canvas preview, probe rendering |
| `src/button/render.php` | style-engine rules + wrapper class |
| `includes/class-responsive-styles.php` | media queries from core, value allow-list, rule builder |
| `src/buttons/index.js` | `save: () => <InnerBlocks.Content />` — see §8.1 |

**WordPress core — what this plugin depends on**

| Path | What matters |
|---|---|
| `block-editor/src/components/block-inspector/index.js` | `StyleStateInspectorSlots` — the seven slots |
| `block-editor/src/components/inspector-controls/groups.js` | the closed group registry |
| `block-editor/src/components/block-controls/groups.js` | `style-state` is public |
| `block-editor/src/components/block-toolbar/index.js` | the condition the toolbar probe mirrors |
| `block-editor/src/hooks/style.js` | `style` is a free-form object attribute; `BlockStyleStateProvider` |
| `editor/src/store/selectors.js` | `getDeviceType()` — public |
| `wp-includes/class-wp-theme-json.php` | `get_viewport_media_queries()` |

**Related reading**

| Doc | Covers |
|---|---|
| Gutenberg [#78280](https://github.com/WordPress/gutenberg/pull/78280) · [#80388](https://github.com/WordPress/gutenberg/issues/80388) · [#82003](https://github.com/WordPress/gutenberg/pull/82003) | why the view is limited, and the `viewport` group in progress |
