/**
 * List: typing in it as an author does. Enter makes the next item, Shift+Enter
 * breaks the line, Tab and Shift+Tab nest and un-nest, Backspace joins, Enter
 * on an empty item leaves. TC-LS-01 to TC-LS-10.
 */

const { test, expect } = require( '../../utils' );

/**
 * The block tree as [ name, children or text ]; an Icon as its slug.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @return {Promise<Array>} The tree.
 */
const tree = ( page ) =>
	page.evaluate( () => {
		const strip = ( list ) =>
			list.map( ( block ) => {
				if ( 'zealblocks/icon' === block.name ) {
					return [ 'icon', block.attributes.icon ];
				}

				return [
					block.name.replace( 'zealblocks/', '' ),
					block.innerBlocks.length
						? strip( block.innerBlocks )
						: String( block.attributes.content ?? '' ),
				];
			} );

		return strip(
			window.wp.data.select( 'core/block-editor' ).getBlocks()
		);
	} );

// An item: its Icon, and its Container holding the Text and anything after.
const item = ( text, children = [], icon = 'check' ) => [
	'list-item',
	[
		[ 'icon', icon ],
		[ 'container', [ [ 'text', text ], ...children ] ],
	],
];

test.describe( 'List editing', () => {
	test.beforeEach( async ( { admin, page, posts } ) => {
		await admin.createNewPost( { title: '[e2e] List editing' } );
		posts.track(
			await page.evaluate( () =>
				window.wp.data.select( 'core/editor' ).getCurrentPostId()
			)
		);
		await page.evaluate( () =>
			window.wp.data
				.dispatch( 'core/block-editor' )
				.insertBlock(
					window.wp.blocks.createBlock( 'zealblocks/list' )
				)
		);
		// The cursor lands in the first item's Text.
		await expect
			.poll( () =>
				page.evaluate( () => {
					const store = window.wp.data.select( 'core/block-editor' );
					const id = store.getSelectedBlockClientId();

					return id ? store.getBlockName( id ) : null;
				} )
			)
			.toBe( 'zealblocks/text' );
	} );

	test( 'a new item is an Icon and a Container holding a Text, both locked in place', async ( {
		page,
	} ) => {
		const parts = await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const [ icon, body ] =
				store.getBlocks()[ 0 ].innerBlocks[ 0 ].innerBlocks;

			return {
				names: [ icon.name, body.name ],
				canRemove: [
					store.canRemoveBlock( icon.clientId ),
					store.canRemoveBlock( body.clientId ),
				],
				canMove: [
					store.canMoveBlock( icon.clientId ),
					store.canMoveBlock( body.clientId ),
				],
				layout: body.attributes.layout,
				blockGap: body.attributes.style?.spacing?.blockGap,
			};
		} );

		expect( parts ).toEqual( {
			names: [ 'zealblocks/icon', 'zealblocks/container' ],
			canRemove: [ false, false ],
			canMove: [ false, false ],
			layout: { type: 'default' },
			blockGap: '0.25em',
		} );
	} );

	test( 'typing straight away; Enter makes the next item; Shift+Enter breaks the line', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );
		await page.keyboard.press( 'Shift+Enter' );
		await page.keyboard.type( 'still two' );

		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One' ), item( 'Two<br>still two' ) ] ],
		] );
	} );

	test( 'Enter in the middle of the text splits it into two items', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'FirstSecond' );
		for ( let i = 0; i < 6; i++ ) {
			await page.keyboard.press( 'ArrowLeft' );
		}
		await page.keyboard.press( 'Enter' );

		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'First' ), item( 'Second' ) ] ],
		] );
	} );

	test( "the next item takes this item's icon, and Backspace brings the blocks below the text along", async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );

		// Item 2: its own icon, and a second Text below its first.
		await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const { updateBlockAttributes, insertBlock } =
				window.wp.data.dispatch( 'core/block-editor' );
			const [ icon, body ] =
				store.getBlocks()[ 0 ].innerBlocks[ 1 ].innerBlocks;

			updateBlockAttributes( icon.clientId, { icon: 'star' } );
			insertBlock(
				window.wp.blocks.createBlock( 'zealblocks/text', {
					content: 'Detail',
				} ),
				1,
				body.clientId,
				false
			);
		} );
		const second = page
			.frameLocator( 'iframe[name="editor-canvas"]' )
			.locator( '.wp-block-zealblocks-list > li' )
			.nth( 1 )
			.locator( 'p' )
			.first();

		await second.click();
		await page.keyboard.press( 'End' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Three' );

		expect( await tree( page ) ).toEqual( [
			[
				'list',
				[
					item( 'One' ),
					item( 'Two', [ [ 'text', 'Detail' ] ], 'star' ),
					item( 'Three', [], 'star' ),
				],
			],
		] );

		await second.click();
		await page.keyboard.press( 'Home' );
		await page.keyboard.press( 'Backspace' );

		expect( await tree( page ) ).toEqual( [
			[
				'list',
				[
					item( 'OneTwo', [ [ 'text', 'Detail' ] ] ),
					item( 'Three', [], 'star' ),
				],
			],
		] );
	} );

	test( 'Tab nests under the item above, the caret stays; Shift+Tab un-nests', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );
		await page.keyboard.press( 'Tab' );
		await page.keyboard.type( '!' );

		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One', [ [ 'list', [ item( 'Two!' ) ] ] ] ) ] ],
		] );

		// Enter inside the nested list stays nested.
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Three' );
		await page.keyboard.press( 'Shift+Tab' );

		expect( await tree( page ) ).toEqual( [
			[
				'list',
				[
					item( 'One', [ [ 'list', [ item( 'Two!' ) ] ] ] ),
					item( 'Three' ),
				],
			],
		] );
	} );

	test( 'Backspace at the start of an item joins it to the line above', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );
		await page.keyboard.press( 'Home' );
		await page.keyboard.press( 'Backspace' );
		await page.keyboard.type( '+' );

		// Joined, and the caret sits where the two met.
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One+Two' ) ] ],
		] );
	} );

	test( 'Enter on an empty item: out one level, then out of the list', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Tab' );
		await page.keyboard.type( 'Nested' );
		await page.keyboard.press( 'Enter' );
		// Empty nested item: out one level.
		await page.keyboard.press( 'Enter' );
		// Empty last item: out of the list.
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'After the list' );

		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One', [ [ 'list', [ item( 'Nested' ) ] ] ] ) ] ],
			[ 'text', 'After the list' ],
		] );
	} );

	test( 'the toolbar indents and outdents, and switches bullets and numbers', async ( {
		editor,
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );

		await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );
			const list = store.getBlocks()[ 0 ];

			window.wp.data
				.dispatch( 'core/block-editor' )
				.selectBlock( list.innerBlocks[ 1 ].clientId );
		} );
		const toolbar = page.getByRole( 'toolbar', { name: 'Block tools' } );

		// The editor hides the block toolbar while typing, until the mouse
		// moves, as it would for a person reaching for it.
		await page.mouse.move( 10, 10 );
		await page.mouse.move( 400, 300 );
		await toolbar.getByRole( 'button', { name: 'Indent' } ).click();
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One', [ [ 'list', [ item( 'Two' ) ] ] ] ) ] ],
		] );
		await toolbar.getByRole( 'button', { name: 'Outdent' } ).click();
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One' ), item( 'Two' ) ] ],
		] );

		await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.selectBlock( store.getBlocks()[ 0 ].clientId );
		} );
		await toolbar.getByRole( 'button', { name: 'Numbers' } ).click();
		await expect(
			editor.canvas.locator( 'ol.wp-block-zealblocks-list' )
		).toHaveCount( 1 );
	} );

	test( "Arrow Up and Down move between items' text, never stopping on an icon (TC-LS-09)", async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Three' );

		const selected = () =>
			page.evaluate( () => {
				const store = window.wp.data.select( 'core/block-editor' );
				const block = store.getSelectedBlock();

				return `${ block.name }:${ block.attributes.content }`;
			} );

		await page.keyboard.press( 'ArrowUp' );
		expect( await selected() ).toBe( 'zealblocks/text:Two' );
		await page.keyboard.press( 'ArrowUp' );
		expect( await selected() ).toBe( 'zealblocks/text:One' );
		await page.keyboard.press( 'ArrowDown' );
		await page.keyboard.press( 'ArrowDown' );
		expect( await selected() ).toBe( 'zealblocks/text:Three' );
	} );

	test( 'one undo takes back an Enter, and only that (TC-LS-10)', async ( {
		page,
		pageUtils,
	} ) => {
		await page.keyboard.type( 'OneTwo' );
		for ( let i = 0; i < 3; i++ ) {
			await page.keyboard.press( 'ArrowLeft' );
		}
		await page.keyboard.press( 'Enter' );
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One' ), item( 'Two' ) ] ],
		] );

		await pageUtils.pressKeys( 'primary+z' );
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'OneTwo' ) ] ],
		] );

		await pageUtils.pressKeys( 'primaryShift+z' );
		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One' ), item( 'Two' ) ] ],
		] );
	} );

	test( 'Duplicate on an item copies all of it, after it (TC-LS-11)', async ( {
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.type( 'Two' );

		await page.evaluate( () => {
			const store = window.wp.data.select( 'core/block-editor' );

			window.wp.data
				.dispatch( 'core/block-editor' )
				.selectBlock(
					store.getBlocks()[ 0 ].innerBlocks[ 0 ].clientId
				);
		} );
		await page.mouse.move( 10, 10 );
		await page.mouse.move( 400, 300 );
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Options' } )
			.click();
		await page.getByRole( 'menuitem', { name: /^Duplicate/ } ).click();

		expect( await tree( page ) ).toEqual( [
			[ 'list', [ item( 'One' ), item( 'One' ), item( 'Two' ) ] ],
		] );
	} );

	test( 'saved and reloaded: the same list, and every block valid (TC-LS-12)', async ( {
		editor,
		page,
	} ) => {
		await page.keyboard.type( 'One' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Tab' );
		await page.keyboard.type( 'Nested' );
		await page.keyboard.press( 'Enter' );
		await page.keyboard.press( 'Shift+Tab' );
		await page.keyboard.type( 'Two' );

		const before = await tree( page );

		await editor.saveDraft();
		await page.reload();
		await page.waitForFunction(
			() =>
				window.wp?.data?.select( 'core/block-editor' ).getBlocks()
					.length
		);

		expect( await tree( page ) ).toEqual( before );
		expect(
			await page.evaluate( () => {
				const invalid = [];
				const walk = ( blocks ) =>
					blocks.forEach( ( block ) => {
						if ( ! block.isValid ) {
							invalid.push( block.name );
						}
						walk( block.innerBlocks );
					} );

				walk(
					window.wp.data.select( 'core/block-editor' ).getBlocks()
				);

				return invalid;
			} )
		).toEqual( [] );
		await expect(
			editor.canvas.locator( '.block-editor-warning' )
		).toHaveCount( 0 );
	} );
} );
