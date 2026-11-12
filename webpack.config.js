/**
 * wp-scripts webpack config, extended with one path alias and one entry.
 *
 * wp-scripts uses its own config ONLY while the project has none. The moment
 * this file exists it takes over, so the default is spread back in — otherwise
 * externals, the block.json copy step, RTL CSS and asset manifests all stop.
 *
 * The alias exists because shadcn components are written as
 * `import { cn } from "@/ui/cn"`. Without it every component would need its
 * imports rewritten by hand.
 *
 * The extra entry is the shared animation view script. It belongs to no single
 * block, so no block.json names it and wp-scripts would not find it: it is
 * registered by Zealblocks\Block\Animation and enqueued only when an animated
 * block renders. `defaultConfig.entry` is a function (it scans for block.json
 * files at build time), so it is called rather than spread.
 */

const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: () => ( {
		...( typeof defaultConfig.entry === 'function'
			? defaultConfig.entry()
			: defaultConfig.entry ),
		'shared/animation-view': path.resolve(
			__dirname,
			'src/shared/animation/view.js'
		),
	} ),
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve.alias,
			'@': path.resolve( __dirname, 'src' ),
		},
	},
};
