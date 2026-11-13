/**
 * Playwright end-to-end tests: the editor UI and the real front end.
 *
 * Extends wp-scripts' config (it logs in once through REST in its global
 * setup, saves the session, and runs serially) and points it at an existing
 * site rather than wp-env. See tests/e2e/README.md before running: the suite
 * runs against a real site, so it only ever deletes posts it created.
 *
 * The login comes from `.env.e2e` in the plugin root (git-ignored), or from
 * the same variables in the environment, which win.
 */

const fs = require( 'fs' );
const path = require( 'path' );

/*
 * A tiny loader rather than dotenv, which is not a dependency: KEY=value per
 * line, `#` comments, nothing else. Set before wp-scripts' config is read,
 * because it reads WP_BASE_URL at require time.
 */
const envFile = path.join( __dirname, '.env.e2e' );

if ( fs.existsSync( envFile ) ) {
	fs.readFileSync( envFile, 'utf8' )
		.split( /\r?\n/ )
		.forEach( ( line ) => {
			const match = line.match( /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/ );

			if ( match && ! line.trim().startsWith( '#' ) ) {
				process.env[ match[ 1 ] ] ??= match[ 2 ];
			}
		} );
}

process.env.WP_BASE_URL ??= 'http://localhost:10003';
process.env.WP_ARTIFACTS_PATH ??= path.join( __dirname, 'artifacts' );

const baseConfig = require( '@wordpress/scripts/config/playwright.config.js' );

module.exports = {
	...baseConfig,
	testDir: './tests/e2e/specs',
	// The site is already running (Local); wp-env is not part of this repo.
	webServer: undefined,
	use: {
		...baseConfig.use,
		// Wider than wp-scripts' 960px, so the editor canvas is Desktop size.
		viewport: { width: 1280, height: 900 },
	},
};
