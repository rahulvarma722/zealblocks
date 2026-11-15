/**
 * Container phase 3 on the front end: shape dividers, parent hover, and a
 * nested Container that no longer inherits its parent's values. TC-C-50 to
 * TC-C-58.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

const paragraph = ( text ) =>
	`<!-- wp:paragraph --><p>${ text }</p><!-- /wp:paragraph -->`;

const container = ( attributes, inner ) =>
	block( 'zealblocks/container', attributes, inner );

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	mobile: { width: 400, height: 900 },
};

/**
 * A divider's SVG box, and the section's.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @param {string}                          side 'top' or 'bottom'.
 * @return {Promise<Object>} Measurements.
 */
const measure = ( page, side ) =>
	page.evaluate( ( which ) => {
		const divider = document.querySelector(
			`#section > .wp-block-zealblocks-container__divider.is-${ which }`
		);
		const svg = divider.querySelector( 'svg' );
		const section = document
			.querySelector( '#section' )
			.getBoundingClientRect();
		const box = svg.getBoundingClientRect();
		const style = window.getComputedStyle( svg );

		return {
			fill: style.fill,
			height: Math.round( box.height ),
			width: Math.round( box.width ),
			sectionWidth: Math.round( section.width ),
			centred: Math.round(
				box.left + box.width / 2 - ( section.left + section.width / 2 )
			),
			edge: Math.round(
				'top' === which
					? box.top - section.top
					: section.bottom - box.bottom
			),
			zIndex: window.getComputedStyle( divider ).zIndex,
			rotate: window.getComputedStyle( divider ).rotate,
			scale: style.scale,
		};
	}, side );

