/**
 * The Container's inspector controls, operated the way an author does: click,
 * type, pick, drag. editor.spec.js proves each control is there; this proves
 * it stores the right value, the canvas shows it, and the published page does
 * too. TC-C-60 to TC-C-75.
 */

const { test, expect, computed } = require( '../../utils' );

const PARAGRAPH = { name: 'core/paragraph', attributes: { content: 'Body' } };

/**
 * Starts a post holding the given blocks, selects one, opens a tab.
 *
 * @param {Object}   fixtures        Playwright fixtures.
 * @param {Object}   fixtures.admin  Admin utils.
 * @param {Object}   fixtures.editor Editor utils.
 * @param {Object}   fixtures.page   Page.
 * @param {Object}   fixtures.posts  The posts fixture.
 * @param {Object[]} blocks          Blocks to insert.
 * @param {number[]} path            Indexes of the block to select.
 * @param {string}   tab             'Settings' or 'Styles'.
 * @return {Promise<void>}
 */
async function setUp( { admin, editor, page, posts }, blocks, path, tab ) {
	await admin.createNewPost( { title: '[e2e] Container controls' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);

	for ( const block of blocks ) {
		await editor.insertBlock( block );
	}

	await selectPath( page, path );
	await editor.openDocumentSettingsSidebar();
	await page.getByRole( 'tab', { name: tab } ).click();
}

/**
 * Selects a block by its path of indexes.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @param {number[]}                        path Indexes from the root.
 * @return {Promise<void>}
 */
function selectPath( page, path ) {
	return page.evaluate( ( indexes ) => {
		const { select, dispatch } = window.wp.data;
		let list = select( 'core/block-editor' ).getBlocks();
		let found;

		indexes.forEach( ( index ) => {
			found = list[ index ];
			list = found.innerBlocks;
		} );

		dispatch( 'core/block-editor' ).selectBlock( found.clientId );
	}, path );
}

/**
 * The selected block's attributes.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<Object>} Attributes.
 */
function attributes( page ) {
	return page.evaluate(
		() =>
			window.wp.data.select( 'core/block-editor' ).getSelectedBlock()
				.attributes
	);
}

/**
 * Turns on an optional control from a panel's options menu, if it is off.
 *
 * @param {import('@playwright/test').Page} page  Page.
 * @param {string}                          panel e.g. 'Dimensions'.
 * @param {string}                          item  e.g. 'Max width'.
 * @return {Promise<void>}
 */
async function showOptional( page, panel, item ) {
	await inspector( page )
		.getByRole( 'button', { name: `${ panel } options` } )
		.click();
	// Announced as "Show …" or "Hide and reset …".
	const escaped = item.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const entry = page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( 'menuitemcheckbox', {
			name: new RegExp( `^(?:Show |Hide and reset )?${ escaped }$` ),
		} );

	if ( 'true' !== ( await entry.getAttribute( 'aria-checked' ) ) ) {
		await entry.click();
	}

	await page.keyboard.press( 'Escape' );
}

/**
 * @param {import('@playwright/test').Page} page Page.
 * @return {import('@playwright/test').Locator} The inspector.
 */
const inspector = ( page ) => page.locator( '.block-editor-block-inspector' );

/**
 * Opens a colour row in the inspector, picks a swatch on its open tab, and
 * closes it again.
 *
 * @param {import('@playwright/test').Page} page    Page.
 * @param {string}                          control The row's name.
 * @param {number}                          index   Which swatch.
 * @return {Promise<void>}
 */
async function pickSwatch( page, control, index = 0 ) {
	const content = page.locator(
		'.block-editor-panel-color-gradient-settings__dropdown-content'
	);

	await inspector( page )
		.getByRole( 'button', { name: control, exact: true } )
		.click();
	await content
		.locator( '.components-circular-option-picker__option:visible' )
		.nth( index )
		.click();
	await page.keyboard.press( 'Escape' );
	await expect( content ).toHaveCount( 0 );
}

/**
 * The colour a stored value resolves to in the canvas.
 *
 * @param {Object} editor Editor utils.
 * @param {string} value  Stored colour, maybe a preset variable.
 * @return {Promise<string>} rgb().
 */
function resolveColor( editor, value ) {
	return editor.canvas.locator( 'body' ).evaluate( ( body, color ) => {
		const probe = body.ownerDocument.createElement( 'span' );

		probe.style.color = color;
		body.appendChild( probe );
		const resolved =
			body.ownerDocument.defaultView.getComputedStyle( probe ).color;
		probe.remove();

		return resolved;
	}, value );
}

/**
 * Publishes the post and returns its link.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<string>} The permalink.
 */
function publish( page ) {
	return page.evaluate( async () => {
		const { dispatch, select } = window.wp.data;

		dispatch( 'core/editor' ).editPost( { status: 'publish' } );
		await dispatch( 'core/editor' ).savePost();

		return select( 'core/editor' ).getPermalink();
	} );
}

/**
 * Picks a View menu entry: the device, or Responsive styles.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @param {RegExp}                          name Entry name.
 * @param {string}                          role Its role.
 * @return {Promise<void>}
 */
async function viewMenu( page, name, role ) {
	await page.getByRole( 'button', { name: 'View', exact: true } ).click();
	await page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( role, { name } )
		.click();
	await page.keyboard.press( 'Escape' );
}

/**
 * The first Container in the canvas.
 *
 * @param {Object} editor Editor utils.
 * @return {import('@playwright/test').Locator} It.
 */
const canvasRoot = ( editor ) =>
	editor.canvas.locator( '.wp-block-zealblocks-container' ).first();

/**
 * Computed style of a canvas element, read in the canvas's own window.
 *
 * @param {import('@playwright/test').Locator} locator  Element.
 * @param {string}                             property CSS property.
 * @param {?string}                            pseudo   Pseudo-element.
 * @return {Promise<string>} Value.
 */
const canvasStyle = ( locator, property, pseudo = null ) =>
	locator.evaluate(
		( el, [ prop, pseudoElement ] ) =>
			el.ownerDocument.defaultView
				.getComputedStyle( el, pseudoElement )
				.getPropertyValue( prop ),
		[ property, pseudo ]
	);

test.describe( 'Container controls, operated', () => {
	test.beforeEach( async ( { page } ) => {
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
	} );

	test( 'a link from the toolbar and its label reach the page; the warning comes and goes', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: { layout: { type: 'constrained' } },
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Settings'
		);

		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Link', exact: true } )
			.click();
		await page
			.getByRole( 'combobox', { name: /search or type url/i } )
			.fill( 'https://example.org/plans' );
		await page.keyboard.press( 'Enter' );
		expect( ( await attributes( page ) ).url ).toBe(
			'https://example.org/plans'
		);

		const warning = inspector( page ).getByText(
			'This link has no label and no heading inside'
		);

		await expect( warning ).toBeVisible();
		await inspector( page )
			.getByLabel( 'Link label', { exact: true } )
			.fill( 'See the plans' );
		await expect( warning ).toHaveCount( 0 );
		expect( ( await attributes( page ) ).linkLabel ).toBe(
			'See the plans'
		);

		await page.goto( await publish( page ) );
		await expect(
			page.getByRole( 'link', { name: 'See the plans' } )
		).toHaveAttribute( 'href', 'https://example.org/plans' );
	} );

	test( 'HTML element and accessible name, from Advanced', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'region',
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Settings'
		);

		await inspector( page )
			.getByRole( 'button', { name: 'Advanced' } )
			.click();
		await inspector( page )
			.getByLabel( 'HTML element', { exact: true } )
			.selectOption( 'section' );
		await inspector( page )
			.getByLabel( 'Accessible name', { exact: true } )
			.fill( 'Pricing plans' );

		expect( await attributes( page ) ).toMatchObject( {
			tagName: 'section',
			ariaLabel: 'Pricing plans',
		} );
		expect(
			await canvasRoot( editor ).evaluate( ( el ) => el.tagName )
		).toBe( 'SECTION' );

		await page.goto( await publish( page ) );
		await expect(
			page.getByRole( 'region', { name: 'Pricing plans' } )
		).toHaveAttribute( 'id', 'region' );
	} );

	test( 'hover background and border colours, picked in Color, show on hover in the canvas and the page', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'card',
						style: {
							border: {
								width: '2px',
								style: 'solid',
								color: '#cccccc',
							},
							zealblocks: { hoverDuration: '0ms' },
						},
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		// Background hover offers colours and gradients in tabs: the pick
		// must survive the control's follow-up call (src/shared/fill).
		await pickSwatch( page, 'Background hover' );
		await pickSwatch( page, 'Border hover', 2 );

		const { backgroundHover, borderHover } = ( await attributes( page ) )
			.style.zealblocks;

		expect( backgroundHover ).toBeTruthy();
		expect( borderHover ).toBeTruthy();

		const background = await resolveColor( editor, backgroundHover );
		const border = await resolveColor( editor, borderHover );
		const root = canvasRoot( editor );

		await root.hover();
		await expect
			.poll( () => canvasStyle( root, 'background-color' ) )
			.toBe( background );
		expect( await canvasStyle( root, 'border-top-color' ) ).toBe( border );

		await page.goto( await publish( page ) );
		await page.locator( '#card' ).hover();
		await expect
			.poll( () =>
				computed( page.locator( '#card' ), 'background-color' )
			)
			.toBe( background );
		expect(
			await computed( page.locator( '#card' ), 'border-top-color' )
		).toBe( border );
	} );

	test( 'shadow hover and hover lift, set in Border & Shadow', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'card',
						style: { zealblocks: { hoverDuration: '0ms' } },
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await showOptional( page, 'Border & Shadow', 'Shadow hover' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Y offset', exact: true } )
			.fill( '12' );
		await showOptional( page, 'Border & Shadow', 'Hover lift' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Hover lift', exact: true } )
			.fill( '6' );

		const stored = ( await attributes( page ) ).style.zealblocks;

		expect( stored ).toMatchObject( {
			shadowHoverY: '12px',
			hoverLift: '6px',
		} );
		// The first part seeds the rest, as on the Button.
		expect( stored.shadowHoverColor ).toBeTruthy();

		const root = canvasRoot( editor );

		await root.hover();
		await expect
			.poll( () => canvasStyle( root, 'translate' ) )
			.toBe( '0px -6px' );
		expect( await canvasStyle( root, 'box-shadow' ) ).toContain( '12px' );

		await page.goto( await publish( page ) );
		const card = page.locator( '#card' );

		await card.hover();
		await expect
			.poll( () => computed( card, 'translate' ) )
			.toBe( '0px -6px' );
		expect( await computed( card, 'box-shadow' ) ).toContain( '12px' );
	} );

	test( 'max width, max height and overflow, typed and picked in Dimensions', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'sized',
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await showOptional( page, 'Dimensions', 'Max width' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Max width', exact: true } )
			.fill( '420' );
		await showOptional( page, 'Dimensions', 'Max height' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Max height', exact: true } )
			.fill( '300' );
		await showOptional( page, 'Dimensions', 'Overflow' );
		await inspector( page )
			.getByLabel( 'Overflow', { exact: true } )
			.selectOption( 'hidden' );

		expect( ( await attributes( page ) ).style.zealblocks ).toMatchObject( {
			maxWidth: '420px',
			maxHeight: '300px',
			overflow: 'hidden',
		} );

		const root = canvasRoot( editor );

		expect( await canvasStyle( root, 'max-width' ) ).toBe( '420px' );
		expect( await canvasStyle( root, 'overflow' ) ).toBe( 'hidden' );

		await page.goto( await publish( page ) );
		const sized = page.locator( '#sized' );

		expect( await computed( sized, 'max-width' ) ).toBe( '420px' );
		expect( await computed( sized, 'max-height' ) ).toBe( '300px' );
		expect( await computed( sized, 'overflow' ) ).toBe( 'hidden' );
	} );

	test( 'Reverse order, toggled in Layout, and undone on Tablet only', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'flex', flexWrap: 'nowrap' },
						anchor: 'row',
					},
					innerBlocks: [ PARAGRAPH, PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await inspector( page )
			.getByLabel( 'Reverse order', { exact: true } )
			.click();
		expect( ( await attributes( page ) ).style.zealblocks.reverse ).toBe(
			true
		);
		expect(
			await canvasStyle( canvasRoot( editor ), 'flex-direction' )
		).toBe( 'row-reverse' );

		await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );

		try {
			await viewMenu( page, /^Tablet/, 'menuitemradio' );
			const tablet = inspector( page ).getByLabel(
				'Reverse order (Tablet)',
				{ exact: true }
			);

			// Tablet inherits the base, so it reads as on.
			await expect( tablet ).toBeChecked();
			await tablet.click();

			const style = ( await attributes( page ) ).style;

			expect( style.zealblocks.reverse ).toBe( true );
			// An explicit false on Tablet, to undo the reversed base there.
			expect( style[ '@tablet' ].zealblocks.reverse ).toBe( false );
			expect( style[ '@mobile' ]?.zealblocks?.reverse ).toBeUndefined();
			expect(
				await canvasStyle( canvasRoot( editor ), 'flex-direction' )
			).toBe( 'row' );
		} finally {
			await viewMenu( page, /^Desktop/, 'menuitemradio' );
			await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );
		}

		await page.goto( await publish( page ) );
		expect(
			await computed( page.locator( '#row' ), 'flex-direction' )
		).toBe( 'row-reverse' );
		await page.setViewportSize( { width: 700, height: 900 } );
		expect(
			await computed( page.locator( '#row' ), 'flex-direction' )
		).toBe( 'row' );
	} );

	test( 'a Tablet max width, typed with Responsive styles on, lands in the tablet layer only', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'sized',
						style: { zealblocks: { maxWidth: '600px' } },
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );

		try {
			await viewMenu( page, /^Tablet/, 'menuitemradio' );
			await showOptional( page, 'Dimensions', 'Max width (Tablet)' );
			await inspector( page )
				.getByRole( 'spinbutton', {
					name: 'Max width (Tablet)',
					exact: true,
				} )
				.fill( '300' );

			const style = ( await attributes( page ) ).style;

			expect( style.zealblocks.maxWidth ).toBe( '600px' );
			expect( style[ '@tablet' ].zealblocks.maxWidth ).toBe( '300px' );
			expect( style[ '@mobile' ]?.zealblocks?.maxWidth ).toBeUndefined();
		} finally {
			await viewMenu( page, /^Desktop/, 'menuitemradio' );
			await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );
		}

		await page.goto( await publish( page ) );
		const sized = page.locator( '#sized' );

		expect( await computed( sized, 'max-width' ) ).toBe( '600px' );
		await page.setViewportSize( { width: 700, height: 900 } );
		expect( await computed( sized, 'max-width' ) ).toBe( '300px' );
		await page.setViewportSize( { width: 400, height: 900 } );
		expect( await computed( sized, 'max-width' ) ).toBe( '600px' );
	} );

	test( 'an overlay colour picked in Background seeds 50%; opacity and blend change it', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'hero',
						style: { color: { background: '#336699' } },
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await pickSwatch( page, 'Overlay' );

		let stored = ( await attributes( page ) ).style.zealblocks;

		expect( stored.overlay ).toBeTruthy();
		expect( stored.overlayOpacity ).toBe( '0.5' );
		expect(
			await canvasStyle( canvasRoot( editor ), 'opacity', '::before' )
		).toBe( '0.5' );

		await showOptional( page, 'Background', 'Overlay opacity' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Overlay opacity', exact: true } )
			.fill( '70' );
		await showOptional( page, 'Background', 'Overlay blend mode' );
		await inspector( page )
			.getByLabel( 'Overlay blend mode', { exact: true } )
			.selectOption( 'multiply' );

		stored = ( await attributes( page ) ).style.zealblocks;
		expect( stored ).toMatchObject( {
			overlayOpacity: '0.7',
			overlayBlend: 'multiply',
		} );

		const overlayColor = await resolveColor( editor, stored.overlay );

		expect(
			await canvasStyle(
				canvasRoot( editor ),
				'background-color',
				'::before'
			)
		).toBe( overlayColor );

		await page.goto( await publish( page ) );
		const hero = page.locator( '#hero' );

		expect( await computed( hero, 'opacity', '::before' ) ).toBe( '0.7' );
		expect( await computed( hero, 'mix-blend-mode', '::before' ) ).toBe(
			'multiply'
		);
		expect( await computed( hero, 'background-color', '::before' ) ).toBe(
			overlayColor
		);
	} );

	test( 'a top divider: shape picked, height and width set, flipped', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'section',
						style: {
							color: { background: '#334455' },
							dimensions: { minHeight: '240px' },
						},
					},
					innerBlocks: [ PARAGRAPH ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await showOptional( page, 'Background', 'Top divider' );
		await inspector( page )
			.getByLabel( 'Top divider', { exact: true } )
			.selectOption( 'waves' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Divider height', exact: true } )
			.fill( '50' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Divider width', exact: true } )
			.fill( '200' );
		await inspector( page ).getByLabel( 'Flip', { exact: true } ).click();

		const stored = await attributes( page );

		expect( stored.dividerTop ).toEqual( { shape: 'waves', flip: true } );
		expect( stored.style.zealblocks ).toMatchObject( {
			dividerTopHeight: '50px',
			dividerTopWidth: '200%',
		} );

		const svg = editor.canvas.locator(
			'.wp-block-zealblocks-container__divider.is-top.is-flipped svg'
		);

		expect(
			await svg.evaluate( ( el ) =>
				Math.round( el.getBoundingClientRect().height )
			)
		).toBe( 50 );

		await page.goto( await publish( page ) );
		const live = page.locator( '#section > .is-top svg' );

		expect(
			await live.evaluate( ( el ) => [
				Math.round( el.getBoundingClientRect().height ),
				Math.round(
					el.getBoundingClientRect().width /
						el.closest( '#section' ).getBoundingClientRect().width
				),
				window.getComputedStyle( el ).scale,
			] )
		).toEqual( [ 50, 2, '-1 1' ] );
	} );

	test( 'child settings on a Row child: align self, order and position', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'flex', flexWrap: 'nowrap' },
						anchor: 'row',
						style: { dimensions: { minHeight: '200px' } },
					},
					innerBlocks: [
						{
							name: 'zealblocks/container',
							attributes: {
								layout: { type: 'constrained' },
								anchor: 'first',
							},
							innerBlocks: [ PARAGRAPH ],
						},
						{
							name: 'zealblocks/container',
							attributes: {
								layout: { type: 'constrained' },
								anchor: 'second',
							},
							innerBlocks: [ PARAGRAPH ],
						},
					],
				},
			],
			[ 0, 1 ],
			'Styles'
		);

		await showOptional( page, 'Dimensions', 'Align self' );
		await inspector( page )
			.getByLabel( 'Align self', { exact: true } )
			.selectOption( 'end' );
		await showOptional( page, 'Dimensions', 'Order' );
		await inspector( page )
			.getByLabel( 'Order', { exact: true } )
			.selectOption( 'first' );
		await showOptional( page, 'Dimensions', 'Position' );
		await inspector( page )
			.getByLabel( 'Position', { exact: true } )
			.selectOption( 'relative' );
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Top', exact: true } )
			.fill( '5' );

		expect( ( await attributes( page ) ).style.zealblocks ).toEqual( {
			alignSelf: 'end',
			order: '-9999',
			position: 'relative',
			positionTop: '5px',
		} );

		const child = editor.canvas
			.locator(
				'.wp-block-zealblocks-container .wp-block-zealblocks-container'
			)
			.nth( 1 );

		expect( await canvasStyle( child, 'align-self' ) ).toBe( 'end' );
		expect( await canvasStyle( child, 'order' ) ).toBe( '-9999' );

		await page.goto( await publish( page ) );
		const [ first, second ] = await page.evaluate( () =>
			[ '#first', '#second' ].map(
				( id ) =>
					document.querySelector( id ).getBoundingClientRect().left
			)
		);

		// Ordered first, so it now sits left of the block before it.
		expect( second ).toBeLessThan( first );
		expect(
			await computed( page.locator( '#second' ), 'align-self' )
		).toBe( 'end' );
		expect( await computed( page.locator( '#second' ), 'top' ) ).toBe(
			'5px'
		);
	} );

	test( 'parent hover on a nested Container: hidden before, shown and moved on the parent hover', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: {
						layout: { type: 'constrained' },
						anchor: 'tile',
						style: {
							color: { background: '#222222' },
							dimensions: { minHeight: '200px' },
						},
					},
					innerBlocks: [
						{
							name: 'zealblocks/container',
							attributes: {
								layout: { type: 'constrained' },
								anchor: 'reveal',
								style: { zealblocks: { hoverDuration: '0ms' } },
							},
							innerBlocks: [ PARAGRAPH ],
						},
					],
				},
			],
			[ 0, 0 ],
			'Styles'
		);

		await showOptional(
			page,
			'Border & Shadow',
			'When the parent is hovered'
		);
		await inspector( page )
			.getByRole( 'spinbutton', { name: 'Opacity before', exact: true } )
			.fill( '0' );
		await inspector( page )
			.getByRole( 'spinbutton', {
				name: 'Move up on hover',
				exact: true,
			} )
			.fill( '8' );

		expect( ( await attributes( page ) ).style.zealblocks ).toMatchObject( {
			parentHoverRestOpacity: '0',
			parentHoverMove: '8px',
		} );

		// The canvas: hidden until the parent is hovered.
		await selectPath( page, [ 0 ] );
		const child = editor.canvas
			.locator(
				'.wp-block-zealblocks-container .wp-block-zealblocks-container'
			)
			.first();

		await page.mouse.move( 0, 0 );
		await expect.poll( () => canvasStyle( child, 'opacity' ) ).toBe( '0' );
		await canvasRoot( editor ).hover( { position: { x: 5, y: 5 } } );
		await expect.poll( () => canvasStyle( child, 'opacity' ) ).toBe( '1' );
		expect( await canvasStyle( child, 'translate' ) ).toBe( '0px -8px' );

		await page.goto( await publish( page ) );
		const reveal = page.locator( '#reveal' );

		expect( await computed( reveal, 'opacity' ) ).toBe( '0' );
		await page.locator( '#tile' ).scrollIntoViewIfNeeded();
		const box = await page.locator( '#tile' ).boundingBox();

		await page.mouse.move( box.x + 5, box.y + box.height - 5 );
		await expect.poll( () => computed( reveal, 'opacity' ) ).toBe( '1' );
		expect( await computed( reveal, 'translate' ) ).toBe( '0px -8px' );
	} );

	test( 'the variation switcher in the sidebar turns a Container into a Grid, content kept', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/container',
					attributes: { layout: { type: 'constrained' } },
					innerBlocks: [ PARAGRAPH, PARAGRAPH ],
				},
			],
			[ 0 ],
			'Settings'
		);

		await page
			.locator( '.block-editor-block-inspector' )
			.getByRole( 'radio', { name: 'Transform to Grid' } )
			.click();

		const stored = await page.evaluate( () => {
			const [ first ] = window.wp.data
				.select( 'core/block-editor' )
				.getBlocks();

			return {
				layout: first.attributes.layout,
				children: first.innerBlocks.length,
			};
		} );

		expect( stored ).toEqual( { layout: { type: 'grid' }, children: 2 } );
		expect( await canvasStyle( canvasRoot( editor ), 'display' ) ).toBe(
			'grid'
		);
	} );
} );
