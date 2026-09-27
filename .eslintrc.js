/**
 * ESLint configuration.
 *
 * Extends the wp-scripts default and changes exactly one rule.
 */
module.exports = {
	extends: [ 'plugin:@wordpress/eslint-plugin/recommended' ],
	rules: {
		/*
		 * THE EXPERIMENTAL-API REGISTER.
		 *
		 * Every `__experimental*` import in this plugin is listed here, and
		 * nowhere else. That is the point of configuring the rule rather than
		 * scattering eslint-disable comments at the import sites: this list is
		 * the complete inventory of what core could break without a deprecation
		 * cycle, in one place, greppable, and it fails loudly the moment
		 * somebody reaches for a sixth one.
		 *
		 * None of these has a stable equivalent in WordPress 7.1. Replacing them
		 * means reimplementing a unit control, a tools-panel item, a toggle group
		 * and a link control by hand — which would look and behave unlike every
		 * core control sitting beside them in the same inspector, for a UX
		 * regression and more code to maintain.
		 *
		 * Worth re-checking on each WordPress release: `__experimentalBorder` and
		 * the typography flags were stabilised this way, and the PHP-side support
		 * keys in block.json must NOT be renamed in step (core 7.1 still reads
		 * only the experimental keys — see wp-includes/block-supports/).
		 */
		'@wordpress/no-unsafe-wp-apis': [
			'error',
			{
				'@wordpress/block-editor': [
					// Link editing popover used by the toolbar's Link button.
					'__experimentalLinkControl',
				],
				'@wordpress/components': [
					// Icon position (Left / Right) segmented control.
					'__experimentalToggleGroupControl',
					'__experimentalToggleGroupControlOption',
					// Custom Width / Icon Size / Markup rows inside core's
					// ToolsPanel, so they get core's reset-all and per-item
					// reset behaviour.
					'__experimentalToolsPanel',
					'__experimentalToolsPanelItem',
					// Length + unit input matching core's dimension controls.
					'__experimentalUnitControl',
					'__experimentalUseCustomUnits',
				],
			},
		],
	},

	overrides: [
		{
			/*
			 * Jest globals — describe/it/expect — exist only in test files.
			 *
			 * Scoped to tests/ rather than set globally, so a stray `describe`
			 * in src/ is still the error it should be.
			 */
			files: [ 'tests/**/*.js' ],
			env: { jest: true },
		},
		{
			/*
			 * shadcn components import `react` directly rather than
			 * `@wordpress/element`, and that is correct — do not "fix" it.
			 *
			 * wp-scripts externalises `react` to the script handle WordPress
			 * already enqueues, so nothing is bundled and nothing duplicated.
			 * The rule fires only because `react` is absent from package.json,
			 * which is right: WordPress provides it, we do not install it.
			 *
			 * Rewriting the import would mean hand-editing every component
			 * pasted in from the registry, forever.
			 */
			files: [ 'src/ui/**/*.{js,jsx}' ],
			rules: { 'import/no-extraneous-dependencies': 'off' },
		},
	],
};
