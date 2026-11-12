<?php
/**
 * Front-end markup for zealblocks/text.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

/*
 * A file-level `use` in a file with no `namespace` declaration.
 *
 * `use` is lexical and per-file: it aliases for THIS file regardless of the
 * scope the file is required from. Core requires render templates from inside a
 * closure in wp-includes/blocks.php, which is global scope, and the alias still
 * applies here.
 */
use Zealblocks\Block\Display_Conditions;
use Zealblocks\Block\Render as Block_Render;

/*
 * phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
 *
 * These variables are not global. register_block_type_from_metadata() wraps this
 * template in a static closure and requires it from inside that closure
 * (wp-includes/blocks.php:629-631), so every assignment below is
 * function-scoped. PHPCS sees a file whose top level assigns variables and
 * cannot know that; core's own block templates trip the same sniff.
 */

/*
 * Display conditions first, before any work: a hidden block renders nothing at
 * all, so its content never reaches the page source either.
 */
if ( Display_Conditions::hides( isset( $attributes['displayConditions'] ) ? $attributes['displayConditions'] : null ) ) {
	return;
}

$text = Block_Render::text( $attributes, 'content' );

// Empty text would render an empty element that still takes vertical space and
// still announces itself to a screen reader. An inline image is content even
// though it has no text, so a block holding only an image still renders.
if ( '' === trim( wp_strip_all_tags( $text ) ) && ! preg_match( '/<img\b/i', $text ) ) {
	return;
}

/*
 * THE TAG NAME IS AN XSS BOUNDARY, NOT A STYLING PREFERENCE.
 *
 * It lands in an ELEMENT POSITION, so `<script>` or `<iframe>` reaching the
 * printf below would be exploitable. block.json declares an enum, but core only
 * falls back to the default for a value outside it when the attribute passes
 * through prepare_attributes_for_render(); this allow-list is the guarantee,
 * and it is the same list as the enum so the two cannot disagree about what is
 * valid.
 *
 * Every entry is a text-level or flow element with no behaviour of its own —
 * Spectra's list, which is the set authors coming from it expect. Nothing that
 * loads a resource, runs script, submits or embeds is on it.
 */
$tag_name = Block_Render::one_of(
	Block_Render::text( $attributes, 'tagName' ),
	array(
		'p',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'div',
		'span',
		'blockquote',
		'address',
		'cite',
		'time',
		'label',
		'figcaption',
		'caption',
		'legend',
		'dt',
		'dd',
		'li',
		'summary',
		'pre',
		'strong',
		'em',
		'small',
		'mark',
		'del',
		'ins',
		'sub',
		'sup',
		'abbr',
		'code',
		'kbd',
		'samp',
		'var',
		'output',
		'q',
		's',
		'dfn',
		'bdi',
		'bdo',
	),
	'p'
);

/*
 * Drop cap: a class, styled in style.scss.
 *
 * Only on block-level tags — `::first-letter` does nothing on an inline
 * element, so a span would carry a class with no effect. And not when the text
 * is centred or aligned to the end edge, where a floated initial letter sits at
 * the wrong side of the line. The editor disables the toggle in both cases;
 * this is the guard for a value set before the alignment changed.
 */
$text_align   = isset( $attributes['style']['typography']['textAlign'] ) && is_string( $attributes['style']['typography']['textAlign'] )
	? $attributes['style']['typography']['textAlign']
	: '';
$end_edge     = is_rtl() ? 'left' : 'right';
$has_drop_cap = ! empty( $attributes['dropCap'] )
	&& in_array( $tag_name, array( 'p', 'div', 'blockquote' ), true )
	&& ! in_array( $text_align, array( 'center', $end_edge ), true );

/*
 * Per-viewport values, stored in core's `style` attribute under `zealblocks`
 * exactly as the Button stores its width — see docs/styles.md.
 *
 * Three destinations:
 *
 *   - Column gap lands on the root as a real `column-gap`, beside the
 *     `column-count` core's textColumns support writes.
 *   - The text shadow is FOUR custom properties, combined in style.scss. Kept
 *     apart so a tablet override of the colour alone inherits the desktop
 *     offsets through the cascade, instead of needing all four restated.
 *   - Z-index, position, its offsets and overflow are real declarations too.
 *     A class with no position gets `position: relative` from style.scss when
 *     it has a z-index, so the z-index takes effect; that rule has zero
 *     specificity, so a chosen position always wins over it.
 *   - Hover colours are real declarations under `:hover`, marked important.
 *     Not variables: a variable the active band does not define would make
 *     `color: var(--x)` invalid at computed-value time and reset the text to
 *     its inherited colour on hover — so a mobile-only hover colour would
 *     break hover on desktop. A rule that simply does not exist outside its
 *     band has no such failure.
 */
$responsive = Block_Render::responsive(
	isset( $attributes['style'] ) ? $attributes['style'] : array(),
	'zealblocks',
	array(
		'columnGap'       => array( 'column-gap', 'length' ),
		'textShadowX'     => array( '--zealblocks-text-shadow-x', 'signed-length' ),
		'textShadowY'     => array( '--zealblocks-text-shadow-y', 'signed-length' ),
		'textShadowBlur'  => array( '--zealblocks-text-shadow-blur', 'length' ),
		'textShadowColor' => array( '--zealblocks-text-shadow-color', 'color' ),
		'hoverDuration'   => array( '--zealblocks-text-hover-duration', 'time' ),
		'textHover'       => array( 'color', 'color', ':hover' ),
		'backgroundHover' => array( 'background', 'background', ':hover' ),
		'zIndex'          => array( 'z-index', 'integer' ),
		'position'        => array( 'position', 'position' ),
		'positionTop'     => array( 'top', 'signed-length' ),
		'positionRight'   => array( 'right', 'signed-length' ),
		'positionBottom'  => array( 'bottom', 'signed-length' ),
		'positionLeft'    => array( 'left', 'signed-length' ),
		'overflow'        => array( 'overflow', 'overflow' ),
	),
	'zealblocks-text-'
);

