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
use Zealblocks\Block\Hover;
use Zealblocks\Block\Hover_Label;
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
$link_attributes = Block_Render::link( $attributes );

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

if ( ! $link_attributes ) {
	$tag_name = 'button';
}

/*
 * href, target and rel arrive validated from Block_Render::link(), which also
 * keeps the author's rel tokens and adds the opener guard to a new-tab link
 * (shared with the Icon block). A <button> takes none of them.
 */
$extra_attributes = 'a' === $tag_name ? $link_attributes : array( 'type' => 'button' );

if ( '' !== $link_title ) {
	$extra_attributes['title'] = $link_title;
}

/*
 * Icons come from the generated library, not a map kept here by hand.
 *
 * This used to be a four-entry $icon_paths array, with a JS twin in the block's
 * own directory and a comment on each warning that a key added to one had to be
 * added to the other or the icon silently disappeared on save. Both sides now
 * resolve the same slug through the same generated data, so they cannot drift.
 *
 * Icon_Library::render() escapes the path and builds the SVG; the wrapper is
 * rebuilt rather than stored so the same geometry can take different classes.
 */
$icon_key      = Block_Render::text( $attributes, 'icon' );
$icon_position = Block_Render::one_of( Block_Render::text( $attributes, 'iconPosition' ), array( 'left', 'right' ), 'right' );

/*
 * Rotation (B-08), and the hover icon's own (B-10), as a custom property on
 * each SVG rather than a `transform`: style.scss spends it, and its RTL rule
 * combines it with the flip in the right order, which an inline transform
 * would override. 0 adds nothing, so an unrotated icon prints as before.
 */
$icon_args = static function ( $class_name, $angle ) {
	return 0 === $angle
		? array( 'class' => $class_name )
		: array(
			'class' => $class_name . ' has-rotation',
			'style' => sprintf( '--zealblocks-button-icon-rotation:%ddeg;', $angle ),
		);
};

$icon_markup = Icon_Library::render(
	$icon_key,
	$icon_args( 'wp-block-zealblocks-button__icon', Block_Render::angle( $attributes, 'iconRotation' ) )
);

/*
 * Icon only (B-09): "Show text" off hides the text and makes it the button's
 * aria-label, as in Spectra. Only with an icon that resolves: without one the
 * button would be empty, so the text shows whatever the attribute says.
 */
$hides_text = '' !== $icon_markup && false === ( $attributes['showText'] ?? true );

// An empty button is invisible on the front end but still occupies a
// flex slot, so render nothing at all. An icon-only button is not empty.
if ( ! $hides_text && '' === trim( wp_strip_all_tags( $text ) ) ) {
	return;
}

if ( $hides_text ) {
	$aria_label = trim( wp_strip_all_tags( $text ) );

	// Escaped with the rest by get_block_wrapper_attributes(). Left out when
	// empty: an empty aria-label names nothing, and hides the title.
	if ( '' !== $aria_label ) {
		$extra_attributes['aria-label'] = $aria_label;
	}
}

/*
 * The hover icon (B-10): replaces the icon while the button is hovered or has
 * keyboard focus, or appears beside the text when there is no icon. Printed
 * after the icon; style.scss orders it left or right of the text. Its label
 * swaps the aria-label on hover and focus, which only means something when
 * there is no visible text to name the button, so it is used only then.
 */
$hover_icon_markup = empty( $attributes['showIconOnHover'] )
	? ''
	: Icon_Library::render(
		Block_Render::text( $attributes, 'hoverIcon' ),
		$icon_args( 'wp-block-zealblocks-button__hover-icon', Block_Render::angle( $attributes, 'hoverIconRotation' ) )
	);
$hover_icon_left   = '' !== $hover_icon_markup && ! $hides_text
	&& 'left' === Block_Render::one_of( Block_Render::text( $attributes, 'hoverIconPosition' ), array( 'left', 'right' ), 'right' );

