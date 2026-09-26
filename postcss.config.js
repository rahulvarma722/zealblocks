/**
 * PostCSS.
 *
 * wp-scripts uses its own PostCSS setup only while the project has none. Once
 * this file exists it takes over, so autoprefixer is listed here rather than
 * inherited.
 */
module.exports = {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
};
