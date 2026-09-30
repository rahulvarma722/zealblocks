<?php
/**
 * Front-end markup for zealblocks/button.
 *
 * The anchor IS the block root: get_block_wrapper_attributes() is spread
 * onto it, so every class and inline style core generates from the
 * block's `supports` lands on the element the user actually clicks.
 *
 * This differs deliberately from core/button, which nests
 * `.wp-block-button__link` inside a `.wp-block-button` div and moves the
 * styling to the inner link with __experimentalSkipSerialization. Core
 * needs the extra wrapper so a width setting can size the flex item
 * independently of the link. Until this block has a width control, the
 * wrapper would be an empty div that only splits the clickable area from
 * the padded area.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

/*
 * A file-level `use`, in a file with no `namespace` declaration.
 *
 * That combination looks wrong and is not. `use` is LEXICAL and per-file: it
 * creates an alias for the file it appears in, independent of the scope the
 * file is required from. Core requires this template from inside a closure in
 * wp-includes/blocks.php, which is global scope — but the alias below still
 * applies here, so `Block_Render::` resolves without repeating
 * `\Zealblocks\Block_Render` at nine call sites.
 *
 * `Responsive_Styles` is NOT aliased on purpose: it is referenced only from
 * inside Block_Render now, and importing a name this file no longer uses would
 * be a lie about its dependencies.
 */
