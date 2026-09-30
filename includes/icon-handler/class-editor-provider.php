<?php
/**
 * Icons, as editor data.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Icon_Handler;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the icons a post already uses, so the editor never fetches them.
 *
 * The icons are INLINED, not preloaded.
 * `block_editor_rest_api_preload_paths` cannot do this job: apiFetch matches
 * the exact normalised path, so a preload of `?slugs=heart,star` never
 * satisfies a request for `?slugs=heart` and every icon would fetch anyway.
 */
final class Editor_Provider implements \Zealblocks\Module {

	/**
	 * Most distinct icons to inline.
	 *
	 * A post with hundreds of different icons is pathological. Past this they
	 * still resolve through the REST route: slower, but correct, rather than a
	 * very large payload embedded in the page for everyone.
	 *
	 * @var int
	 */
	const MAX_INLINE = 200;

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_filter( ZEALBLOCKS_SLUG . '_editor_data', array( $this, 'add_icons' ), 10, 2 );
	}

	/**
	 * Adds every icon the post uses.
	 *
	 * @param array   $data   Editor data so far.
	 * @param array[] $blocks This plugin's blocks, already flattened.
	 * @return array
	 */
	public function add_icons( $data, $blocks ) {
		$slugs = array();

		foreach ( $blocks as $block ) {
			$slug = $block['attrs']['icon'] ?? null;

			if ( is_string( $slug ) && '' !== $slug ) {
				$slugs[] = $slug;
			}
		}

		if ( ! $slugs ) {
			return $data;
		}

		// Deduplicate before resolving: the same icon used twenty times is one
		// lookup and one entry in the payload.
		$slugs = array_slice( array_values( array_unique( $slugs ) ), 0, self::MAX_INLINE );

		$data['icons'] = Library::get_many( $slugs );

		return $data;
	}
}
