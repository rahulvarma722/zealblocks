/**
 * The editor: inserting, saving and reloading, the inspector controls each
 * block offers, and the canvas previews. TC-G-04, TC-G-05, TC-G-06, TC-G-24,
 * TC-BS-06, TC-HV-09, TC-X-11, TC-X-37, TC-X-51, TC-I-35.
 */

const { test, expect } = require( '../../utils' );

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
	await admin.createNewPost( { title: '[e2e] Editor' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);
}

/**
 * Selects a block by its path of indexes, e.g. [ 0, 0 ] for the first
 * Button in the first Buttons, and opens the inspector on one of its tabs.
 *
 * @param {Object}   fixtures        Playwright fixtures.
 * @param {Object}   fixtures.editor Editor utils.
 * @param {Object}   fixtures.page   Page.
 * @param {number[]} path            Indexes from the root.
 * @param {string}   tab             'Settings' or 'Styles'.
 * @return {Promise<void>}
 */
async function inspect( { editor, page }, path, tab ) {
	await page.evaluate( ( indexes ) => {
		const { select, dispatch } = window.wp.data;
		let list = select( 'core/block-editor' ).getBlocks();
		let found;

		indexes.forEach( ( index ) => {
			found = list[ index ];
			list = found.innerBlocks;
		} );

		dispatch( 'core/block-editor' ).selectBlock( found.clientId );
	}, path );

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
 * control labels with CSS, which innerText reflects.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<string>} All visible text, lowercased.
 */
async function inspectorText( page ) {
	return (
		await page.locator( '.block-editor-block-inspector' ).innerText()
	).toLowerCase();
}

