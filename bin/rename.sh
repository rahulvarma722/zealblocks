#!/usr/bin/env bash
#
# Renames the plugin.
#
# Rewrites every identifier derived from the plugin name, in all three
# casings, then renames the plugin folder.
#
#   ./bin/rename.sh <new-slug> [New Display Name]      # dry run
#   ./bin/rename.sh <new-slug> [New Display Name] --go  # apply
#
# Example:
#   ./bin/rename.sh brickyard Brickyard --go
#
# What this CANNOT fix: post content already saved on any site. Block names
# live in the database as `<!-- wp:<slug>/button -->` comments, and static
# blocks' `wp-block-<slug>-*` classes are saved into published markup.
# Renaming after release requires block deprecations or a content migration.
# Before release, this script is all you need.
#
# The four OLD_* values below are the CURRENT names, and the script rewrites
# them in itself on every successful run, so it stays usable after a rename.
# Comments here use <slug> rather than the literal name for the same reason.
#
# DISPLAY and CLASS are tracked SEPARATELY even though they start out looking
# alike. They are different things: DISPLAY is free text a human reads, CLASS is
# a PHP identifier. Once the display name gained a space they stopped matching,
# and a single baseline would have quietly skipped the `Plugin Name:` header on
# every future rename — reporting success with a stale name still in the header.

set -euo pipefail

OLD_SLUG="zealblocks"
OLD_CONST="ZEALBLOCKS"
OLD_CLASS="Zealblocks"
OLD_DISPLAY="Zealblocks"

NEW_SLUG="${1:-}"
NEW_DISPLAY="${2:-}"
APPLY="${3:-}"

if [[ -z "$NEW_SLUG" ]]; then
	echo "usage: $0 <new-slug> [New Display Name] [--go]" >&2
	exit 1
fi

if [[ ! "$NEW_SLUG" =~ ^[a-z][a-z0-9-]*$ ]]; then
	echo "error: slug must be lowercase letters, digits and hyphens, starting with a letter." >&2
	exit 1
fi

# Title-case a hyphenated slug: brick-yard -> "Brick Yard" (the display name).
# The class prefix is the same thing with the spaces taken out.
#
# Written out rather than `sed -E 's/(^|-)([a-z])/\U\2/g'`, because \U in a
# replacement is a GNU extension. BSD sed — which is what macOS ships, and what
# this script is most likely to be run on — emits a literal "U" instead, so the
# old form derived "Ubrickyard" and would have rewritten every class prefix to
# that. Silent, and only visible after the fact.
title_case() {
	local remainder="$1" out="" part
	while [[ -n "$remainder" ]]; do
		part="${remainder%%-*}"
		if [[ -n "$part" ]]; then
			[[ -n "$out" ]] && out+=" "
			out+="$( printf '%s' "${part:0:1}" | tr '[:lower:]' '[:upper:]' )${part:1}"
		fi
		[[ "$remainder" == *-* ]] || break
		remainder="${remainder#*-}"
	done
	printf '%s' "$out"
}

# Derive the other two casings from the slug when no display name is given.
if [[ -z "$NEW_DISPLAY" || "$NEW_DISPLAY" == "--go" ]]; then
	[[ "$NEW_DISPLAY" == "--go" ]] && APPLY="--go"
	NEW_DISPLAY="$( title_case "$NEW_SLUG" )"
fi

NEW_CONST="$(echo "$NEW_SLUG" | tr '[:lower:]-' '[:upper:]_')"
# The class prefix is DERIVED from the display name rather than being the same
# string. Stripping everything that is not identifier-legal is what lets the
# display name stay free text: "Brick & Yard" gives the class prefix BrickYard
# and the header "Brick & Yard", instead of the script having to refuse the name.
NEW_CLASS="$( printf '%s' "$NEW_DISPLAY" | tr -cd '[:alnum:]_' )"

# NEW_CLASS is stripped to identifier characters above, so this should not fire.
# It is kept because the failure it guards against is silent: `Brick & Yard` used
# directly as a class prefix produced `class Brick & Yard {` — a plugin that no
# longer parses, while the rename reported success. A name that is all
# punctuation, or that starts with a digit, still reaches here.
if [[ ! "$NEW_CLASS" =~ ^[A-Za-z][A-Za-z0-9_]*$ ]]; then
	echo "error: display name \"$NEW_DISPLAY\" yields \"$NEW_CLASS\" as a PHP class prefix," >&2
	echo "       which is not a valid identifier — it must start with a letter." >&2
	exit 1
