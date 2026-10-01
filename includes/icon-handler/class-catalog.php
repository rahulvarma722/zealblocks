<?php
/**
 * The icon catalog: the text the picker needs.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Icon_Handler;

defined( 'ABSPATH' ) || exit;

/**
 * Category titles and membership, plus labels borrowed from the Library.
 *
 * WHY THE PICKER'S TEXT LIVES IN PHP.
 *
 * The picker's geometry is an async webpack chunk, and a chunk is not a
 * registered script handle. WordPress resolves JS translations by md5 of a
 * handle's src, so a string inside a chunk has nothing to be found under:
 * `wp i18n make-json` writes a file no handle ever loads and the string stays
 * English with no error anywhere.
 *
 * PHP has none of that problem. `wp i18n make-pot` extracts these __() calls
 * and translate.wordpress.org delivers .mo files core loads by itself, so the
 * text is translated before it is ever serialised.
 *
 * EDITOR ONLY. Nothing on a visitor request reaches this — the front end
 * resolves one slug and never groups or searches.
 */
final class Catalog {

	/**
	 * Parsed categories.php, or null before the first call.
	 *
	 * @var array|null
	 */
	private static $data = null;

	/**
	 * Loads the category file once per request.
	 *
	 * Lazily, like the Library: the file calls __() on include, and a text
	 * domain used before `after_setup_theme` raises _doing_it_wrong
	 * (wp-includes/l10n.php:1444).
	 *
	 * @return array { titles: array<string,string>, members: array<string,string[]> }
	 */
	private static function all() {
		if ( null !== self::$data ) {
			return self::$data;
		}

		$file = __DIR__ . '/categories.php';
		$data = is_readable( $file ) ? require $file : array();

		self::$data = array(
			'titles'  => isset( $data['titles'] ) && is_array( $data['titles'] ) ? $data['titles'] : array(),
			'members' => isset( $data['members'] ) && is_array( $data['members'] ) ? $data['members'] : array(),
		);

		return self::$data;
	}

	/**
	 * Category slug => translated title.
	 *
	 * @return array<string, string>
	 */
	public static function titles() {
		$data = self::all();

		return $data['titles'];
	}

	/**
	 * The categories one icon belongs to.
	 *
	 * @param string $slug Icon slug.
	 * @return string[] Category slugs, empty when the icon has none.
	 */
	public static function categories_for( $slug ) {
		$data = self::all();

		return $data['members'][ $slug ] ?? array();
	}

	/**
	 * The first category's translated title, for a one-line "source · category".
	 *
	 * @param string $slug Icon slug.
	 * @return string Title, or '' when the icon is uncategorised.
	 */
	public static function primary_title( $slug ) {
		$cats = self::categories_for( $slug );

		if ( ! $cats ) {
			return '';
		}

		$titles = self::titles();

		return $titles[ $cats[0] ] ?? '';
	}

	/**
	 * Adds each icon's category title to a resolved set.
	 *
	 * Used by the two EDITOR paths — the inlined payload and the REST route —
	 * so the inspector can say "Library · Commerce" for an icon restored from a
	 * saved post, not only for one just chosen in the picker.
	 *
	 * Never call this from a render path. The front end has no use for a
	 * category and this loads a file it would otherwise never touch.
	 *
	 * @param array<string, array> $icons Slug => icon data.
	 * @return array<string, array> The same, with `categoryLabel` where known.
	 */
	public static function with_category( array $icons ) {
		foreach ( $icons as $slug => $icon ) {
			$title = self::primary_title( $slug );

			if ( '' !== $title ) {
				$icons[ $slug ]['categoryLabel'] = $title;
			}
		}

		return $icons;
	}

	/**
	 * Everything the picker needs to draw its sidebar and label its grid.
	 *
	 * Labels come from the Library rather than being duplicated here — one
	 * source for a string that is already translated there.
	 *
	 * @return array { categories: array, icons: array<string, array> }
	 */
	public static function index() {
		$data  = self::all();
		$icons = array();

		foreach ( Library::all_icons() as $slug => $icon ) {
			$entry = array( 'label' => $icon['label'] );
			$cats  = $data['members'][ $slug ] ?? array();

			if ( $cats ) {
				$entry['cats'] = $cats;
			}

			$icons[ $slug ] = $entry;
		}

		return array(
			'categories' => $data['titles'],
			'icons'      => $icons,
		);
	}
}