test.describe( 'Editor', () => {
	test( 'the inserter offers Buttons, Text and Icon; Button only inside Buttons', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( { name: 'zealblocks/buttons' } );

		const result = await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const buttons = store.getBlocks()[ 0 ].clientId;

			return {
				atRoot: store
					.getInserterItems()
					.filter( ( item ) => 'zealblocks' === item.category )
					.map( ( item ) => item.name )
					.sort(),
				buttonAtRoot: store.canInsertBlockType( 'zealblocks/button' ),
				buttonInButtons: store.canInsertBlockType(
					'zealblocks/button',
					buttons
				),
				paragraphInButtons: store.canInsertBlockType(
					'core/paragraph',
					buttons
				),
			};
		} );

		expect( result ).toEqual( {
			atRoot: [
				'zealblocks/buttons',
				'zealblocks/icon',
				'zealblocks/text',
			],
			buttonAtRoot: false,
			buttonInButtons: true,
			paragraphInButtons: false,
		} );
	} );

	test( 'every block saves, reloads valid and keeps its settings, with no errors', async ( {
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

		const blocks = [
			{
				name: 'zealblocks/buttons',
				attributes: {
					animationType: 'fade-up',
					displayConditions: { hideWhenLoggedIn: true },
					style: {
						color: { background: '#eeeeee' },
						zealblocks: { backgroundHover: '#ffcc00', zIndex: '3' },
					},
				},
				innerBlocks: [
					{
						name: 'zealblocks/button',
						attributes: {
							text: 'Go',
							url: 'https://example.org/',
							icon: 'arrow-right',
							iconRotation: 45,
							showIconOnHover: true,
							hoverIcon: 'heart',
							hoverIconPosition: 'left',
							style: {
								zealblocks: {
									textHover: '#111111',
									iconGap: '1em',
									shadowHoverColor: '#00000033',
								},
								'@mobile': { zealblocks: { width: '100%' } },
							},
						},
					},
				],
			},
			{
				name: 'zealblocks/icon',
				attributes: {
					icon: 'heart',
					url: 'https://example.org/',
					label: 'Favourites',
					flipForRTL: true,
					style: { zealblocks: { textHover: '#ff0000' } },
				},
			},
			{
				name: 'zealblocks/text',
				attributes: {
					content: 'Hello <a href="https://example.org/">link</a>',
					styleAs: 'lead',
				},
			},
		];

		for ( const block of blocks ) {
			await editor.insertBlock( block );
		}

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

	test( 'Button: every new control is in the inspector', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/buttons',
			innerBlocks: [
				{
					name: 'zealblocks/button',
					attributes: { text: 'Go', icon: 'arrow-right' },
				},
			],
		} );

		await inspect( { editor, page }, [ 0, 0 ], 'Styles' );
		const styles = await inspectorText( page );

		for ( const label of [
			'Text hover',
			'Background hover',
			'Icon',
			'Icon hover',
			'Border hover',
		] ) {
			expect( styles ).toContain( label.toLowerCase() );
		}
		expect( await optionsMenu( page, 'Color' ) ).toContain(
			'Hover transition'
		);
		expect( await optionsMenu( page, 'Dimensions' ) ).toEqual(
			expect.arrayContaining( [
				'Padding',
				'Margin',
				'Custom Width',
				'Icon Size',
				'Text-icon gap',
				'Z-index',
			] )
		);
		expect( await optionsMenu( page, 'Border & Shadow' ) ).toContain(
			'Shadow hover'
		);

		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const settings = await inspectorText( page );

		for ( const label of [
			'Show text',
			'Icon rotation',
			'Hover icon',
			'Animation',
			'Display conditions',
		] ) {
			expect( settings ).toContain( label.toLowerCase() );
		}
	} );

	test( 'Icon: hover, flip, z-index, link, and the unlabelled-link notice', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/icon',
			attributes: { icon: 'heart', url: 'https://example.org/' },
		} );

		await inspect( { editor, page }, [ 0 ], 'Styles' );
		const styles = await inspectorText( page );

		expect( styles ).toContain( 'icon hover' );
		expect( styles ).toContain( 'background hover' );
		expect( await optionsMenu( page, 'Dimensions' ) ).toContain(
			'Z-index'
		);

		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const settings = await inspectorText( page );

		expect( settings ).toContain( 'flip for right-to-left' );
		expect( settings ).toContain( 'this icon is a link' );
		expect( settings ).toContain( 'link rel' );

		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Unlink' } )
			.waitFor();
	} );

	test( 'Buttons: background hover only, z-index, border, animation, conditions', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/buttons',
			innerBlocks: [
				{ name: 'zealblocks/button', attributes: { text: 'Go' } },
			],
		} );

		await inspect( { editor, page }, [ 0 ], 'Styles' );
		const styles = await inspectorText( page );

		expect( styles ).toContain( 'background hover' );
		expect( styles ).not.toContain( 'text hover' );
		expect( styles ).toContain( 'border & shadow' );
		expect( await optionsMenu( page, 'Dimensions' ) ).toEqual(
			expect.arrayContaining( [ 'Margin', 'Z-index' ] )
		);

		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const settings = await inspectorText( page );

		expect( settings ).toContain( 'animation' );
		expect( settings ).toContain( 'display conditions' );
	} );

	test( 'the canvas previews hover, conditions and the animation', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/buttons',
			innerBlocks: [
				{
					name: 'zealblocks/button',
					attributes: {
						text: 'Go',
						animationType: 'fade',
						displayConditions: { hideWhenLoggedOut: true },
						style: {
							color: { text: '#ffffff' },
							zealblocks: {
								textHover: '#111111',
								hoverDuration: '0ms',
							},
						},
					},
				},
			],
		} );

		const button = editor.canvas.locator( '.wp-block-zealblocks-button' );

		// Hover (TC-HV-09).
		await button.hover();
		await expect
			.poll( () =>
				button.evaluate( ( el ) => window.getComputedStyle( el ).color )
			)
			.toBe( 'rgb(17, 17, 17)' );

		// Conditions are marked, never hidden, in the editor (TC-X-37).
		await expect( button ).toHaveClass( /has-display-conditions/ );
		expect(
			await button.evaluate(
				( el ) => window.getComputedStyle( el ).outlineStyle
			)
		).toBe( 'dashed' );

		// The Preview button plays the animation (TC-X-11).
		await inspect( { editor, page }, [ 0, 0 ], 'Settings' );
		await page
			.locator( '.block-editor-block-inspector' )
			.getByRole( 'button', { name: 'Preview' } )
			.click();
		await expect( button ).toHaveClass( /is-animation-preview/ );
	} );

	test( 'core hide per device: absent from that device preview only (TC-X-51)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await newPost( { admin, page, posts } );
		await editor.insertBlock( {
			name: 'zealblocks/icon',
			attributes: {
				icon: 'heart',
				metadata: { blockVisibility: { viewport: { mobile: false } } },
			},
		} );

		const setDevice = ( device ) =>
			page.evaluate(
				( name ) =>
					window.wp.data
						.dispatch( 'core/editor' )
						.setDeviceType( name ),
				device
			);
		const icon = editor.canvas.locator( '.wp-block-zealblocks-icon' );

		// Core keeps a selected block in view so it can still be edited.
		await page.evaluate( () =>
			window.wp.data.dispatch( 'core/block-editor' ).clearSelectedBlock()
		);

		await setDevice( 'Tablet' );
		await expect( icon ).toBeVisible();

		await setDevice( 'Mobile' );
		await expect( icon ).toHaveCount( 0 );

		await setDevice( 'Desktop' );
		await expect( icon ).toBeVisible();
	} );
} );
