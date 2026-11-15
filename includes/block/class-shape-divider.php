<?php
/**
 * Shape dividers for the top and bottom of a container.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Helper;

defined( 'ABSPATH' ) || exit;

/**
 * Builds a container's top and bottom shape dividers.
 *
 * The shapes live in shape-dividers.json beside this file, which the editor
 * imports too, so both draw from one list. Each layer of a shape is one curve
 * from x=0 to x=1000 in a 1000×100 box. The shape is the curve closed along
 * the top edge; its inverse, the curve closed along the bottom edge. A bottom
 * divider is the same drawing turned half round by style.scss.
 *
 * Shape, flip, invert and "bring to front" are one choice for every device, a
 * block attribute. Colour, height and width are per device, in
 * `style.zealblocks`, and reach the SVG as custom properties.
 */
final class Shape_Divider {

	const FILE = 'includes/block/shape-dividers.json';

	/**
	 * The shapes, read once per request.
	 *
	 * @var array<string, array>|null
	 */
	private static $shapes = null;

	/**
	 * Slug => layers, each `{ curve, opacity? }`.
	 *
	 * @return array<string, array>
	 */
	public static function shapes() {
		if ( null === self::$shapes ) {
			$file         = Helper::path( self::FILE );
			$data         = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- A local file shipped with the plugin.
			self::$shapes = is_array( $data ) ? $data : array();
		}

		return self::$shapes;
	}

	/**
	 * The per-device keys and the custom properties they become.
	 *
	 * @param string $prefix Custom property prefix, e.g. `--zealblocks-container-divider-`.
	 * @return array<string, string[]> For a Render::responsive() map.
	 */
	public static function properties( $prefix ) {
		$map = array();

		foreach ( array( 'Top', 'Bottom' ) as $side ) {
			$slug = strtolower( $side );

			$map[ 'divider' . $side . 'Color' ]  = array( $prefix . $slug . '-color', 'color' );
			$map[ 'divider' . $side . 'Height' ] = array( $prefix . $slug . '-height', 'length' );
			$map[ 'divider' . $side . 'Width' ]  = array( $prefix . $slug . '-width', 'length' );
		}

		return $map;
	}

	/**
	 * One divider's markup, or '' when the side has no known shape.
	 *
	 * @param mixed  $config `{ shape, flip, invert, front }` from the block.
	 * @param string $side   'top' or 'bottom'.
	 * @param string $base   The block's base class, e.g. `wp-block-zealblocks-container`.
	 * @return string
	 */
	public static function render( $config, $side, $base ) {
		if ( ! is_array( $config ) || ! in_array( $side, array( 'top', 'bottom' ), true ) ) {
			return '';
		}

		$shapes = self::shapes();
		$shape  = isset( $config['shape'] ) && is_string( $config['shape'] ) ? $config['shape'] : '';

		if ( '' === $shape || ! isset( $shapes[ $shape ] ) || ! is_array( $shapes[ $shape ] ) ) {
			return '';
		}

		$close = empty( $config['invert'] ) ? ' L1000,0 L0,0 Z' : ' L1000,100 L0,100 Z';
		$paths = '';

		foreach ( $shapes[ $shape ] as $layer ) {
			if ( ! isset( $layer['curve'] ) || ! is_string( $layer['curve'] ) ) {
				continue;
			}

			$opacity = isset( $layer['opacity'] ) && is_numeric( $layer['opacity'] ) ? (float) $layer['opacity'] : 1.0;

			$paths .= sprintf(
				'<path d="%s"%s/>',
				esc_attr( $layer['curve'] . $close ),
				$opacity < 1 ? sprintf( ' opacity="%s"', esc_attr( (string) round( $opacity, 2 ) ) ) : ''
			);
		}

		$classes = array_filter(
			array(
				$base . '__divider',
				'is-' . $side,
				'is-shape-' . $shape,
				empty( $config['flip'] ) ? '' : 'is-flipped',
				empty( $config['invert'] ) ? '' : 'is-inverted',
				empty( $config['front'] ) ? '' : 'is-front',
			)
		);

		return sprintf(
			'<div class="%s" aria-hidden="true"><svg viewBox="0 0 1000 100" preserveAspectRatio="none" focusable="false">%s</svg></div>',
			esc_attr( implode( ' ', $classes ) ),
			$paths
		);
	}
}