fi

# A display name is free text, and sed treats `&` in a replacement as "the whole
# match" and `/` as the delimiter. Without escaping, `Brick & Yard` expands to
# `Brick <old class prefix> Yard`. Escaped once here rather than at each call site.
sed_escape() {
	printf '%s' "$1" | sed -e 's/[\/&\\]/\\&/g'
}

# ...and the PATTERN side needs a different escape from the replacement side.
# There `&` is literal but `/` still ends the expression and `.` `*` `[` `^` `$`
# are regex metacharacters. The old name is only free text for the display
# variant — slug, const and class are all identifier-shaped, so this is used
# for OLD_DISPLAY alone.
regex_escape() {
	# `|` as the delimiter, because `/` is inside the character set and a
	# backslash inside a POSIX bracket expression is literal, not an escape —
	# so `[\/...]` closed the set early at its first `]` and matched nothing.
	# Backslashes are doubled first, then the metacharacters; `\` is absent from
	# the second set, so the first pass's output is not re-escaped.
	printf '%s' "$1" | sed -e 's|\\|\\\\|g' -e 's|[].*[^$/]|\\&|g'
}

NEW_CONST_ESC="$( sed_escape "$NEW_CONST" )"
NEW_CLASS_ESC="$( sed_escape "$NEW_CLASS" )"
NEW_DISPLAY_ESC="$( sed_escape "$NEW_DISPLAY" )"
OLD_DISPLAY_PAT="$( regex_escape "$OLD_DISPLAY" )"
NEW_SLUG_ESC="$( sed_escape "$NEW_SLUG" )"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------------------------------------------------------------
# A HYPHENATED SLUG CANNOT GO INSIDE AN IDENTIFIER
# ---------------------------------------------------------------------
# The slug is legal in STRINGS — text domain, block name, category, CSS class.
# It is not legal wherever a language wants an identifier, and a slug that
# happens to have no hyphen hides the difference until the day one does.
#
# All four cases below were found the hard way, renaming blockkit -> neura-blocks:
#
#   PHP variable/function   $blockkit_main, blockkit_check()   parse error
#   JS unquoted object key  { blockkit: {...} }                parse error
#   JS dot member access    next.blockkit.width                SILENT — parses as
#                                                              `next.blockkit - width`
#   PHPCS prefix list       <element value="blockkit"/>        sniff warning
#
# The rewrite cannot tell any of these from a string, so they are checked HERE,
# before a single file is touched. The php -l check further down does catch the
# first two, but only after the whole tree has been rewritten, which leaves it
# needing manual repair. It never catches the other two at all — the dot-access
# form is valid JavaScript that fails at runtime, and PHPCS config is not PHP.
#
# Patterns use `[$]` and `[.]` rather than backslash escapes: this is a
# double-quoted bash string, so a backslash would be eaten before grep sees it.
if [[ "$NEW_SLUG" == *-* ]]; then
	hazard_scan() {
		local pattern="$1"
		shift
		grep -rlE "$pattern" "$@" . 2>/dev/null || true
	}

	# The PHPCS case needs more than a grep, because a PHPCS config holds the
	# slug in TWO places with opposite requirements:
	#
	#   <property name="prefixes">     PHP identifiers -> must NOT be hyphenated
	#   <property name="text_domain">  the text domain -> MUST be the slug, hyphens and all
	#
	# A flat `<element value="<slug>"/>` scan matched both, so every rename to a
	# hyphenated slug was refused because of a text_domain that was perfectly
	# correct — and the error then told the author to fix prefixes that were
	# already right. Only the prefixes block is a hazard, so only it is read.
	hazard_scan_phpcs_prefixes() {
		local file
		while IFS= read -r file; do
			awk -v slug="$OLD_SLUG" '
				/<property[^>]*name="prefixes"/ { inside = 1; next }
				inside && /<\/property>/        { inside = 0; next }
				inside && index( $0, "\"" slug "\"" ) { found = 1 }
				END { exit found ? 0 : 1 }
			' "$file" 2>/dev/null && printf '%s\n' "$file"
		done < <(
			find . -type f \( -name '*.xml' -o -name '*.dist' \) \
				-not -path "./node_modules/*" -not -path "./vendor/*" 2>/dev/null
		)

		# Finding nothing is success. Without this the awk exit status leaks out
		# under `set -e` and kills the script silently — `bash -n` cannot see it.
		return 0
	}

	HAZARDS="$(
		hazard_scan "[$]${OLD_SLUG}_|function[[:space:]]+${OLD_SLUG}_" --include='*.php'
		hazard_scan "(^|[{,[:space:]])${OLD_SLUG}[[:space:]]*:" --include='*.js'
		hazard_scan "[.]${OLD_SLUG}([^A-Za-z0-9_-]|$)" --include='*.js'
		hazard_scan_phpcs_prefixes
	)"
	HAZARDS="$( printf '%s\n' "$HAZARDS" | grep -vE '/node_modules/|/vendor/|^$' | sort -u || true )"

	if [[ -n "$HAZARDS" ]]; then
		echo "error: the new slug contains a hyphen, but these files use the slug somewhere" >&2
		echo "       a hyphen is not legal — a PHP identifier, an unquoted or dot-accessed" >&2
		echo "       JS property, or the PHPCS prefix list:" >&2
		printf '%s\n' "$HAZARDS" | sed 's/^/         /' >&2
		echo >&2
		echo "       Rewriting the slug into those gives files that do not parse, JS that" >&2
		echo "       parses as arithmetic, or a lint config that no longer matches. Fix first:" >&2
		echo "         - name PHP identifiers after the CONST prefix, or neutrally" >&2
		echo "         - quote JS keys and read them as [ CONSTANT ], never .dot" >&2
		echo "         - list only the identifier casings as PHPCS prefixes" >&2
		exit 1
	fi