if ( '' !== $hover_icon_markup && $hides_text ) {
	$extra_attributes = array_merge( $extra_attributes, Hover_Label::attributes( Block_Render::text( $attributes, 'hoverIconAriaLabel' ) ) );
}


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
 *
 * Hover and focus styling (B-01 to B-06), on the same per-viewport path.
 *
 * States: `:hover`, and `:focus-visible` so a keyboard user sees what a mouse
 * user sees. Not `:focus`, which Spectra uses: a mouse click focuses a
 * <button>, and the hover colours would then stay on until the visitor
 * clicked somewhere else.
 *
 *   - Text and background hover: shared Hover, real declarations under the
 *     states, important (see includes/block/class-hover.php).
 *   - Border hover: the same, as `border-color`. Width and style stay the
 *     normal border's, as in Spectra.
 *   - Icon colour, icon hover colour and the text-icon gap: CUSTOM PROPERTIES
 *     on the root, for the same reason as the icon size — the icon is a child.
 *     style.scss spends them, each with a fallback, so a band that does not
 *     define one is unaffected.
 *   - Shadow hover: five custom properties combined into one `box-shadow` by
 *     style.scss under the states, so a tablet override of the colour alone
 *     keeps the desktop offsets.
 */
$button_states = array( ':hover', ':focus-visible' );

$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array(
		// style key => CSS property emitted.
		'width'             => 'width',
		'iconSize'          => '--zealblocks-button-icon-size',
		'iconGap'           => '--zealblocks-button-icon-gap',
		'iconColor'         => array( '--zealblocks-button-icon-color', 'color' ),
		'iconHover'         => array( '--zealblocks-button-icon-hover-color', 'color' ),
		...Hover::properties( '--zealblocks-button-hover-', $button_states ),
		'borderHover'       => array( 'border-color', 'color', $button_states ),
		'shadowHoverX'      => array( '--zealblocks-button-shadow-hover-x', 'signed-length' ),
		'shadowHoverY'      => array( '--zealblocks-button-shadow-hover-y', 'signed-length' ),
		'shadowHoverBlur'   => array( '--zealblocks-button-shadow-hover-blur', 'length' ),
		'shadowHoverSpread' => array( '--zealblocks-button-shadow-hover-spread', 'signed-length' ),
		'shadowHoverColor'  => array( '--zealblocks-button-shadow-hover-color', 'color' ),
	),
	'zealblocks-btn-'
);

/*
 * Feature classes, from the rules that SURVIVED validation (never from the
 * stored values), and from every band together: each is needed in every band
 * once any band uses it.
 */
$has_shadow_hover = false;
$has_icon_hover   = false;

foreach ( $responsive['rules'] as $rule ) {
	foreach ( array_keys( $rule['declarations'] ) as $property ) {
		$has_shadow_hover = $has_shadow_hover || str_starts_with( $property, '--zealblocks-button-shadow-hover-' );
		$has_icon_hover   = $has_icon_hover || '--zealblocks-button-icon-hover-color' === $property;
	}
}

// `has-hover` switches the transition on. Shared Hover sets it for the colour
// rules; a shadow or icon hover alone needs it too, or it would snap.
$hover_classes = Hover::classes( $responsive['rules'] );

if ( ! $hover_classes && ( $has_shadow_hover || $has_icon_hover ) ) {
	$hover_classes = array( Hover::CLASS_NAME );
}

$wrapper_classes = array_filter(
	array(
		$responsive['class'],
		// Mirrors the editor, so the icon sits on the same side in both.
		'' !== $icon_markup && 'left' === $icon_position ? 'has-icon-left' : '',
		// Opt-in mirroring for directional icons; style.scss gates it on [dir=rtl].
		'' !== $icon_markup && ! empty( $attributes['flipForRTL'] ) ? 'has-rtl-flip' : '',
		'' !== $hover_icon_markup ? 'has-hover-icon' : '',
		$hover_icon_left ? 'has-hover-icon-left' : '',
		'' !== $hover_icon_markup && ! empty( $attributes['hoverIconFlipForRTL'] ) ? 'has-hover-icon-rtl-flip' : '',
		...$hover_classes,
		$has_shadow_hover ? 'has-shadow-hover' : '',
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
 * The rules are handed to core's style engine, not printed here, through
 * Block_Render::store_rules(), which also turns the hover rules' important flag
 * into `!important` (the engine's rule array has no such field).
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
Block_Render::store_rules( $responsive['rules'] );

printf(
	'<%1$s %2$s>%3$s%4$s%5$s</%1$s>',
	esc_attr( $tag_name ),
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	$hides_text ? '' : '<span class="wp-block-zealblocks-button__text">' . wp_kses( $text, Block_Render::LABEL_HTML ) . '</span>',
	$icon_markup, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by Icon_Library::render(), which esc_attr()s every interpolated value.
	$hover_icon_markup // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by Icon_Library::render(), which esc_attr()s every interpolated value.
);
