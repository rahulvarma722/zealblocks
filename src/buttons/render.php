<?php
/**
 * Front-end markup for zealblocks/buttons.
 *
 * A container: the only job is to emit the wrapper and print whatever
 * the inner blocks rendered. Layout classes (the flex container and its
 * blockGap) are added by wp_render_layout_support_flag() on the
 * render_block filter, after this file runs — there is nothing to do
 * here for them.
 *
 * @package Zealblocks
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

defined( 'ABSPATH' ) || exit;

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

// An empty container would render as a stray, invisible wrapper.
if ( '' === trim( (string) $content ) ) {
	return;
}

/*
 * $content is NOT filtered, and must not be.
 *
 * It is not user input: it is the finished HTML of the inner blocks, which core
 * produced by running each child's own render callback — every one of which
 * escaped its own output on the way through. Filtering here would mean escaping
 * twice.
 *
 * wp_kses() in particular would be actively destructive. A container cannot
 * know what its children legitimately emit: today that is anchors, buttons,
 * spans and inline SVG, and tomorrow it is whatever block a user nests here.
 * Any allow-list narrow enough to be worth writing would silently delete part
 * of somebody's page. This is why core's own container blocks — core/group,
 * core/buttons, core/columns — print $content unfiltered too.
 *
 * The escaping boundary for inner blocks is the CHILD's render callback. For
 * this block, that is src/button/render.php.
 */
printf(
	'<div %1$s>%2$s</div>',
	get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr() applied per value by get_block_wrapper_attributes(); re-escaping attribute markup would corrupt it.
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Already-rendered inner block HTML; see the note above.
);
