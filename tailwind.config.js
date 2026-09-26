/**
 * Tailwind, configured to coexist with WordPress admin.
 *
 * preflight — off. Tailwind's reset restyles button, input, select, a and
 * h1-h6 at the element level, which is what admin chrome is built from.
 *
 * important — every utility is emitted as `.zb-ui .flex` instead of `.flex`.
 * That scopes them (nothing applies outside our own markup) and beats admin's
 * single-class rules on specificity. Note utilities then apply to DESCENDANTS
 * of `.zb-ui`, so that element can't style itself with them.
 */
module.exports = {
	content: [ './src/**/*.{js,jsx}' ],
	important: '.zb-ui',
	// container is off because it is the one core plugin that ignores the
	// `important` selector — it emits a bare `.container` that escapes our scope.
	corePlugins: { preflight: false, container: false },
	theme: { extend: {} },
	plugins: [],
};
