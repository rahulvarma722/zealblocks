<?php
/**
 * Plugin Name:       Zealblocks
 * Description:       A Gutenberg block collection built on the WordPress 7.1 block API.
 * Version:           0.0.1
 * Requires at least: 7.1
 * Requires PHP:      8.1
 * Author:            Aman Dubey
 * Author URI:        https://amandubey.com/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       zealblocks
 *
 * @package Zealblocks
 */

defined( 'ABSPATH' ) || exit;

/*
 * ---------------------------------------------------------------------
 * Identity
 * ---------------------------------------------------------------------
 * Nothing else in the codebase should contain the literal string
 * "zealblocks" except each block's `block.json`, where the name has to be a
 * static string — see bin/rename.sh and docs/RENAMING.md.
 *
 * ZEALBLOCKS_SLUG    Folder name, text domain, script handles, block
 *                  category. Changeable before release; after release the
 *                  folder rename breaks .org updates.
 *
 * ZEALBLOCKS_VERSION The canonical version. Read by bin/build-zip.sh, which
 *                  refuses to package unless this, the `Version:` header
 *                  and readme.txt's `Stable tag` all agree.
 *
 * THE BLOCK NAMESPACE is deliberately NOT a constant. `zealblocks/button` is
 * written as a literal in each block.json, because that is the only place
 * `register_block_type()` will read it from, and a constant beside it could
 * only ever duplicate that value — silently drifting from it the moment one
 * changed. The prose is the part worth keeping:
 *
 *   The namespace is written into post content as an HTML comment
 *   (`<!-- wp:zealblocks/button -->`) and is effectively PERMANENT once any
 *   site saves a post using one of these blocks. Changing it without
 *   shipping block `deprecated` definitions breaks existing content.
 */
define( 'ZEALBLOCKS_VERSION', '0.0.1' );
define( 'ZEALBLOCKS_SLUG', 'zealblocks' );
define( 'ZEALBLOCKS_PATH', plugin_dir_path( __FILE__ ) );

/*
 * ---------------------------------------------------------------------
 * Boot
 * ---------------------------------------------------------------------
 * This file stays in the GLOBAL namespace, because a plugin's main file is
 * also its header block and WordPress reads that by parsing the file rather
 * than loading it. Everything else lives under the `Zealblocks` namespace, so
 * the reference below is fully qualified.
 *
 * The autoloader is the only require. Adding a class means adding a file —
 * there is no list here to keep in step, which is the whole point.
 *
 * There is deliberately NO runtime version check. Core enforces the two
 * version headers above when a plugin is activated, and this plugin has no
 * hard dependency that would fatal afterwards — its one WordPress 7.1 API is
 * guarded at the point of use, in the Helper class. The full reasoning, and
 * what to do instead if a future feature genuinely cannot degrade, is in
 * docs/ARCHITECTURE.md.
 */
require_once ZEALBLOCKS_PATH . 'includes/class-autoloader.php';

Zealblocks\Autoloader::register();

Zealblocks\Plugin::init();
