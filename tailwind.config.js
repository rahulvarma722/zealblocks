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
	theme: {
		extend: {
			/*
			 * shadcn components use semantic colour names — `bg-muted`,
			 * `border-border`. These are not stock Tailwind, so they have to be
			 * declared here or those classes generate nothing, with no error.
			 *
			 * Listed here is what the plugin actually uses. src/ui/tailwind.css
			 * holds the values and names the rest of shadcn's palette, for
			 * whoever adds the next component from the registry.
			 */
			colors: {
				border: 'var(--zb-border)',
				background: 'var(--zb-background)',
				foreground: 'var(--zb-foreground)',
				muted: {
					DEFAULT: 'var(--zb-muted)',
					foreground: 'var(--zb-muted-foreground)',
				},
			},
			borderRadius: {
				lg: 'var(--zb-radius)',
				md: 'calc(var(--zb-radius) - 1px)',
				sm: 'calc(var(--zb-radius) - 2px)',
			},
		},
	},
	/*
	 * shadcn's overlays use `animate-in`, `fade-in-0`, `zoom-in-95` and friends,
	 * which this plugin supplies. Without it those classes silently produce
	 * nothing and dialogs appear with no transition.
	 */
	plugins: [ require( 'tailwindcss-animate' ) ],
};
