<?php
/**
 * Serving icons to the editor.
 *
 * @package Zealblocks
 */

namespace Zealblocks\Icon_Handler;

defined( 'ABSPATH' ) || exit;

/**
 * A REST route for resolving icon slugs.
 *
 * WHY A ROUTE THAT TAKES SLUGS RATHER THAN RETURNING EVERYTHING.
 *
 * The editor has two different jobs and they want opposite things. Drawing the
 * icons a post ALREADY uses needs a handful of slugs, immediately. Browsing the
 * picker needs all 1992 with categories, but only when someone opens it.
 *
 * Serving both from one endpoint would mean every editor load pays for the
 * picker. So this route answers only "resolve these slugs", and the picker's
 * data ships separately as a lazily imported module.
 *
 * WHY THIS ROUTE IS THE FALLBACK, NOT THE MAIN PATH.
 *
 * Icons a post ALREADY uses are resolved in PHP and inlined into the editor by
 * Icon_Editor_Data, so they cost no requests at all. This route answers only
 * for an icon chosen AFTER load — one the inline data could not have known
 * about — which is a single icon at a time, on a deliberate user action.
 */
final class Rest implements \Zealblocks\Module {

	/**
	 * REST namespace.
	 *
	 * @var string
	 */
	const NAMESPACE = 'zealblocks/v1';

	/**
	 * Route, relative to the namespace.
	 *
	 * @var string
	 */
	const ROUTE = '/icons';

	/**
	 * {@inheritDoc}
	 */
	public function register() {
		add_action( 'rest_api_init', array( $this, 'register_route' ) );
	}

	/**
	 * Registers the route.
	 *
	 * @return void
	 */
	public function register_route() {
		register_rest_route(
			self::NAMESPACE,
			self::ROUTE,
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'handle' ),
				'permission_callback' => array( $this, 'can_read' ),
				'args'                => array(
					'slugs' => array(
						'description'       => __( 'Comma-separated icon slugs.', 'zealblocks' ),
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Who may resolve icons.
	 *
	 * `edit_posts` rather than public: this exists to serve the editor, and the
	 * front end resolves icons in PHP without ever calling it.
	 *
	 * @return bool
	 */
	public function can_read() {
		return current_user_can( 'edit_posts' );
	}

	/**
	 * Resolves the requested slugs.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response
	 */
	public function handle( $request ) {
		$slugs = array_filter( array_map( 'trim', explode( ',', (string) $request['slugs'] ) ) );

		/*
		 * Capped so a crafted request cannot ask the server to assemble the
		 * entire library one slug at a time. The picker never needs this route
		 * for bulk work — it imports its own data.
		 */
		$slugs = array_slice( array_unique( $slugs ), 0, 100 );

		return rest_ensure_response( Library::get_many( $slugs ) );
	}
}
