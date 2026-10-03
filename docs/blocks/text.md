# Text — `zealblocks/text`

A paragraph with a **visual style preset** chosen independently of the theme's
default sizing.

| control | attribute |
|---|---|
| **Style as** — Display / H1–H6 / Lead / Body / Caption / Eyebrow | `styleAs` |

## The preset is a class, never an inline style

```html
<p class="has-style-caption wp-block-zealblocks-text">Section title</p>
```

That lets `style.scss` resolve each preset against the active theme's font-size
presets — falling back to a `clamp()` only when the theme declares none — and a
theme can override the whole scale in one place.

An inline `font-size` would beat the theme forever.

The value is validated against the same fixed list `style.scss` implements. An
unknown preset is dropped rather than emitted, so the block never carries a
class with no rule behind it.

## The element is always `<p>` — for now

A configurable HTML tag is future scope, and its absence is **asserted** rather
than assumed:

```php
zealblocks_check( 'a stray tagName attribute is ignored entirely', … );
```

When it returns, the validation belongs in `render.php` against an allow-list.
The tag name lands in an **element position**, which makes it an XSS boundary
rather than a styling preference — `<script>` or `<iframe>` reaching that line
would be exploitable. That test failing is the reminder.

Removed along with the tag control: the settings-backed vocabulary
(`Text_Tags`, `Settings`), the `zealblocks_text_tags` /
`zealblocks_enabled_text_tags` filters, the PHP→JS bridge that carried the
enabled list, and the heading-outline guardrail, which had nothing left to check
once the level could not be chosen.

**A consequence worth recording:** without the tag control there is no
tag/visual-style decoupling, which was what distinguished this block from
`core/paragraph` plus its typography supports. As it stands the differentiator
is the preset scale itself.

## `content` has no `source` — and that is load-bearing

```json
"content": { "type": "string", "default": "", "role": "content" }
```

Core stores it inside the block comment delimiter:

```html
<!-- wp:zealblocks/text {"content":"Hello","styleAs":"caption"} /-->
```

Declaring `"source": "rich-text"` instead — which is what `core/heading` and
`core/paragraph` do — tells core to parse the value back out of the **saved
markup**. Those blocks have a real `save()` that writes that markup. This one
returns `null`, so there would be nothing to parse from: the text is written
nowhere, reads back empty, and the block renders nothing on the front end.

**This shipped as a bug and reached the front end.** It fails silently — the
editor looks correct until you reload.

Every other integration check hand-wrote the block delimiter, which quietly
guaranteed the attribute was present. That is not what the editor does, so those
checks could not catch it. There is now a round-trip test that goes attributes →
`serialize_blocks()` → parse → render, plus one through a real post and
`the_content`.

If this block ever gains a real `save()`, `source` should come back with it.