fi

# The last step renames the plugin folder. Check now rather than after every
# file has already been rewritten and the tree is half-migrated.
if [[ "$(basename "$ROOT")" != "$NEW_SLUG" && -e "$(dirname "$ROOT")/$NEW_SLUG" ]]; then
	echo "error: $(dirname "$ROOT")/$NEW_SLUG already exists; move it aside first." >&2
	exit 1
fi

echo "  slug      $OLD_SLUG  ->  $NEW_SLUG"
echo "  constants $OLD_CONST  ->  $NEW_CONST"
echo "  classes   $OLD_CLASS  ->  $NEW_CLASS"
echo "  display   $OLD_DISPLAY  ->  $NEW_DISPLAY"
echo "  folder    $(basename "$ROOT")  ->  $NEW_SLUG"
echo

# Everything except build artefacts, dependencies and this script itself.
#
# dist/ matters as much as build/: it holds the released ZIP, and running sed
# over a ZIP does not rename anything, it corrupts the archive. `grep -I` then
# skips anything else binary, so a future asset cannot be quietly mangled the
# same way.
#
# A while-read loop rather than mapfile, which is bash 4+ and macOS ships 3.2.
FILES=()
while IFS= read -r f; do
	# -I: treat binary as non-matching, so binaries never enter the list.
	grep -Iq . "$f" 2>/dev/null || continue
	FILES+=("$f")
done < <(
	find . -type f \
		-not -path "./node_modules/*" \
		-not -path "./vendor/*" \
		-not -path "./build/*" \
		-not -path "./dist/*" \
		-not -path "./.git/*" \
		-not -name "rename.sh"
)

# BSD sed (macOS) requires an argument to -i; GNU sed must not have one.
if sed --version >/dev/null 2>&1; then
	sed_inplace() { sed -i "$@"; }
else
	sed_inplace() { sed -i '' "$@"; }
fi

if [[ "$APPLY" != "--go" ]]; then
	echo "DRY RUN — files that would change:"
	for f in "${FILES[@]}"; do
		if grep -qE "$OLD_SLUG|$OLD_CONST|$OLD_CLASS|$OLD_DISPLAY" "$f" 2>/dev/null; then
			printf '  %-46s %s\n' "$f" "$(grep -cE "$OLD_SLUG|$OLD_CONST|$OLD_CLASS|$OLD_DISPLAY" "$f") match(es)"
		fi
	done
	echo
	echo "Re-run with --go to apply."
	exit 0
fi

for f in "${FILES[@]}"; do
	# Longest/most specific first, so the CONST form is not eaten by the slug
	# form when one is a substring of the other. DISPLAY must precede CLASS for
	# the same reason: a display name that happens to have no space would be
	# identical to the class prefix, and letting CLASS run first would leave the
	# `Plugin Name:` header holding an identifier instead of a readable name.
	sed_inplace \
		-e "s/${OLD_CONST}/${NEW_CONST_ESC}/g" \
		-e "s/${OLD_DISPLAY_PAT}/${NEW_DISPLAY_ESC}/g" \
		-e "s/${OLD_CLASS}/${NEW_CLASS_ESC}/g" \
		-e "s/${OLD_SLUG}/${NEW_SLUG_ESC}/g" \
		"$f"
