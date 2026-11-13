/**
 * Icon hover colours, the link and right-to-left mirroring on the front end:
 * TC-I-30 to TC-I-36.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

const icon = ( attributes ) =>
	block( 'zealblocks/icon', {
		icon: 'arrow-right',
		...attributes,
		style: {
			dimensions: { width: '48px' },
			...( attributes.style || {} ),
		},
	} );

const HOVER = { zealblocks: { hoverDuration: '0ms' } };

test.describe( 'Icon hover, link and RTL', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			[
				icon( {
					anchor: 'hovered',
					style: {
						color: { text: '#333333' },
						zealblocks: {
							...HOVER.zealblocks,
							textHover: '#ff0000',
							backgroundHover: '#ffff00',
						},
					},
				} ),
				icon( {
					anchor: 'linked',
					url: 'https://example.org/pricing',
					label: 'Pricing',
					style: {
						zealblocks: {
							...HOVER.zealblocks,
							textHover: '#00aa00',
						},
					},
				} ),
				icon( { anchor: 'unlabelled', url: 'https://example.org/b' } ),
				icon( { anchor: 'unlinked' } ),
				icon( { anchor: 'rotated', rotation: 45, flipForRTL: true } ),
				icon( {
					anchor: 'flipped',
					flipHorizontal: true,
					flipForRTL: true,
				} ),
			].join( '' ),
			{ title: 'Icon link and hover' }
		) );
	} );

	test( 'hover changes the icon colour and the background', async ( {
		page,
	} ) => {
		await page.goto( link );
		const hovered = page.locator( '#hovered' );

		expect( await computed( hovered, 'color' ) ).toBe( 'rgb(51, 51, 51)' );

		await hovered.hover();
		expect( await computed( hovered, 'color' ) ).toBe( 'rgb(255, 0, 0)' );
		expect( await computed( hovered.locator( 'svg' ), 'fill' ) ).toBe(
			'rgb(255, 0, 0)'
		);
		expect( await computed( hovered, 'background-color' ) ).toBe(
			'rgb(255, 255, 0)'
		);
	} );

	test( 'a linked icon is an <a> named by its alternative text, or by the icon', async ( {
		page,
	} ) => {
		await page.goto( link );
		const linked = page.locator( '#linked' );

		expect( await linked.evaluate( ( el ) => el.tagName ) ).toBe( 'A' );
		await expect( linked ).toHaveAttribute(
			'href',
			'https://example.org/pricing'
		);
		await expect( linked ).toHaveAccessibleName( 'Pricing' );
		await expect( linked.locator( 'svg' ) ).toHaveAttribute(
			'aria-hidden',
			'true'
		);
		await expect( page.locator( '#unlabelled' ) ).toHaveAccessibleName(
			'Arrow Right'
		);
	} );

	test( 'a linked icon keeps its colour; the theme link colour does not repaint it', async ( {
		page,
	} ) => {
		await page.goto( link );
		const unlinked = await computed( page.locator( '#unlinked' ), 'color' );
		const plain = page.locator( '#unlabelled' );

		expect( await computed( plain, 'color' ) ).toBe( unlinked );
		await plain.hover();
		expect( await computed( plain, 'color' ) ).toBe( unlinked );
	} );

	test( 'keyboard focus on a linked icon shows the hover colour', async ( {
		page,
	} ) => {
		await page.goto( link );
		const linked = page.locator( '#linked' );

		await tabTo( page, linked );
		expect( await computed( linked, 'color' ) ).toBe( 'rgb(0, 170, 0)' );
	} );

	test( 'RTL mirrors a rotated icon whole, and un-flips a flipped one', async ( {
		page,
	} ) => {
		await page.goto( link );
		const read = ( id ) =>
			page
				.locator( `#${ id } svg` )
				.evaluate(
					( svg ) =>
						`${ window.getComputedStyle( svg ).rotate } | ${
							window.getComputedStyle( svg ).scale
						}`
				);

		expect( await read( 'rotated' ) ).toBe( '45deg | none' );
		expect( await read( 'flipped' ) ).toBe( 'none | -1 1' );

		await page.evaluate( () =>
			document.documentElement.setAttribute( 'dir', 'rtl' )
		);
		expect( await read( 'rotated' ) ).toBe( '-45deg | -1 1' );
		expect( await read( 'flipped' ) ).toBe( '0deg | 1' );
		expect( await read( 'unlinked' ) ).toBe( 'none | none' );
	} );
} );
