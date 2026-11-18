/**
 * List: its settings operated in the inspector, and what the published page
 * and assistive technology get. TC-LS-20 to TC-LS-30.
 */

const { test, expect, computed } = require( '../../utils' );

const LOCKED = { move: true, remove: true };

// An item as the editor makes it: an Icon, and a Container holding a Text
// and anything after it.
const item = ( text, extra = [], icon = 'check' ) => ( {
	name: 'zealblocks/list-item',
	innerBlocks: [
		{ name: 'zealblocks/icon', attributes: { icon, lock: LOCKED } },
		{
			name: 'zealblocks/container',
			attributes: {
				layout: { type: 'default' },
				style: { spacing: { blockGap: '0.25em' } },
				lock: LOCKED,
			},
			innerBlocks: [
				{ name: 'zealblocks/text', attributes: { content: text } },
				...extra,
			],
		},
	],
} );

const canvas = ( page ) => page.frameLocator( 'iframe[name="editor-canvas"]' );

// The icon of each item of the first list, in order.
const icons = ( page ) =>
	page.evaluate( () =>
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()[ 0 ]
			.innerBlocks.map( ( one ) => one.innerBlocks[ 0 ].attributes.icon )
	);

const selectFirstList = ( page ) =>
	page.evaluate( () => {
		const { select, dispatch } = window.wp.data;

		dispatch( 'core/block-editor' ).selectBlock(
			select( 'core/block-editor' ).getBlocks()[ 0 ].clientId
		);
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
	test( 'an icon picked from the presets: on every item, on the page, never read out', async ( {
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
			.getByRole( 'button', { name: /^Icon: Star$/ } )
			.click();
		expect(
			await page.evaluate(
				() =>
					window.wp.data
						.select( 'core/block-editor' )
						.getSelectedBlock().attributes.icon
			)
		).toBe( 'star' );
		// Every item of this list; the nested list keeps its own.
		expect( await icons( page ) ).toEqual( [ 'star', 'star', 'star' ] );

		await page.goto( await publish( page ) );
		const list = page.locator( '#features' );

		await expect( list ).toHaveAttribute( 'role', 'list' );
		await expect(
			list.locator(
				':scope > li > .wp-block-zealblocks-icon > svg[aria-hidden="true"]'
			)
		).toHaveCount( 3 );

		/*
		 * Each icon sits on the middle of its item's first line, whatever
		 * line height the theme gives the text.
		 */
		const offsets = await list.evaluate( ( element ) =>
			[ ...element.querySelectorAll( ':scope > li' ) ].map( ( li ) => {
				const svg = li
					.querySelector( ':scope > .wp-block-zealblocks-icon svg' )
					.getBoundingClientRect();
				const text = li.querySelector( 'p' );
				const line = parseFloat(
					window.getComputedStyle( text ).lineHeight
				);

				return Math.abs(
					svg.top +
						svg.height / 2 -
						( text.getBoundingClientRect().top + line / 2 )
				);
			} )
		);

		offsets.forEach( ( offset ) => expect( offset ).toBeLessThan( 1 ) );
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
		// The numbers are the markers: the Icon blocks stay hidden.
		await expect(
			list.locator( ':scope > li > .wp-block-zealblocks-icon' ).first()
		).toBeHidden();
	} );

	test( "one item's icon changed on its Icon block; the list's icon then changes the rest", async ( {
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
			[ 0 ],
			'Settings'
		);

		// Click the second item's icon, and pick another from its toolbar.
		// The canvas has no anchor ids: the first list there.
		await canvas( page )
			.locator( '.wp-block-zealblocks-list' )
			.first()
			.locator( ':scope > li' )
			.nth( 1 )
			.locator( ':scope > .wp-block-zealblocks-icon' )
			.click();
		expect(
			await page.evaluate(
				() =>
					window.wp.data
						.select( 'core/block-editor' )
						.getSelectedBlock().name
			)
		).toBe( 'zealblocks/icon' );
		await page.mouse.move( 10, 10 );
		await page.mouse.move( 400, 300 );
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Select an icon' } )
			.click();
		await page.getByLabel( 'Search icons' ).first().fill( 'star' );
		await page
			.getByRole( 'dialog' )
			.getByRole( 'button', { name: 'Star', exact: true } )
			.click();
		expect( await icons( page ) ).toEqual( [ 'check', 'star', 'check' ] );

		// The list's icon: the others follow, the hand-picked one stays.
		await selectFirstList( page );
		await inspector( page )
			.getByRole( 'button', { name: /^Icon: Arrow Right$/ } )
			.click();
		expect( await icons( page ) ).toEqual( [
			'arrow-right',
			'star',
			'arrow-right',
		] );

		await page.goto( await publish( page ) );
		const viewBoxes = await page
			.locator( '#mixed > li > .wp-block-zealblocks-icon svg' )
			.evaluateAll( ( svgs ) =>
				svgs.map( ( svg ) => svg.getAttribute( 'viewBox' ) )
			);

		// The star is 576 wide; the arrows 512.
		expect( viewBoxes ).toEqual( [
			'0 0 512 512',
			'0 0 576 512',
			'0 0 512 512',
		] );
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
		// The list's icon colour reaches the Icon blocks.
		const colours = await page.locator( '#spaced' ).evaluate( ( list ) => {
			const probe = list.ownerDocument.createElement( 'span' );

			probe.style.color = 'var(--zealblocks-list-icon-color)';
			list.appendChild( probe );

			const expected = window.getComputedStyle( probe ).color;

			probe.remove();

			return {
				expected,
				icon: window.getComputedStyle(
					list.querySelector(
						':scope > li > .wp-block-zealblocks-icon'
					)
				).color,
				text: window.getComputedStyle( list.querySelector( 'p' ) )
					.color,
			};
		} );

		expect( colours.icon ).toBe( colours.expected );
		expect( colours.icon ).not.toBe( colours.text );
		await page.setViewportSize( { width: 700, height: 900 } );
		expect( await gap() ).toBe( 6 );
	} );

	test( 'an item takes other blocks in its Container, and nothing beside it', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ { name: 'zealblocks/list', innerBlocks: [ item( 'A' ) ] } ],
			[ 0, 0, 1 ],
			'Settings'
		);

		// The selected Container shows its "+".
		await expect(
			canvas( page ).locator(
				'.wp-block-zealblocks-list-item > .wp-block-zealblocks-container .block-list-appender'
			)
		).toHaveCount( 1 );

		const allowed = await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const itemId = store.getBlocks()[ 0 ].innerBlocks[ 0 ].clientId;
			const bodyId = store.getBlockOrder( itemId )[ 1 ];
			const names = [
				'core/heading',
				'core/image',
				'zealblocks/buttons',
				'zealblocks/list',
				'zealblocks/container',
				'zealblocks/list-item',
			];

			return {
				body: names.map( ( name ) =>
					store.canInsertBlockType( name, bodyId )
				),
				item: [ 'zealblocks/text', 'core/heading' ].map( ( name ) =>
					store.canInsertBlockType( name, itemId )
				),
			};
		} );

		// Any of these in the Container, but not a bare item: items belong
		// to a list. Beside the Container, in the item itself: nothing else.
		expect( allowed ).toEqual( {
			body: [ true, true, true, true, true, false ],
			item: [ false, false ],
		} );
	} );
} );