done

# Update this script's own baseline so it can be run again later. It is
# excluded from the rewrite loop above (otherwise the sed expressions
# would rewrite themselves mid-run), so it has to be patched separately.
sed_inplace \
	-e "s/^OLD_SLUG=\".*\"/OLD_SLUG=\"${NEW_SLUG}\"/" \
	-e "s/^OLD_CONST=\".*\"/OLD_CONST=\"${NEW_CONST}\"/" \
	-e "s/^OLD_CLASS=\".*\"/OLD_CLASS=\"${NEW_CLASS}\"/" \
	-e "s/^OLD_DISPLAY=\".*\"/OLD_DISPLAY=\"${NEW_DISPLAY_ESC}\"/" \
	"bin/rename.sh"

# Rename any file whose NAME carries the slug — the main plugin file and
# every includes/class-<slug>-*.php. Deepest paths first so renaming a
# directory never invalidates a path still queued behind it.
find . -depth -name "*${OLD_SLUG}*" \
	-not -path "./node_modules/*" \
	-not -path "./vendor/*" \
	-not -path "./build/*" \
	-not -path "./dist/*" \
	-not -path "./.git/*" | while IFS= read -r path; do
	dir="$(dirname "$path")"
	base="$(basename "$path")"
	mv "$path" "$dir/${base//$OLD_SLUG/$NEW_SLUG}"
done

# VERIFY, rather than telling the reader to verify.
#
# The whole promise of this script is that no occurrence survives. That is a
# checkable claim, so it is checked here — a rename that half-worked is worse
# than one that refused, because the plugin still loads and fails later in ways
# that look unrelated.
# The list is REBUILT here, deliberately.
#
# FILES was captured before the per-file renames above, so it still holds the
# PRE-rename paths. The main plugin file is always one of them — it is the file
# whose name carries the slug — so the single most important file in the tree,
# the one holding Plugin Name, Text Domain and every constant, was silently
# skipped: grep failed on the missing path and `2>/dev/null` swallowed the
# error. The check reported success over a file it never opened.
FILES=()
while IFS= read -r f; do
	grep -Iq . "$f" 2>/dev/null || continue
	FILES+=("$f")
done < <(
	find . -type f \
		-not -path "./node_modules/*" \
		-not -path "./vendor/*" \
		-not -path "./build/*" \
		-not -path "./dist/*" \
		-not -path "./.git/*" \
		-not -name "rename.sh"
)

echo "Verifying no occurrences survive..."
LEAKS=0
for f in "${FILES[@]}"; do
	if grep -InE "${OLD_SLUG}|${OLD_CONST}|${OLD_CLASS}|${OLD_DISPLAY}" "$f" 2>/dev/null; then
		LEAKS=1
	fi
done

if [[ "$LEAKS" -ne 0 ]]; then
	echo >&2
	echo "error: occurrences of ${OLD_SLUG}/${OLD_CONST}/${OLD_CLASS}/${OLD_DISPLAY} survive, listed above." >&2
	echo "The tree is half-renamed. Fix those, then rename the folder by hand." >&2
	exit 1
fi
echo "  ok  no occurrences remain in tracked text files"

# And that the result is still valid PHP. A rewrite can be complete and still
# leave a file that does not parse — which is exactly what an unguarded display
# name used to do to every class declaration.
if command -v php >/dev/null 2>&1; then
	PARSE_FAIL=0
	while IFS= read -r php_file; do
		php -l "$php_file" >/dev/null 2>&1 || { php -l "$php_file" >&2; PARSE_FAIL=1; }
	done < <( find . -name '*.php' -not -path "./node_modules/*" -not -path "./vendor/*" -not -path "./dist/*" )

	if [[ "$PARSE_FAIL" -ne 0 ]]; then
		echo >&2
		echo "error: the rename produced invalid PHP, listed above. Nothing was moved." >&2
		exit 1
	fi
	echo "  ok  every PHP file still parses"
else
	echo "  --  php not on PATH; skipped the parse check"
fi

echo "Renaming folder..."
cd ..
mv "$(basename "$ROOT")" "$NEW_SLUG"

echo
echo "Done. Next:"
echo "  1. rm -rf build && npm run build"
echo "  2. rm -rf vendor && composer install     # composer.json name changed"
echo "  3. Deactivate and reactivate the plugin (the folder path changed)."
echo "  4. ./bin/build-zip.sh                    # re-run the release gate"
