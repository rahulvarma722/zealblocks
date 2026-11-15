<?php
/**
 * Self-hosted background video, with a pause button.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Block;

use Zealblocks\Helper;
use Zealblocks\Module;

defined( 'ABSPATH' ) || exit;

/**
 * Builds a container's background video and registers the script that plays it.
 *
 * WHY THE SCRIPT PLAYS IT, NOT `autoplay`.
 *
 * A moving background that starts by itself and lasts more than five seconds
 * needs a way to pause it (WCAG 2.2.2). The audit found Spectra's and
 * Elementor's background videos offer none, and keep playing for a visitor who
 * asked for reduced motion. Here the markup has no `autoplay` and no `src`:
 *
 *   - Without JavaScript nothing plays, and nothing is downloaded but the
 *     poster. There would be no working pause button, so there is no motion.
 *   - The script loads the video when the container nears the viewport, plays
 *     it unless the visitor prefers reduced motion, pauses it off screen, and
 *     shows the pause button, which then works.
 *   - "Off on mobile" hides it in core's mobile band and the script never
 *     loads it there, so a phone does not download it.
 *
 * Self-hosted only (D-C4): a YouTube or Vimeo background is a third-party
 * request on every page view.
 */
final class Background_Video implements Module {

	const SCRIPT = 'build/container/video-view.js';
	const ASSET  = 'build/container/video-view.asset.php';

	/**
	 * Hook in.
	 *
	 * @return void
	 */
	public function register() {
		add_action( 'init', array( $this, 'register_script' ) );
	}

	/**
	 * The script handle.
	 *
	 * @return string
	 */
	public static function handle() {
		return Helper::slug() . '-background-video';
	}

	/**
	 * Register the view script; render() enqueues it for a video only.
	 *
	 * @return void
	 */
	public function register_script() {
		$asset_file = Helper::path( self::ASSET );
		$asset      = is_readable( $asset_file ) ? require $asset_file : array();

		wp_register_script(
			self::handle(),
			Helper::url( self::SCRIPT ),
			isset( $asset['dependencies'] ) ? $asset['dependencies'] : array(),
			isset( $asset['version'] ) ? $asset['version'] : Helper::version(),
			array( 'strategy' => 'defer' )
		);
	}

	/**
	 * The video and its button, the root's classes, and any stored rule.
	 *
	 * Nothing at all for a URL that is not a usable video file.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $block_name Block name, for the class names: `wp-block-…`.
	 * @return array{markup: string, classes: string[], rules: array[]}
	 */
	public static function render( $attributes, $block_name ) {
		$none = array(
			'markup'  => '',
			'classes' => array(),
			'rules'   => array(),
		);
		$url  = Render::url( Render::text( $attributes, 'videoUrl' ) );

		if ( '' === $url ) {
			return $none;
		}

		$type = wp_check_filetype( (string) wp_parse_url( $url, PHP_URL_PATH ), wp_get_mime_types() );

		if ( empty( $type['type'] ) || ! str_starts_with( $type['type'], 'video/' ) ) {
			return $none;
		}

		$base   = 'wp-block-' . str_replace( '/', '-', $block_name );
		$poster = Render::url( Render::text( $attributes, 'videoPoster' ) );
		$hidden = isset( $attributes['videoOnMobile'] ) && false === $attributes['videoOnMobile'];
		$skip   = '';
		$rules  = array();

		$video = array(
			'class'       => $base . '__video',
			'data-src'    => $url,
			'muted'       => true,
			'loop'        => true,
			'playsinline' => true,
			'preload'     => 'none',
			'aria-hidden' => 'true',
			'tabindex'    => '-1',
		);

		if ( '' !== $poster ) {
			$video['poster'] = $poster;
		}

		$focal = Render::focal_point( isset( $attributes['videoPosition'] ) ? $attributes['videoPosition'] : null );

		if ( $focal ) {
			$video['style'] = sprintf( 'object-position:%s %s;', $focal[0], $focal[1] );
		}

		/*
		 * Off on mobile: hidden by a rule in core's mobile band, and the script
		 * is told the same band so it never loads the file there. One rule for
		 * every such container, which the store de-duplicates.
		 */
		$queries = Helper::media_queries();

		if ( $hidden && isset( $queries['@mobile'] ) ) {
			$skip                                = trim( (string) preg_replace( '/^@media\s*/', '', $queries['@mobile'] ) );
			$video['data-zealblocks-video-skip'] = $skip;
			$rules[]                             = array(
				'selector'     => '.' . $base . '.has-video-hidden-mobile > .' . $base . '__video,.' . $base . '.has-video-hidden-mobile > .' . $base . '__video-toggle',
				'declarations' => array( 'display' => 'none' ),
				'rules_group'  => $queries['@mobile'],
				'important'    => true,
			);
		}

		$pause = __( 'Pause background video', 'zealblocks' );
		$play  = __( 'Play background video', 'zealblocks' );

		$markup = sprintf(
			'<video %1$s></video><button type="button" class="%2$s__video-toggle" aria-label="%3$s" data-label-pause="%3$s" data-label-play="%4$s" hidden>'
				. '<svg class="%2$s__video-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">'
				. '<path class="%2$s__video-icon-pause" d="M7 5h3v14H7zM14 5h3v14h-3z"/>'
				. '<path class="%2$s__video-icon-play" d="M8 5v14l11-7z"/>'
				. '</svg></button>',
			self::attributes( $video ),
			esc_attr( $base ),
			esc_attr( $pause ),
			esc_attr( $play )
		);

		wp_enqueue_script( self::handle() );

		return array(
			'markup'  => $markup,
			'classes' => array_filter( array( 'has-video', $hidden ? 'has-video-hidden-mobile' : '' ) ),
			'rules'   => $rules,
		);
	}

	/**
	 * Attribute markup, each value escaped; true prints a bare attribute.
	 *
	 * The URLs get esc_attr() too: they arrive from Render::url(), already
	 * through esc_url(), and esc_attr() does not encode an entity twice.
	 *
	 * @param array<string, string|bool> $attributes Name => value.
	 * @return string
	 */
	private static function attributes( $attributes ) {
		$parts = array();

		foreach ( $attributes as $name => $value ) {
			if ( true === $value ) {
				$parts[] = $name;
				continue;
			}

			$parts[] = sprintf( '%s="%s"', $name, esc_attr( $value ) );
		}

		return implode( ' ', $parts );
	}
}