/*
 * Feature classes, derived from the rules that SURVIVED validation rather than
 * from the stored values, so the block never carries a class whose rule was
 * dropped. `has-text-shadow` switches the property on; `has-hover` adds the
 * transition. Both are needed in every band once any band uses them, which is
 * why they come from the rules of all bands together.
 */
$has_text_shadow = false;
$has_hover       = false;
$has_z_index     = false;

foreach ( $responsive['rules'] as $rule ) {
	foreach ( array_keys( $rule['declarations'] ) as $property ) {
		$has_text_shadow = $has_text_shadow || str_starts_with( $property, '--zealblocks-text-shadow-' );
		$has_z_index     = $has_z_index || 'z-index' === $property;
	}

	$has_hover = $has_hover || str_ends_with( $rule['selector'], ':hover' );
}

/*
 * The visual preset is emitted as a CLASS, never an inline style.
 *
 * style.scss resolves each preset against the active theme's font-size presets
 * with a fallback, so a theme with a real type scale drives the look and a theme
 * without one still renders sensibly. An inline font-size would beat the theme
 * forever and could not be overridden at all.
 *
 * Validated against the same fixed list style.scss implements. An unknown value
 * would emit a class with no rule behind it — harmless to render, but dead
 * markup that invites "what styles this?".
 */
$style_as = Block_Render::one_of(
	Block_Render::text( $attributes, 'styleAs' ),
	array( 'display', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'lead', 'body', 'caption', 'eyebrow' )
);

/*
 * Entrance animation.
 *
 * The type is a data attribute that style.scss maps to a start state, and
 * timing travels as custom properties. Everything is validated here because it
 * lands in attribute and style positions: the type against the fixed list,
 * the numbers clamped to 0–5000 ms.
 *
 * The view script is loaded only when a block on the page is animated. The
 * registrar strips it from the block type so core does not load it for every
 * Text block (see Registrar::ON_DEMAND_VIEW_SCRIPTS).
 */
$animation_type = Block_Render::one_of(
	Block_Render::text( $attributes, 'animationType' ),
	array(
		'fade',
		'fade-up',
		'fade-down',
		'fade-left',
		'fade-right',
		'flip-up',
		'flip-down',
		'flip-left',
		'flip-right',
		'slide-up',
		'slide-down',
		'slide-left',
		'slide-right',
		'zoom-in',
		'zoom-in-up',
		'zoom-in-down',
		'zoom-in-left',
		'zoom-in-right',
		'zoom-out',
		'zoom-out-up',
		'zoom-out-down',
		'zoom-out-left',
		'zoom-out-right',
	)
);

$extra_attributes = array();

if ( '' !== $animation_type ) {
	$clamp_ms = static function ( $key, $fallback ) use ( $attributes ) {
		$value = isset( $attributes[ $key ] ) && is_numeric( $attributes[ $key ] ) ? (int) $attributes[ $key ] : $fallback;

		return max( 0, min( 5000, $value ) );
	};

	$extra_attributes['data-zealblocks-animation'] = $animation_type;
	$extra_attributes['style']                     = sprintf(
		'--zealblocks-animation-duration:%dms;--zealblocks-animation-delay:%dms;--zealblocks-animation-easing:%s;',
		$clamp_ms( 'animationDuration', 400 ),
		$clamp_ms( 'animationDelay', 0 ),
		Block_Render::one_of(
			Block_Render::text( $attributes, 'animationEasing' ),
			array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' ),
			'ease'
		)
	);

	if ( ! empty( $attributes['animationRepeat'] ) ) {
		$extra_attributes['data-zealblocks-animation-repeat'] = 'true';
	}

	wp_enqueue_script( 'zealblocks-text-view-script' );
}

$wrapper_classes = array_filter(
	array(
		'' !== $style_as ? 'has-style-' . $style_as : '',
		$has_drop_cap ? 'has-drop-cap' : '',
		$responsive['class'],
		$has_text_shadow ? 'has-text-shadow' : '',
		$has_hover ? 'has-hover' : '',
		$has_z_index ? 'has-zealblocks-z-index' : '',
		'' !== $animation_type ? 'has-animation' : '',
	)
);

if ( $wrapper_classes ) {
	$extra_attributes['class'] = implode( ' ', $wrapper_classes );
}

$wrapper_attributes = get_block_wrapper_attributes( $extra_attributes );

Block_Render::store_rules( $responsive['rules'] );

/*
 * wp_kses_post(), NOT Block_Render::LABEL_HTML.
 *
 * This is body text, and its RichText offers every core format: link,
 * highlight and inline colour (<mark>), underline (<span style>), keyboard
 * (<kbd>), language (<bdo>), inline image and inline math, besides bold and
 * italic. LABEL_HTML is a button-label list with none of those, so filtering
 * through it silently dropped them on the front end while the editor still
 * showed them. The post content was never affected; only this output was.
 *
 * wp_kses_post() is the list core applies to post bodies, so it keeps every
 * format the editor can produce, including ones core adds later, and still
 * removes scripts, event handlers and unsafe URL schemes.
 */
printf(
	'<%1$s %2$s>%3$s</%1$s>',
	esc_attr( $tag_name ),
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	wp_kses_post( $text )
);
