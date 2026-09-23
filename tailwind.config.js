/**
 * Tailwind, tuned for running inside WordPress admin.
 *
 * TWO SETTINGS CARRY THE WHOLE INTEGRATION.
 *
 * `prefix` — WordPress admin already defines `.hidden`, `.button`, `.center`,
 * `.large` and others globally. Unprefixed Tailwind would generate colliding
 * class names and the two stylesheets would fight, with the winner decided by
 * load order. `zb-` makes a collision impossible.
 *
 * `preflight: false` — Tailwind's reset restyles `button`, `input`, `select`,
 * `a` and `h1`–`h6` at the element level. WordPress admin chrome is built on
 * those elements, so shipping preflight breaks the surrounding page, not just
 * our own UI.
 *
 * @see postcss.config.js
 */
module.exports = {
	prefix: 'zb-',
	corePlugins: { preflight: false },
	content: [ './src/**/*.{js,jsx}' ],
	theme: {
		extend: {
			/*
			 * Read from CSS variables rather than hard-coded hex, so the
			 * palette lives in one place (src/admin/admin.css) and can follow
			 * WordPress admin colour schemes.
			 */
			colors: {
				border: 'var(--zb-border)',
				input: 'var(--zb-input)',
				ring: 'var(--zb-ring)',
				background: 'var(--zb-background)',
				foreground: 'var(--zb-foreground)',
				primary: {
					DEFAULT: 'var(--zb-primary)',
					foreground: 'var(--zb-primary-foreground)',
				},
				muted: {
					DEFAULT: 'var(--zb-muted)',
					foreground: 'var(--zb-muted-foreground)',
				},
				destructive: {
					DEFAULT: 'var(--zb-destructive)',
					foreground: 'var(--zb-destructive-foreground)',
				},
			},
			borderRadius: {
				lg: 'var(--zb-radius)',
				md: 'calc(var(--zb-radius) - 1px)',
				sm: 'calc(var(--zb-radius) - 2px)',
			},
			keyframes: {
				'zb-in': {
					from: { opacity: 0, transform: 'scale(.97)' },
					to: { opacity: 1, transform: 'scale(1)' },
				},
				'zb-out': { from: { opacity: 1 }, to: { opacity: 0 } },
			},
			animation: {
				'zb-in': 'zb-in 120ms ease-out',
				'zb-out': 'zb-out 100ms ease-in',
			},
		},
	},
	plugins: [],
};