test.describe( 'Container shape dividers and parent hover', () => {
	let link;

	test.beforeEach( async ( { posts, page } ) => {
		( { link } = await posts.create(
			[
				container(
					{
						anchor: 'section',
						dividerTop: { shape: 'waves' },
						dividerBottom: {
							shape: 'curve',
							flip: true,
							invert: true,
							front: true,
						},
						style: {
							color: { background: '#334455' },
							dimensions: { minHeight: '300px' },
							zealblocks: {
								dividerTopColor: '#ffffff',
								dividerTopHeight: '60px',
								dividerBottomColor: '#ff0000',
								dividerBottomWidth: '200%',
							},
							'@mobile': {
								zealblocks: { dividerTopHeight: '30px' },
							},
						},
					},
					[ paragraph( 'Section' ) ]
				),
				container(
					{
						anchor: 'tile',
						layout: { type: 'constrained' },
						style: {
							color: { background: '#222222' },
							dimensions: { minHeight: '200px' },
							zealblocks: {
								hoverLift: '6px',
								overlayHoverOpacity: '0.3',
								order: '3',
								hoverDuration: '0ms',
							},
						},
					},
					[
						container(
							{
								anchor: 'reveal',
								layout: { type: 'constrained' },
								style: {
									zealblocks: {
										parentHoverRestOpacity: '0',
										parentHoverMove: '10px',
										parentHoverColor: '#ffff00',
										hoverDuration: '0ms',
									},
								},
							},
							[
								paragraph(
									'<a href="https://example.org/">Read more</a>'
								),
							]
						),
						container(
							{
								anchor: 'nested',
								layout: { type: 'constrained' },
								style: {
									zealblocks: {
										overlay: '#000000',
										overlayHover: '#ff0000',
										hoverDuration: '0ms',
									},
									'@mobile': {
										zealblocks: { order: '-1' },
									},
								},
							},
							[ paragraph( 'Nested' ) ]
						),
					]
				),
			].join( '' ),
			{ title: 'Container dividers' }
		) );

		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.setViewportSize( VIEWPORTS.desktop );
	} );

	test( 'the top divider: its colour and height, at the very top edge, behind the content', async ( {
		page,
	} ) => {
		await page.goto( link );
		const top = await measure( page, 'top' );

		expect( top ).toMatchObject( {
			fill: 'rgb(255, 255, 255)',
			height: 60,
			edge: -1,
			zIndex: '-1',
			centred: 0,
		} );
		expect( top.width ).toBe( top.sectionWidth );

		await page.setViewportSize( VIEWPORTS.mobile );
		expect( ( await measure( page, 'top' ) ).height ).toBe( 30 );
	} );

	test( 'the bottom divider: turned round, flipped, wider and centred, in front', async ( {
		page,
	} ) => {
		await page.goto( link );
		const bottom = await measure( page, 'bottom' );

		expect( bottom ).toMatchObject( {
			fill: 'rgb(255, 0, 0)',
			edge: -1,
			zIndex: '2',
			rotate: '180deg',
			scale: '-1 1',
			centred: 0,
		} );
		expect( bottom.width ).toBe( bottom.sectionWidth * 2 );

		// In front, but clicks still reach what is under it.
		expect(
			await page
				.locator( '#section > .wp-block-zealblocks-container__divider' )
				.first()
				.evaluate(
					( el ) => window.getComputedStyle( el ).pointerEvents
				)
		).toBe( 'none' );
	} );

	test( 'parent hover reveals, moves and recolours the child; leaving restores it', async ( {
		page,
	} ) => {
		await page.goto( link );
		await page.locator( '#tile' ).scrollIntoViewIfNeeded();
		const reveal = page.locator( '#reveal' );

		expect( await computed( reveal, 'opacity' ) ).toBe( '0' );

		const box = await page.locator( '#tile' ).boundingBox();

		await page.mouse.move(
			box.x + box.width - 20,
			box.y + box.height - 20
		);
		await expect.poll( () => computed( reveal, 'opacity' ) ).toBe( '1' );
		expect( await computed( reveal, 'translate' ) ).toBe( '0px -10px' );
		expect( await computed( reveal, 'color' ) ).toBe( 'rgb(255, 255, 0)' );

		await page.mouse.move( 1, 1 );
		await expect.poll( () => computed( reveal, 'opacity' ) ).toBe( '0' );
	} );

	test( 'keyboard focus inside the parent reveals the child too', async ( {
		page,
	} ) => {
		await page.goto( link );
		await tabTo( page, page.getByRole( 'link', { name: 'Read more' } ) );
		await expect
			.poll( () => computed( page.locator( '#reveal' ), 'opacity' ) )
			.toBe( '1' );
	} );

	test( 'a device that cannot hover always shows the child', async ( {
		browser,
	} ) => {
		const context = await browser.newContext( {
			viewport: VIEWPORTS.mobile,
			hasTouch: true,
			isMobile: true,
		} );
		const page = await context.newPage();

		await page.goto( link );
		expect(
			await page.evaluate(
				() => window.matchMedia( '(hover: none)' ).matches
			)
		).toBe( true );
		expect( await computed( page.locator( '#reveal' ), 'opacity' ) ).toBe(
			'1'
		);
		await context.close();
	} );

	test( "a nested Container takes none of its parent's values", async ( {
		page,
	} ) => {
		await page.goto( link );
		await page.locator( '#tile' ).scrollIntoViewIfNeeded();
		const nested = page.locator( '#nested' );

		// The parent's order is 3; the child sets one for mobile only.
		expect( await computed( nested, 'order' ) ).toBe( '0' );

		const box = await nested.boundingBox();

		await page.mouse.move( box.x + 5, box.y + 5 );
		// The parent lifts; the child does not inherit the lift.
		expect( await computed( nested, 'translate' ) ).toBe( 'none' );
		// Its own overlay hover, at its own opacity, not the parent's 0.3.
		expect( await computed( nested, 'background-color', '::before' ) ).toBe(
			'rgb(255, 0, 0)'
		);
		expect( await computed( nested, 'opacity', '::before' ) ).toBe( '1' );
	} );
} );
