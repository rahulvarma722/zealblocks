# Display conditions (shared)

Hide a block for some visitors: when logged in, when logged out, for a user
role, a browser, an operating system, or on chosen days of the week. It matches
Spectra Free's Display Conditions extension, including its model: the
conditions are **ORed**, so any one that matches hides the block.

Text, Button, Icon and Buttons use it (Button, Icon and Buttons since S-06).

Per-device hiding is not here: core's block visibility (7.0+) already does it
for every block, from the block toolbar.

## Where it lives

| piece | file |
|---|---|
| the decision, the visitor lookup, the role list for the editor | `includes/block/class-display-conditions.php` (`Zealblocks\Block\Display_Conditions`, a Module) |
| Settings-tab panel | `src/shared/display-conditions/panel.js` |
| writing the attribute, "has any condition" | `src/shared/display-conditions/values.js` |
| browser, OS and day choices | `src/shared/display-conditions/constants.js` |
| the editor's dashed outline | `src/shared/display-conditions/_display-conditions.scss` |

## Adding it to a block

1. **`block.json`**: declare `displayConditions` exactly as in
   `Display_Conditions::ATTRIBUTES` (`{ "type": "object", "default": {} }`).
   `BlockContractTest` fails if it differs.
2. **`render.php`**: return early, **before any other work**:

   ```php
   if ( Display_Conditions::hides( isset( $attributes['displayConditions'] ) ? $attributes['displayConditions'] : null ) ) {
   	return;
   }
   ```

   First, because a hidden block must leave nothing behind. A CSS rule
   already stored, or a script already enqueued (an animated block), would
   still reach the page. The integration suite checks all three.

   Usually the block never gets that far: the module's `pre_render()` filter
   on `pre_render_block` returns `''` for a hidden block of ours before core
   renders it. That is what a **container** needs. Core renders a block's
   inner blocks before its own callback, so by the time a hidden Buttons
   group's render.php returned, each Button inside had stored its CSS rules,
   and those reached the page. (Core 6.9+ dequeues the scripts a block
   enqueued while rendering empty, but the style engine store has no undo.)
   The render.php check stays for render paths that call the callback
   directly and skip the filter.
3. **`edit.js`**: render `<DisplayConditionsPanel>`, and add the
   `has-display-conditions` class to the block props when
   `hasConditions( attributes.displayConditions )`.
4. **`editor.scss`**: `@include display-conditions.marker("<block selector>")`
   at the root.

## How it works

- **Decided on the server, per request.** A hidden block renders nothing, so
  its content is not in the page source either. Browser and OS come from the
  user agent, and the day from the site's timezone. The visitor is resolved
  once per request, and only if some block on the page has a condition.
- **Only active conditions are stored.** `setCondition()` drops an off toggle,
  an empty select and an empty day list, so the post content stays clean and
  "has any condition" is just "is the object non-empty". `has_any()` on the
  server agrees.
- **The editor always shows the block.** Hiding it would make it impossible to
  edit, so a block with conditions gets a dashed outline instead.
- **Roles come from the site.** The role list is printed into the editor
  (`window.zealblocksRoles`) on every editor screen, not only when the post
  already has one of our blocks, because the list is needed the moment the
  first one is inserted.

## Page caching (a real limitation)

A full-page cache stores one visitor's result and serves it to everyone. On a
cached site the browser, OS and day conditions follow whoever filled the
cache, and the logged-in conditions only work if the cache skips logged-in
users, which most do. The editor says so under the affected controls. There
is no fix short of deciding in JavaScript, and that would put the hidden
content in the page source.

The user agent can also be spoofed. These are presentation rules, not access
control.

## Lists that must agree

`Display_Conditions::BROWSERS`, `::SYSTEMS` and `::DAYS` must match the values
in `constants.js`. A choice the editor offers but the server does not know
would be stored and never match, so the block would never hide, and nothing
else reports that. `BlockContractTest::test_condition_lists_match_between_php_and_js`
compares them.
