<?php
/**
 * The plugin's icon collection.
 *
 * @package Zealblocks
 */

namespace Zealblocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers a collection in the core icon library and fills it.
 *
 * WHAT A "COLLECTION" IS.
 *
 * WordPress 7.1 added two registries: one for icons, one for the collections
 * they belong to (wp-includes/class-wp-icon-collections-registry.php). The
 * grouping is FLAT and SINGLE-AXIS — an icon's collection is simply the part
 * of its name before the slash, split out by the registry itself. There are no
 * sub-categories and no tags, so a collection is the only way to group icons,
 * and one icon belongs to exactly one.
 *
 * The editor turns each registered collection into a tab in the icon library
 * modal, alongside a built-in "All". That is the entire integration: register
 * a collection and the tab exists. No JavaScript is involved.
 *
 * WHY THE SLUG IS THE PLUGIN SLUG AND THE LABEL IS NOT.
 *
 * The slug is written into post content — `core/icon` stores the qualified
 * name as its `icon` attribute, so `zealblocks/spark` ends up in the database
 * of every site that uses one. Changing it later orphans that content, exactly
 * like renaming a block. Tying it to ZEALBLOCKS_SLUG means the one thing that
 * must never drift is the one thing bin/rename.sh already knows how to change
 * (see docs/RENAMING.md).
 *
 * The LABEL is display-only and appears nowhere but the tab, so it is free to
 * change at any time. Hence "Zeal Icons" as a label over a `zeal-icons` slug:
 * same result in the UI, none of the migration debt.
 */
final class Icons implements Module {

	/**
	 * Directory holding the SVG files, relative to the plugin root.
	 *
	 * @var string
	 */
	const DIRECTORY = 'assets/icons/';

	/**
	 * Icon slugs, each matching a `<slug>.svg` in self::DIRECTORY.
	 *
	 * Labels live in labels() rather than here because a `const` cannot hold
	 * a __() call, and an untranslated label would show verbatim in every
	 * locale.
	 *
	 * @var string[]
	 */
	const ICONS = array( 'bolt', 'grid', 'shield', 'spark' );

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_collection' ) );
	}

	/**
	 * Registers the collection, then the icons that live in it.
	 *
	 * Both happen in ONE callback because wp_register_icon() rejects any name
	 * whose collection is not already registered. Core registers its own
	 * collection on `init` at priority 0 and its icons at the default 10, so
	 * running here at 10 is safely after core and self-ordered besides.
	 *
	 * @return void
	 */
	public function register_collection() {
		$registered = wp_register_icon_collection(
			ZEALBLOCKS_SLUG,
			array(
				'label'       => __( 'Zeal Icons', 'zealblocks' ),
				'description' => __( 'Icons bundled with Zealblocks.', 'zealblocks' ),
			)
		);

		/*
		 * A false here means the slug was already taken — a second copy of the
		 * plugin, or another plugin that picked the same name. Continuing
		 * would silently add our icons to a collection somebody else owns and,
		 * worse, make unregistering theirs delete ours. Registering nothing is
		 * the honest outcome.
		 */
		if ( ! $registered ) {
			return;
		}

		$labels = $this->labels();

		/*
		 * file_path rather than content: the registry only reads and sanitises
		 * the file when the icon is actually asked for, so a collection costs
		 * nothing on a request that never opens the icon library.
		 */
		foreach ( self::ICONS as $icon ) {
			wp_register_icon(
				ZEALBLOCKS_SLUG . '/' . $icon,
				array(
					'label'     => $labels[ $icon ],
					'file_path' => ZEALBLOCKS_PATH . self::DIRECTORY . $icon . '.svg',
				)
			);
		}
	}

	/**
	 * Human-readable labels, keyed by icon slug.
	 *
	 * These are what the icon library shows under each tile and what its
	 * search matches against, so they are worth translating and worth being
	 * words a person would actually type.
	 *
	 * @return array<string, string>
	 */
	private function labels() {
		return array(
			'bolt'   => __( 'Bolt', 'zealblocks' ),
			'grid'   => __( 'Grid', 'zealblocks' ),
			'shield' => __( 'Shield', 'zealblocks' ),
			'spark'  => __( 'Spark', 'zealblocks' ),
		);
	}
}
