/**
 * Container in the editor: the presets, the variations, the inspector
 * controls, the canvas preview, and saving. TC-C-20 to TC-C-26.
 */

const { test, expect, computed } = require( '../../utils' );

/**
 * Starts a post and registers it for deletion.
 *
 * @param {Object} fixtures       Playwright fixtures.
 * @param {Object} fixtures.admin Admin utils.
 * @param {Object} fixtures.page  Page.
 * @param {Object} fixtures.posts The posts fixture.
 * @return {Promise<void>}
 */
async function newPost( { admin, page, posts } ) {
	await admin.createNewPost( { title: '[e2e] Container editor' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);
}

/**
 * The first top-level block, as plain data.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<Object>} name, attributes and inner blocks.
 */
function firstBlock( page ) {
	return page.evaluate( () => {
		const strip = ( { name, attributes, innerBlocks } ) => ( {
			name,
			attributes,
			innerBlocks: innerBlocks.map( strip ),
		} );

		return strip(
			window.wp.data.select( 'core/block-editor' ).getBlocks()[ 0 ]
		);
	} );
}

/**
 * Selects the first block and opens the inspector on a tab.
 *
 * @param {Object} fixtures        Playwright fixtures.
 * @param {Object} fixtures.editor Editor utils.
 * @param {Object} fixtures.page   Page.
 * @param {string} tab             'Settings' or 'Styles'.
 * @return {Promise<void>}
 */
async function inspectFirst( { editor, page }, tab ) {
	await page.evaluate( () => {
		const { select, dispatch } = window.wp.data;

		dispatch( 'core/block-editor' ).selectBlock(
			select( 'core/block-editor' ).getBlocks()[ 0 ].clientId
		);
	} );
	await editor.openDocumentSettingsSidebar();
	await page.getByRole( 'tab', { name: tab } ).click();
}

/**
 * The item labels in an inspector panel's options menu.
 *
 * @param {import('@playwright/test').Page} page  Page.
 * @param {string}                          panel e.g. 'Dimensions'.
 * @return {Promise<string[]>} Labels.
 */
async function optionsMenu( page, panel ) {
	await page
		.locator( '.block-editor-block-inspector' )
		.getByRole( 'button', { name: `${ panel } options` } )
		.click();

	const items = await page
		.locator( '.components-dropdown-menu__menu' )
		.locator( '[role^="menuitem"]' )
		.allTextContents();

	await page.keyboard.press( 'Escape' );

	return items.map( ( item ) => item.trim() );
}

/**
 * Text in the inspector's current tab, lowercased: the inspector uppercases
 * some labels with CSS, which innerText reflects.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<string>} All visible text, lowercased.
 */
async function inspectorText( page ) {
	return (
		await page.locator( '.block-editor-block-inspector' ).innerText()
	).toLowerCase();
}

test.describe( 'Container editor', () => {
	test( 'a new Container offers presets; one builds a responsive grid', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( { name: 'zealblocks/container' } );

		const presets = editor.canvas.locator(
			'.wp-block-zealblocks-container__preset-list button'
		);

		await expect( presets ).toHaveCount( 7 );
		await editor.canvas
			.getByRole( 'button', { name: 'One third, two thirds' } )
			.click();

		const grid = await firstBlock( page );

		expect( grid.attributes.layout ).toEqual( {
			type: 'grid',
			columnCount: 3,
		} );
		expect( grid.attributes.style[ '@mobile' ].layout ).toEqual( {
			columnCount: 1,
		} );
		expect( grid.innerBlocks.map( ( child ) => child.name ) ).toEqual( [
			'zealblocks/container',
			'zealblocks/container',
		] );
		expect( grid.innerBlocks[ 0 ].attributes.layout ).toEqual( {
			type: 'constrained',
		} );
		expect( grid.innerBlocks[ 1 ].attributes.style ).toEqual( {
			layout: { columnSpan: 2 },
			'@mobile': { layout: { columnSpan: 1 } },
		} );
		// Neither the grid nor its columns still show the picker.
		await expect(
			editor.canvas.locator( '.wp-block-zealblocks-container__presets' )
		).toHaveCount( 0 );
	} );

	test( '"Start blank" leaves an empty constrained container with an appender', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( { name: 'zealblocks/container' } );
		await editor.canvas
			.getByRole( 'button', { name: 'Start blank' } )
			.click();

		expect( ( await firstBlock( page ) ).attributes.layout ).toEqual( {
			type: 'constrained',
		} );
		await expect(
			editor.canvas.locator(
				'.wp-block-zealblocks-container .block-list-appender'
			)
		).toHaveCount( 1 );
	} );

	test( 'Row, Stack and Grid are variations of one block, and skip the presets', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );

		const variations = await page.evaluate( () =>
			window.wp.blocks
				.getBlockVariations( 'zealblocks/container' )
				.map( ( variation ) => variation.name )
		);

		expect( variations ).toEqual( [ 'container', 'row', 'stack', 'grid' ] );

		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: { layout: { type: 'flex', orientation: 'vertical' } },
		} );

		const active = await page.evaluate( () => {
			const { select } = window.wp.data;
			const [ first ] = select( 'core/block-editor' ).getBlocks();

			return select( 'core/blocks' ).getActiveBlockVariation(
				'zealblocks/container',
				first.attributes
			)?.name;
		} );

		expect( active ).toBe( 'stack' );
		await expect(
			editor.canvas.locator( '.wp-block-zealblocks-container__presets' )
		).toHaveCount( 0 );
	} );

	test( 'every new control is in the inspector', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: {
				url: 'https://example.org/',
				layout: { type: 'flex', flexWrap: 'nowrap' },
			},
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'Hi' } },
			],
		} );

		await inspectFirst( { editor, page }, 'Styles' );
		const styles = await inspectorText( page );

		for ( const label of [
			'Text hover',
			'Background hover',
			'Border hover',
			'Reverse order',
		] ) {
			expect( styles ).toContain( label.toLowerCase() );
		}
		expect( await optionsMenu( page, 'Dimensions' ) ).toEqual(
			expect.arrayContaining( [
				'Max width',
				'Max height',
				'Overflow',
				'Z-index',
			] )
		);
		expect( await optionsMenu( page, 'Border & Shadow' ) ).toEqual(
			expect.arrayContaining( [ 'Shadow hover', 'Hover lift' ] )
		);

		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const settings = await inspectorText( page );

		for ( const label of [
			'Link label',
			'Animation',
			'Display conditions',
		] ) {
			expect( settings ).toContain( label.toLowerCase() );
		}

		await page
			.locator( '.block-editor-block-inspector' )
			.getByRole( 'button', { name: 'Advanced' } )
			.click();
		await expect(
			page
				.locator( '.block-editor-block-inspector' )
				.getByLabel( 'HTML element' )
		).toBeVisible();
		await expect(
			page
				.locator( '.block-editor-block-inspector' )
				.getByLabel( 'Accessible name' )
		).toBeVisible();
	} );

	test( 'a link with no label and no heading inside warns; a heading clears it', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: { url: 'https://example.org/' },
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'Hi' } },
			],
		} );

		await inspectFirst( { editor, page }, 'Settings' );
		const warning = page
			.locator( '.block-editor-block-inspector' )
			.getByText( 'This link has no label and no heading inside' );

		await expect( warning ).toBeVisible();

		await page.evaluate( () => {
			const { select, dispatch } = window.wp.data;
			const parent = select( 'core/block-editor' ).getBlocks()[ 0 ];

			dispatch( 'core/block-editor' ).insertBlock(
				window.wp.blocks.createBlock( 'core/heading', {
					content: 'Plans',
				} ),
				0,
				parent.clientId,
				false
			);
		} );
		await expect( warning ).toHaveCount( 0 );
	} );

	test( 'Reverse order is offered only for a flex layout', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: { layout: { type: 'grid' } },
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'Hi' } },
			],
		} );

		await inspectFirst( { editor, page }, 'Styles' );
		expect( await inspectorText( page ) ).not.toContain( 'reverse order' );
	} );

	test( 'the canvas previews the reverse order and the size limits', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: {
				layout: { type: 'flex', flexWrap: 'nowrap' },
				style: {
					zealblocks: {
						reverse: true,
						maxWidth: '300px',
						overflow: 'hidden',
					},
				},
			},
			innerBlocks: [
				{ name: 'core/paragraph', attributes: { content: 'One' } },
				{ name: 'core/paragraph', attributes: { content: 'Two' } },
			],
		} );

		const root = editor.canvas
			.locator( '.wp-block-zealblocks-container' )
			.first();

		expect( await computed( root, 'flex-direction' ) ).toBe(
			'row-reverse'
		);
		expect( await computed( root, 'max-width' ) ).toBe( '300px' );
		expect( await computed( root, 'overflow' ) ).toBe( 'hidden' );
	} );

	test( 'a container saves, reloads valid and keeps its settings, with no errors', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		const errors = [];

		page.on( 'pageerror', ( error ) => errors.push( error.message ) );
		page.on( 'console', ( message ) => {
			if (
				'error' === message.type() &&
				/zealblocks/i.test(
					`${ message.text() } ${ message.location().url }`
				)
			) {
				errors.push( message.text() );
			}
		} );

		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/container',
			attributes: {
				tagName: 'section',
				ariaLabel: 'Plans',
				url: 'https://example.org/',
				linkTarget: '_blank',
				linkLabel: 'See the plans',
				layout: { type: 'flex', flexWrap: 'nowrap' },
				animationType: 'fade-up',
				displayConditions: { hideWhenLoggedOut: true },
				style: {
					color: { background: '#eeeeee' },
					zealblocks: {
						backgroundHover: '#ffcc00',
						borderHover: '#ff0000',
						shadowHoverColor: '#00000033',
						hoverLift: '4px',
						maxWidth: '600px',
						reverse: true,
						zIndex: '2',
					},
					'@mobile': {
						layout: { orientation: 'vertical' },
						zealblocks: { reverse: false },
					},
				},
			},
			innerBlocks: [
				{
					name: 'zealblocks/container',
					attributes: { layout: { type: 'constrained' } },
					innerBlocks: [
						{
							name: 'core/paragraph',
							attributes: { content: 'Inside' },
						},
					],
				},
			],
		} );

		const snapshot = () =>
			page.evaluate( () => {
				const strip = ( list ) =>
					list.map(
						( { name, attributes, innerBlocks, isValid } ) => ( {
							name,
							attributes,
							isValid,
							innerBlocks: strip( innerBlocks ),
						} )
					);

				return strip(
					window.wp.data.select( 'core/block-editor' ).getBlocks()
				);
			} );

		const before = await snapshot();

		await editor.saveDraft();
		await page.reload();
		await page.waitForFunction(
			() =>
				window.wp?.data?.select( 'core/block-editor' )?.getBlocks()
					.length > 0
		);

		await expect(
			editor.canvas.getByText(
				'This block contains unexpected or invalid content'
			)
		).toHaveCount( 0 );
		expect( await snapshot() ).toEqual( before );
		expect( errors ).toEqual( [] );
	} );
} );