use Zealblocks\Block\Render as Block_Render;
use Zealblocks\Icon_Handler\Library as Icon_Library;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * These variables are NOT global, despite what the sniff reports.
 *
 * `register_block_type_from_metadata()` wraps a block's render template in a
 * static closure and requires it from inside that closure —
 * `wp-includes/blocks.php:629-631`:
 *
 *     $settings['render_callback'] = static function ( $attributes, $content, $block ) use ( $template_path ) {
 *         ob_start();
 *         require $template_path;
 *         return ob_get_clean();
 *     };
 *
 * So every assignment below is function-scoped and disappears when the
 * callback returns. PHPCS is a static analyser: it sees a .php file whose
 * top level assigns variables and cannot know the file is only ever reached
 * through that closure, so it assumes global scope. Core's own block
 * templates trip the same sniff for the same reason.
 *
 * Prefixing these to ``$myplugin_text`, `$myplugin_url` and so on would satisfy
 * the sniff while making the file harder to read and implying a lifetime these
 * variables do not have. Disabled at file level instead, since it applies to
 * every line rather than to any one of them.
 */

$text = Block_Render::text( $attributes, 'text' );

// An empty button is invisible on the front end but still occupies a
// flex slot, so render nothing at all.
if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
	return;
}

/*
 * SANITISE ON THE WAY IN, ESCAPE ON THE WAY OUT.
 *
 * Every value below comes out of post content, which means it was written by
 * someone with edit rights but is still untrusted at render time: post content
 * is long-lived, portable between sites, and reachable by anything that can
 * write a post. Escaping alone would make these values safe to PRINT while
 * still letting nonsense through — `target="totally-arbitrary"` is harmless to
 * a parser and meaningless to a browser.
 *
 * The narrowing itself lives in Zealblocks\Block_Render, so every block sanitises
 * the same way and a fix lands in one place. Escaping is then left to
 * get_block_wrapper_attributes(), which esc_attr()s every value it is given
 * (wp-includes/class-wp-block-supports.php:265).
 */
$safe_url = Block_Render::url( Block_Render::text( $attributes, 'url' ) );

/*
 * `target` has exactly four meaningful values. An allow-list rather than
 * esc_attr() alone, because an unrecognised target is treated by browsers as a
 * NAMED BROWSING CONTEXT — so a stray value silently opens the link in a new
 * window named after it and keeps reusing that window, which is neither what
 * the editor asked for nor something the user can see in the UI.
 */
$link_target = Block_Render::one_of(
	Block_Render::text( $attributes, 'linkTarget' ),
	array( '_blank', '_self', '_parent', '_top' )
);

// `rel` is a token list from a fixed vocabulary — the HTML link-type registry.
$rel = Block_Render::tokens(
	Block_Render::text( $attributes, 'rel' ),
	array(
		'alternate',
		'author',
		'bookmark',
		'external',
		'help',
		'license',
		'me',
		'next',
		'nofollow',
		'noopener',
		'noreferrer',
		'opener',
		'prev',
		'privacy-policy',
		'search',
		'sponsored',
		'tag',
		'terms-of-service',
		'ugc',
	)
);

/*
 * A plain-text tooltip: strip tags and control characters, keep the text.
 *
 * Named $link_title, not $title. `$title` is a real WordPress global — admin
 * pages and the template loader both use it — and assigning to it is a hard
 * error under WordPress.WP.GlobalVariablesOverride. Nothing is actually
 * clobbered here, because this file runs inside a closure and the assignment is
 * function-scoped, but a name that only stays safe because of where the file
 * happens to be required is not worth keeping.
 */
$link_title = sanitize_text_field( Block_Render::text( $attributes, 'title' ) );

/*
 * Without a usable URL there is nothing to link to, so render a button element
 * rather than an anchor with no href — which is not keyboard focusable. Note
 * this branches on the ESCAPED url: see Block_Render::url() for why.
 */
$tag_name = Block_Render::one_of( Block_Render::text( $attributes, 'tagName' ), array( 'a', 'button' ), 'a' );

if ( '' === $safe_url ) {
	$tag_name = 'button';
}

$extra_attributes = array();

if ( 'a' === $tag_name ) {
	$extra_attributes['href'] = $safe_url;

	if ( '' !== $link_target ) {
		$extra_attributes['target'] = $link_target;

		/*
		 * target="_blank" without noopener lets the opened page reach
		 * back through window.opener. Modern browsers imply it, but the
		 * attribute is still the portable guarantee.
		 *
		 * A UNION, not a fallback. This used to read `&& '' === $rel`, so an
		 * author who typed anything at all into "Link rel" — `nofollow` is the
		 * obvious one — silently lost the opener guard and got
		 * `<a target="_blank" rel="nofollow">`: exactly the reverse-tabnabbing
		 * case the paragraph above says it prevents. The author's tokens are
		 * kept and these two are added alongside.
		 *
		 * $rel has already been through Block_Render::tokens(), so it is
		 * lowercased, allow-listed, de-duplicated whole tokens joined by single
		 * spaces — safe to split and re-join without re-validating.
		 */
		if ( '_blank' === $link_target ) {
			$rel_tokens = '' === $rel ? array() : explode( ' ', $rel );

			foreach ( array( 'noreferrer', 'noopener' ) as $required_token ) {
				if ( ! in_array( $required_token, $rel_tokens, true ) ) {
					$rel_tokens[] = $required_token;
				}
			}

			$rel = implode( ' ', $rel_tokens );
		}
	}

	if ( '' !== $rel ) {
		$extra_attributes['rel'] = $rel;
	}
} else {
	$extra_attributes['type'] = 'button';
}

if ( '' !== $link_title ) {
	$extra_attributes['title'] = $link_title;
}

/*
 * Icons come from the generated library, not a map kept here by hand.
 *
 * This used to be a four-entry $icon_paths array duplicating src/button/icon.js,
 * with a comment warning that a key added to one had to be added to the other
 * or the icon silently disappeared on save. Both sides now resolve the same
 * slug through the same generated data, so they cannot drift.
 *
 * Icon_Library::render() escapes the path and builds the SVG; the wrapper is
 * rebuilt rather than stored so the same geometry can take different classes.
 */
$icon_key      = Block_Render::text( $attributes, 'icon' );
$icon_position = Block_Render::one_of( Block_Render::text( $attributes, 'iconPosition' ), array( 'left', 'right' ), 'right' );
$icon_markup   = Icon_Library::render( $icon_key, array( 'class' => 'wp-block-zealblocks-button__icon' ) );


/*
 * Per-viewport width and icon size, from `style.zealblocks.*` and its `@tablet` /
 * `@mobile` states.
 *
 * Core writes CSS only for style paths it owns, so these namespaced values
 * survive save and parse but produce nothing by themselves. The media queries
 * come from core (`\WP_Theme_JSON::get_viewport_media_queries()`) so the bands
 * match every core control on this same block exactly — see
 * includes/class-responsive-styles.php.
 *
 * Two properties, two very different destinations.
 *
 * `width` is emitted as a real declaration on the block root. `iconSize` is
 * emitted as a CUSTOM PROPERTY on that same root, because the element it sizes
 * is a CHILD and nothing here can select a child: get_block_wrapper_attributes()
 * writes to the root, and so does core's own per-viewport CSS unless the block
 * declares feature selectors in block.json.
 *
 * style.scss then spends the variable on `.wp-block-zealblocks-button__icon`. The
 * media queries stay on the root, so the icon becomes per-viewport without a
 * single descendant selector being generated here.
 */
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array(
		// style key => CSS property emitted.
		'width'    => 'width',
		'iconSize' => '--zealblocks-button-icon-size',
	),
	'zealblocks-btn-'
);

$wrapper_classes = array_filter(
	array(
		$responsive['class'],
		// Mirrors the editor, so the icon sits on the same side in both.
		'' !== $icon_markup && 'left' === $icon_position ? 'has-icon-left' : '',
	)
);

/*
 * href / target / rel / title / type go through here too, rather than being
 * concatenated into a string of their own.
 *
 * get_block_wrapper_attributes() takes ARBITRARY extra attributes, merges them
 * with everything the block's `supports` generated, and esc_attr()s every value
 * on the way out (wp-includes/class-wp-block-supports.php:265). Handing them
 * over means one escaping path instead of two, and the printf() below no longer
 * needs a phpcs:ignore claiming an escape the sniff cannot see.
 *
 * `href` is still run through esc_url() first: esc_attr() escapes characters
 * but knows nothing about schemes, so it would happily print
 * `javascript:alert(1)` as a perfectly well-formed attribute. The two are not
 * interchangeable and the URL needs both.
 */
$wrapper_attributes = get_block_wrapper_attributes(
	array_merge(
		$wrapper_classes ? array( 'class' => implode( ' ', $wrapper_classes ) ) : array(),
		$extra_attributes
	)
);

/*
 * The rules are handed to core's style engine, not printed here.
 *
 * `context` names a store. Core flushes every store in
 * wp_enqueue_stored_styles() — hooked to wp_enqueue_scripts and wp_footer —
 * through wp_register_style(), wp_add_inline_style() and wp_enqueue_style(),
 * as a single style element, `wp-style-engine-zealblocks-inline-css`. Block
 * themes render the template before the head is printed, so the rules land in
 * the document head;
 * classic themes get them in the footer. That is exactly how core's own
 * per-viewport CSS travels — block-supports/states.php makes this same call
 * with `context => 'block-supports'` — so this block is at parity with every
 * core control beside it, and nothing is echoed from PHP that a reviewer has to
 * take on trust. The Plugin Review Team asked for this in place of an inline
 * style element.
 *
 * The store de-duplicates by selector: two buttons with identical values, which
 * already share a hash class, share one rule.
 */
if ( $responsive['rules'] ) {
	wp_style_engine_get_stylesheet_from_css_rules(
		$responsive['rules'],
		array(
			'context'  => 'zealblocks',
			'prettify' => false,
		)
	);
}

printf(
	'<%1$s %2$s><span class="wp-block-zealblocks-button__text">%3$s</span>%4$s</%1$s>',
	esc_attr( $tag_name ),
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	wp_kses( $text, Block_Render::LABEL_HTML ),
	$icon_markup // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Literal SVG template; the only interpolated value is esc_attr()'d above and comes from a fixed four-entry map. See the note there for why wp_kses() cannot be used.
);
