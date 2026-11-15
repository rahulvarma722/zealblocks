/**
 * List: its settings operated in the inspector, and what the published page
 * and assistive technology get. TC-LS-20 to TC-LS-30.
 */

const { test, expect, computed } = require( '../../utils' );

const item = ( text, extra = [] ) => ( {
	name: 'zealblocks/list-item',
	innerBlocks: [
		{ name: 'zealblocks/text', attributes: { content: text } },
		...extra,
	],
} );

/**
 * Starts a post with blocks, selects one, opens a tab.
 *
 * @param {Object}   fixtures        Playwright fixtures.
 * @param {Object}   fixtures.admin  Admin utils.
 * @param {Object}   fixtures.editor Editor utils.
 * @param {Object}   fixtures.page   Page.
 * @param {Object}   fixtures.posts  The posts fixture.
 * @param {Object[]} blocks          Blocks.
 * @param {number[]} path            Indexes of the block to select.
 * @param {string}   tab             'Settings' or 'Styles'.
 * @return {Promise<void>}
 */
async function setUp( { admin, editor, page, posts }, blocks, path, tab ) {
	await admin.createNewPost( { title: '[e2e] List settings' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);

	for ( const block of blocks ) {
		await editor.insertBlock( block );
	}

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

const inspector = ( page ) => page.locator( '.block-editor-block-inspector' );

const publish = ( page ) =>
	page.evaluate( async () => {
		const { dispatch, select } = window.wp.data;

		dispatch( 'core/editor' ).editPost( { status: 'publish' } );
		await dispatch( 'core/editor' ).savePost();

		return select( 'core/editor' ).getPermalink();
	} );

const viewMenu = async ( page, name, role ) => {
	await page.getByRole( 'button', { name: 'View', exact: true } ).click();
	await page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( role, { name } )
		.click();
	await page.keyboard.press( 'Escape' );
};

test.describe( 'List settings and the page', () => {
	test( 'an icon picked from the presets: icons on the page, never read out', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/list',
					attributes: { anchor: 'features' },
					innerBlocks: [
						item( 'Fast setup' ),
						item( '<strong>Unlimited</strong> sites', [
							{
								name: 'zealblocks/text',
								attributes: {
									content: 'On as many as you like.',
								},
							},
						] ),
						item( 'Nested', [
							{
								name: 'zealblocks/list',
								innerBlocks: [ item( 'Inside' ) ],
							},
						] ),
					],
				},
			],
			[ 0 ],
			'Settings'
		);

		await inspector( page )
			.getByRole( 'button', { name: /^Icon: Check$/ } )
			.click();
		expect(
			await page.evaluate(
				() =>
					window.wp.data
						.select( 'core/block-editor' )
						.getSelectedBlock().attributes.icon
			)
		).toBe( 'check' );
		await expect(
			editor.canvas.locator( '.wp-block-zealblocks-list-item__icon' )
		).toHaveCount( 3 );

		await page.goto( await publish( page ) );
		const list = page.locator( '#features' );

		await expect( list ).toHaveAttribute( 'role', 'list' );
		await expect(
			list.locator(
				':scope > li > .wp-block-zealblocks-list-item__icon[aria-hidden="true"]'
			)
		).toHaveCount( 3 );
		// What assistive technology gets: the list and its text, no images.
		await expect( list ).toMatchAriaSnapshot( `
			- list:
			  - listitem:
			    - paragraph: Fast setup
			  - listitem:
			    - paragraph:
			      - strong: Unlimited
			      - text: sites
			    - paragraph: On as many as you like.
			  - listitem:
			    - paragraph: Nested
			    - list:
			      - listitem:
			        - paragraph: Inside
		` );
		expect( await list.locator( 'img, [role="img"]' ).count() ).toBe( 0 );
	} );

	test( 'numbers: style, start and count down set in Settings are native on the page', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/list',
					attributes: { anchor: 'steps' },
					innerBlocks: [ item( 'Step' ), item( 'Step' ) ],
				},
			],
			[ 0 ],
			'Settings'
		);

		await inspector( page )
			.getByLabel( 'List type', { exact: true } )
			.selectOption( 'ordered' );
		await inspector( page )
			.getByLabel( 'Numbering', { exact: true } )
			.selectOption( 'upper-roman' );
		await inspector( page )
			.getByLabel( 'Start at', { exact: true } )
			.fill( '3' );
		await inspector( page )
			.getByLabel( 'Count down', { exact: true } )
			.click();

		await page.goto( await publish( page ) );
		const list = page.locator( '#steps' );

		expect( await list.evaluate( ( el ) => el.tagName ) ).toBe( 'OL' );
		await expect( list ).toHaveAttribute( 'start', '3' );
		await expect( list ).toHaveAttribute( 'reversed', /.*/ );
		expect( await computed( list, 'list-style-type' ) ).toBe(
			'upper-roman'
		);
		await expect(
			list.locator( '.wp-block-zealblocks-list-item__icon' )
		).toHaveCount( 0 );
	} );

	test( 'one item with its own icon, one with none', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/list',
					attributes: { anchor: 'mixed', icon: 'check' },
					innerBlocks: [ item( 'A' ), item( 'B' ), item( 'C' ) ],
				},
			],
			[ 0, 2 ],
			'Settings'
		);

		await inspector( page )
			.getByLabel( 'Show an icon', { exact: true } )
			.click();
		expect(
			await page.evaluate(
				() =>
					window.wp.data
						.select( 'core/block-editor' )
						.getSelectedBlock().attributes.icon
			)
		).toBe( 'none' );

		await page.goto( await publish( page ) );
		const icons = page.locator(
			'#mixed > li > .wp-block-zealblocks-list-item__icon'
		);

		await expect( icons ).toHaveCount( 2 );
	} );

	test( 'space between items and the icon colour, with a Tablet value of its own', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				{
					name: 'zealblocks/list',
					attributes: { anchor: 'spaced', icon: 'check' },
					innerBlocks: [ item( 'A' ), item( 'B' ) ],
				},
			],
			[ 0 ],
			'Styles'
		);

		await inspector( page )
			.getByRole( 'spinbutton', {
				name: 'Space between items',
				exact: true,
			} )
			.fill( '20' );
		await inspector( page )
			.getByRole( 'button', { name: 'Icon', exact: true } )
			.click();
		await page
			.locator(
				'.block-editor-panel-color-gradient-settings__dropdown-content'
			)
			.locator( '.components-circular-option-picker__option:visible' )
			.first()
			.click();
		await page.keyboard.press( 'Escape' );

		await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );

		try {
			await viewMenu( page, /^Tablet/, 'menuitemradio' );
			await inspector( page )
				.getByRole( 'spinbutton', {
					name: 'Space between items (Tablet)',
					exact: true,
				} )
				.fill( '6' );
		} finally {
			await viewMenu( page, /^Desktop/, 'menuitemradio' );
			await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );
		}

		const style = await page.evaluate(
			() =>
				window.wp.data.select( 'core/block-editor' ).getSelectedBlock()
					.attributes.style
		);

		expect( style.zealblocks.itemGap ).toBe( '20px' );
		expect( style.zealblocks.iconColor ).toBeTruthy();
		expect( style[ '@tablet' ].zealblocks.itemGap ).toBe( '6px' );

		await page.goto( await publish( page ) );
		const gap = () =>
			page
				.locator( '#spaced' )
				.evaluate( ( el ) =>
					Math.round(
						el.children[ 1 ].getBoundingClientRect().top -
							el.children[ 0 ].getBoundingClientRect().bottom
					)
				);

		await page.setViewportSize( { width: 1280, height: 900 } );
		expect( await gap() ).toBe( 20 );
		await page.setViewportSize( { width: 700, height: 900 } );
		expect( await gap() ).toBe( 6 );
	} );

	test( 'an item takes other blocks through its "+"', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ { name: 'zealblocks/list', innerBlocks: [ item( 'A' ) ] } ],
			[ 0, 0, 0 ],
			'Settings'
		);

		await expect(
			editor.canvas.locator(
				'.wp-block-zealblocks-list-item .block-editor-button-block-appender'
			)
		).toHaveCount( 1 );

		const allowed = await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const itemId = store.getBlocks()[ 0 ].innerBlocks[ 0 ].clientId;

			return [
				'core/heading',
				'core/image',
				'zealblocks/buttons',
				'zealblocks/list',
				'zealblocks/container',
				'zealblocks/list-item',
			].map( ( name ) => store.canInsertBlockType( name, itemId ) );
		} );

		// Any of these, but not a bare item: items belong to a list.
		expect( allowed ).toEqual( [ true, true, true, true, true, false ] );
	} );
} );
