/**
 * wp-scripts webpack config, extended with one path alias.
 *
 * wp-scripts uses its own config ONLY while the project has none. The moment
 * this file exists it takes over, so the default is spread back in — otherwise
 * externals, the block.json copy step, RTL CSS and asset manifests all stop.
 *
 * The alias exists because shadcn components are written as
 * `import { cn } from "@/ui/cn"`. Without it every component would need its
 * imports rewritten by hand.
 */

const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve.alias,
			'@': path.resolve( __dirname, 'src' ),
		},
	},
};
