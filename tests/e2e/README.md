# End-to-end tests (Playwright)

The editor UI and the real front end, in Chromium: computed styles, hover and
keyboard focus, breakpoints, animation, display conditions and the inspector.
Unit, Jest and integration tests cover the logic; these cover what a person
sees and does.

## Run

```bash
NODE_ENV=development npm run test:e2e                      # everything
NODE_ENV=development npm run test:e2e -- tests/e2e/specs/button   # one folder
```

`NODE_ENV=development` matters in a shell that exports `production`, which
prunes the dev dependencies the runner needs. The first run downloads the
Chromium build Playwright expects into its cache.

## The site and the login

The suite runs against an existing site, not wp-env. It reads `.env.e2e` in
the plugin root (git-ignored), or the same variables from the environment:

```
WP_BASE_URL=http://localhost:10003
WP_USERNAME=zealblocks-e2e
WP_PASSWORD=…
```

On the Local site that account is a dedicated administrator created for these
tests, so no one's own login is needed. To recreate it elsewhere:

```bash
wp user create zealblocks-e2e zealblocks-e2e@example.test --role=administrator --user_pass=<password>
```

wp-scripts' global setup logs in once through REST and saves the session to
`artifacts/storage-states/admin.json`. Traces and screenshots of failures go
to `artifacts/test-results/`. `artifacts/` is git-ignored.

## Safety rules (the site is real)

- **Never** call RequestUtils' `deleteAllPosts()`, `deleteAllPages()`,
  `deleteAllBlocks()`, `activateTheme()`, `resetPreferences()` or anything else
  that touches content or settings the test did not create.
- Make content with the `posts` fixture (`posts.create( markup )`), which
  publishes `[e2e] …` posts and deletes exactly those when the test ends. A
  post made in the editor is registered with `posts.track( id )`.
- Visitor views use the `visitorPage` fixture: a context with no login.

## Layout

| path | what |
|---|---|
| `utils/index.js` | `test` (with the `posts` and `visitorPage` fixtures), `block()` markup builder, `computed()`, `tabTo()` |
| `specs/global/` | the editor: insertion rules, save/reload validity, every inspector control, canvas previews |
| `specs/button/`, `specs/icon/`, `specs/buttons/`, `specs/text/` | each block on the front end |
| `specs/extensions/` | animation, display conditions, and everything per device at the 480/481/782/783 edges |

Test IDs in each spec's docblock refer to `ZEALBLOCKS-TEST-PLAN.md`.

## Writing a test

- **Keyboard focus:** use `tabTo( page, locator )`. `locator.focus()` does not
  trigger `:focus-visible`.
- **Motion:** wp-scripts' config sets `reducedMotion: 'reduce'` for every test,
  so hover transitions are instant. A spec that needs motion sets it back with
  `test.use( { contextOptions: { reducedMotion: 'no-preference', strictSelectors: true } } )`.
- **Inspector text:** labels are uppercased by CSS, and `innerText` reflects
  that; compare lowercased.
- **Selected blocks:** core keeps a selected block in view in every device
  preview; clear the selection before checking per-device hiding.
