/**
 * Buttons container styling on the front end: TC-BS-20 to TC-BS-24.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

test.describe( 'Buttons styling', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			block(
				'zealblocks/buttons',
				{
					anchor: 'group',
					style: {
						color: { background: '#eeeeee' },
						border: {
							width: '2px',
							style: 'solid',
							color: '#111111',
							radius: '8px',
						},
						shadow: 'var:preset|shadow|natural',
						spacing: {
							padding: {
								top: '12px',
								right: '12px',
								bottom: '12px',
								left: '12px',
							},
							margin: { left: '30px', right: '20px' },
						},
						zealblocks: {
							backgroundHover: '#ffcc00',
							hoverDuration: '0ms',
						},
					},
				},
				[
					block( 'zealblocks/button', {
						text: 'Link',
						url: 'https://example.org/',
						anchor: 'link',
					} ),
					block( 'zealblocks/button', {
						text: 'Tag button',
						anchor: 'tag-button',
					} ),
				]
			),
			{ title: 'Buttons styling' }
		) );
	} );

	test( 'background, border, shadow and side margins apply', async ( {
		page,
	} ) => {
		await page.goto( link );
		const group = page.locator( '#group' );

		expect( await computed( group, 'background-color' ) ).toBe(
			'rgb(238, 238, 238)'
		);
		expect( await computed( group, 'border-top-width' ) ).toBe( '2px' );
		expect( await computed( group, 'border-top-left-radius' ) ).toBe(
			'8px'
		);
		expect( await computed( group, 'box-shadow' ) ).not.toBe( 'none' );
		expect( await computed( group, 'margin-left' ) ).toBe( '30px' );
		expect( await computed( group, 'margin-right' ) ).toBe( '20px' );
	} );

	test( 'background hover on mouse, and on keyboard focus inside', async ( {
		page,
	} ) => {
		await page.goto( link );
		const group = page.locator( '#group' );

		await group.hover();
		expect( await computed( group, 'background-color' ) ).toBe(
			'rgb(255, 204, 0)'
		);

		await page.mouse.move( 0, 0 );
		expect( await computed( group, 'background-color' ) ).toBe(
			'rgb(238, 238, 238)'
		);

		await tabTo( page, page.locator( '#link' ) );
		expect( await computed( group, 'background-color' ) ).toBe(
			'rgb(255, 204, 0)'
		);
	} );

	test( 'a mouse click on a <button> inside does not leave the hover background on', async ( {
		page,
	} ) => {
		await page.goto( link );

		await page.locator( '#tag-button' ).click();
		await page.mouse.move( 0, 0 );

		await expect( page.locator( '#tag-button' ) ).toBeFocused();
		expect(
			await computed( page.locator( '#group' ), 'background-color' )
		).toBe( 'rgb(238, 238, 238)' );
	} );
} );
