/**
 * PostCSS for wp-scripts.
 *
 * wp-scripts only uses its own built-in PostCSS setup when the project has NO
 * postcss.config.js (see @wordpress/scripts/utils/config.js, hasPostCSSConfig).
 * The moment this file exists, it takes over completely — which is why
 * autoprefixer has to be listed here explicitly rather than inherited.
 */
module.exports = {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
};
