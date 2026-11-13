/**
 * The inspector controls, operated the way an author does: click, type, pick.
 * editor.spec.js proves each control is there; this proves it writes what the
 * canvas and the published page then show. TC-PD-07, TC-PD-08, TC-HV-01,
 * TC-B-36, TC-B-37, TC-B-39, TC-I-33, TC-X-01, TC-X-31.
 */

const { test, expect } = require( '../../utils' );

/**
 * The selected block's attributes.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<Object>} Attributes.
 */
function selectedAttributes( page ) {
	return page.evaluate(
		() =>
			window.wp.data.select( 'core/block-editor' ).getSelectedBlock()
				.attributes
	);
}

/**
 * A new post holding one Buttons block with one Button, the Button selected
 * and the inspector open on a tab.
 *
 * @param {Object} fixtures        Playwright fixtures.
 * @param {Object} fixtures.admin  Admin utils.
 * @param {Object} fixtures.editor Editor utils.
 * @param {Object} fixtures.page   Page.
 * @param {Object} fixtures.posts  The posts fixture.
 * @param {string} tab             'Settings' or 'Styles'.
 * @return {Promise<void>}
 */
async function buttonPost( { admin, editor, page, posts }, tab ) {
	await admin.createNewPost( { title: '[e2e] Controls' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);

	await editor.insertBlock( {
		name: 'zealblocks/buttons',
		innerBlocks: [
			{
				name: 'zealblocks/button',
				attributes: {
					text: 'Go',
					url: 'https://example.org/',
					icon: 'arrow-right',
				},
			},
		],
	} );

	await page.evaluate( () => {
		const { select, dispatch } = window.wp.data;
		const button =
			select( 'core/block-editor' ).getBlocks()[ 0 ].innerBlocks[ 0 ];

		dispatch( 'core/block-editor' ).selectBlock( button.clientId );
	} );
	await editor.openDocumentSettingsSidebar();
	await page.getByRole( 'tab', { name: tab } ).click();
}

/**
 * Turns on an optional control from a panel's options menu.
 *
 * @param {import('@playwright/test').Page} page  Page.
 * @param {string}                          panel e.g. 'Dimensions'.
 * @param {string}                          item  e.g. 'Z-index'.
 * @return {Promise<void>}
 */
async function showOptional( page, panel, item ) {
	await page
		.locator( '.block-editor-block-inspector' )
		.getByRole( 'button', { name: `${ panel } options` } )
		.click();
	await page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( 'menuitemcheckbox', { name: item } )
		.click();
	await page.keyboard.press( 'Escape' );
}

/**
 * Publishes the post being edited and returns its link.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<string>} The permalink.
 */
async function publish( page ) {
	return page.evaluate( async () => {
		const { dispatch, select } = window.wp.data;

		dispatch( 'core/editor' ).editPost( { status: 'publish' } );
		await dispatch( 'core/editor' ).savePost();

		return select( 'core/editor' ).getPermalink();
	} );
}

test.describe( 'Inspector controls, operated', () => {
	test( 'a hover colour picked in Color reaches the canvas and the published page', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await buttonPost( { admin, editor, page, posts }, 'Styles' );

		await page
			.locator( '.block-editor-block-inspector' )
			.getByRole( 'button', { name: 'Text hover', exact: true } )
			.click();
		await page
			.locator( '.components-popover' )
			.getByRole( 'option', { name: 'Error' } )
			.or(
				page
					.locator( '.components-popover' )
					.getByRole( 'button', { name: 'Error' } )
			)
			.first()
			.click();
		await page.keyboard.press( 'Escape' );

		const stored = ( await selectedAttributes( page ) ).style?.zealblocks
			?.textHover;
		expect( stored ).toBeTruthy();

		// The colour the stored value resolves to, from the theme palette.
		const expected = await editor.canvas
			.locator( 'body' )
			.evaluate( ( body, value ) => {
				const probe = body.ownerDocument.createElement( 'span' );
				probe.style.color = value;
				body.appendChild( probe );
				const color = window.getComputedStyle( probe ).color;
				probe.remove();
				return color;
			}, stored );

		const canvasButton = editor.canvas.locator(
			'.wp-block-zealblocks-button'
		);
		await canvasButton.hover();
		await expect
			.poll( () =>
				canvasButton.evaluate(
					( el ) =>
						el.ownerDocument.defaultView.getComputedStyle( el )
							.color
				)
			)
			.toBe( expected );

		const link = await publish( page );
		await page.goto( link );
		const live = page.locator(
			'.entry-content .wp-block-zealblocks-button'
		);

		await live.hover();
		await expect
			.poll( () =>
				live.evaluate( ( el ) => window.getComputedStyle( el ).color )
			)
			.toBe( expected );
	} );

	test( 'Show text, the aria label, rotation and the hover icon, set from Settings', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await buttonPost( { admin, editor, page, posts }, 'Settings' );
		const inspector = page.locator( '.block-editor-block-inspector' );

		await inspector.getByLabel( 'Show text', { exact: true } ).click();
		await inspector
			.getByLabel( 'Aria label', { exact: true } )
			.fill( 'Download <now>' );
		await inspector
			.getByLabel( 'Icon rotation', { exact: true } )
			.fill( '90' );

		await inspector.getByRole( 'button', { name: 'Hover icon' } ).click();
		await inspector
			.getByLabel( 'Show icon on hover', { exact: true } )
			.click();

		const attributes = await selectedAttributes( page );

		expect( attributes ).toMatchObject( {
			showText: false,
			// Typed as text, stored escaped so `<` stays a character.
			text: 'Download &lt;now&gt;',
			iconRotation: 90,
			showIconOnHover: true,
		} );

		const canvasButton = editor.canvas.locator(
			'.wp-block-zealblocks-button'
		);
		await expect( canvasButton.locator( '[contenteditable]' ) ).toHaveCount(
			0
		);
		await expect(
			canvasButton.locator( '.wp-block-zealblocks-button__icon' )
		).toHaveClass( /has-rotation/ );
		await expect(
			inspector.getByText( 'Hover icon', { exact: true } ).last()
		).toBeVisible();
	} );

	test( 'with Responsive styles on, a Tablet z-index goes to the tablet layer only', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await buttonPost( { admin, editor, page, posts }, 'Styles' );
		const inspector = page.locator( '.block-editor-block-inspector' );
		const viewMenu = async ( name, role ) => {
			await page
				.getByRole( 'button', { name: 'View', exact: true } )
				.click();
			await page
				.locator( '.components-dropdown-menu__menu' )
				.getByRole( role, { name } )
				.click();
			await page.keyboard.press( 'Escape' );
		};

		await showOptional( page, 'Dimensions', 'Z-index' );
		await inspector
			.getByRole( 'spinbutton', { name: 'Z-index', exact: true } )
			.fill( '5' );

		await viewMenu( /Responsive styles/, 'menuitemcheckbox' );

		try {
			await viewMenu( /^Tablet/, 'menuitemradio' );

			// The label says which layer is being edited (TC-PD-08).
			const tablet = inspector.getByRole( 'spinbutton', {
				name: 'Z-index (Tablet)',
				exact: true,
			} );
			await expect( tablet ).toBeVisible();
			await tablet.fill( '2' );

			const style = ( await selectedAttributes( page ) ).style;

			expect( style.zealblocks.zIndex ).toBe( '5' );
			expect( style[ '@tablet' ].zealblocks.zIndex ).toBe( '2' );
			expect( style[ '@mobile' ]?.zealblocks?.zIndex ).toBeUndefined();
		} finally {
			// A user preference: put it back for the other tests.
			await viewMenu( /^Desktop/, 'menuitemradio' );
			await viewMenu( /Responsive styles/, 'menuitemcheckbox' );
		}
	} );

	test( 'animation and a display condition, set from their panels', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await buttonPost( { admin, editor, page, posts }, 'Settings' );
		const inspector = page.locator( '.block-editor-block-inspector' );

		await inspector
			.getByLabel( 'Entrance animation', { exact: true } )
			.selectOption( 'fade-up' );
		await inspector
			.getByLabel( 'Hide from logged-out users', { exact: true } )
			.click();

		expect( await selectedAttributes( page ) ).toMatchObject( {
			animationType: 'fade-up',
			displayConditions: { hideWhenLoggedOut: true },
		} );
		await expect(
			editor.canvas.locator( '.wp-block-zealblocks-button' )
		).toHaveClass( /has-display-conditions/ );
	} );

	test( 'Icon: a link added from the toolbar, and the RTL flip', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await admin.createNewPost( { title: '[e2e] Icon controls' } );
		posts.track(
			await page.evaluate( () =>
				window.wp.data.select( 'core/editor' ).getCurrentPostId()
			)
		);
		await editor.insertBlock( {
			name: 'zealblocks/icon',
			attributes: { icon: 'heart' },
		} );

		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Link', exact: true } )
			.click();
		await page
			.getByRole( 'combobox', { name: /search or type url/i } )
			.fill( 'https://example.org/pricing' );
		await page.keyboard.press( 'Enter' );

		expect( ( await selectedAttributes( page ) ).url ).toBe(
			'https://example.org/pricing'
		);

		await editor.openDocumentSettingsSidebar();
		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const inspector = page.locator( '.block-editor-block-inspector' );

		await expect(
			inspector.getByText( /This icon is a link/ )
		).toBeVisible();
		await inspector
			.getByLabel( 'Flip for right-to-left', { exact: true } )
			.click();
		expect( ( await selectedAttributes( page ) ).flipForRTL ).toBe( true );
		await expect(
			editor.canvas.locator( '.wp-block-zealblocks-icon' )
		).toHaveClass( /has-rtl-flip/ );
	} );
} );
