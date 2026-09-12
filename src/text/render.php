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

$text = Block_Render::text( $attributes, 'content' );

// Empty text would render an empty element that still takes vertical space and
// still announces itself to a screen reader.
if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
	return;
}

/*
 * THE ELEMENT IS ALWAYS A PARAGRAPH.
 *
 * A configurable HTML tag is deliberately out of scope for now. When it
 * returns it belongs here, validated against an allow-list — the tag name
 * lands in an ELEMENT POSITION, so it is an XSS boundary rather than a styling
 * preference, and `<script>` or `<iframe>` reaching this line would be
 * exploitable. Until then there is nothing to validate, because there is
 * nothing to choose.
 */

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

$wrapper_attributes = get_block_wrapper_attributes(
	'' !== $style_as ? array( 'class' => 'has-style-' . $style_as ) : array()
);

printf(
	'<p %1$s>%2$s</p>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); the string is attribute markup, so escaping it again would corrupt it.
	wp_kses( $text, Block_Render::LABEL_HTML )
);
