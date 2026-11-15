/**
 * Container on the front end: the safe link, hover and focus, reverse order
 * per device, the grid presets, the size limits and the tag allow-list.
 * TC-C-01 to TC-C-12.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

const paragraph = ( text ) =>
	`<!-- wp:paragraph --><p>${ text }</p><!-- /wp:paragraph -->`;

const heading = ( text ) =>
	`<!-- wp:heading --><h2 class="wp-block-heading">${ text }</h2><!-- /wp:heading -->`;

const container = ( attributes, inner ) =>
	block( 'zealblocks/container', attributes, inner );

const CARD = container(
	{
		tagName: 'article',
		url: 'https://example.org/card',
		anchor: 'card',
		style: {
			spacing: {
				padding: {
					top: '24px',
					right: '24px',
					bottom: '24px',
					left: '24px',
				},
			},
			color: { background: '#f0f0f0' },
			border: { width: '1px', color: '#cccccc', style: 'solid' },
			zealblocks: {
				backgroundHover: '#ffffcc',
				borderHover: '#ff0000',
				shadowHoverX: '0px',
				shadowHoverY: '8px',
				shadowHoverBlur: '16px',
				shadowHoverSpread: '0px',
				shadowHoverColor: '#00000033',
				hoverLift: '6px',
				hoverDuration: '0ms',
			},
		},
	},
	[
		heading( 'Pricing plan' ),
		paragraph( 'Card text that is long enough to click.' ),
		block( 'zealblocks/buttons', {}, [
			block( 'zealblocks/button', {
				text: 'Buy now',
				url: 'https://example.org/buy',
				anchor: 'buy',
			} ),
		] ),
	]
);

const ROW = container(
	{
		anchor: 'row',
		layout: { type: 'flex', flexWrap: 'nowrap' },
		style: {
			zealblocks: { reverse: true },
			'@mobile': {
				layout: { orientation: 'vertical' },
				zealblocks: { reverse: false },
			},
		},
	},
	[ paragraph( 'One' ), paragraph( 'Two' ), paragraph( 'Three' ) ]
);

const GRID = container(
	{
		anchor: 'grid',
		layout: { type: 'grid', columnCount: 3 },
		style: { '@mobile': { layout: { columnCount: 1 } } },
	},
	[
		container( { anchor: 'narrow' }, [ paragraph( 'Narrow' ) ] ),
		container(
			{
				anchor: 'wide',
				style: {
					layout: { columnSpan: 2 },
					'@mobile': { layout: { columnSpan: 1 } },
				},
			},
			[ paragraph( 'Wide' ) ]
		),
	]
);

const SIZED = container(
	{
		tagName: 'section',
		ariaLabel: 'Features',
		anchor: 'sized',
		style: {
			zealblocks: { maxWidth: '400px', overflow: 'hidden' },
			'@mobile': { zealblocks: { maxWidth: '200px' } },
		},
	},
	[ paragraph( 'Sized' ) ]
);

const UNSAFE = container(
	{ tagName: 'script', anchor: 'unsafe', url: 'javascript:alert(1)' },
	[ paragraph( 'Unsafe tag and URL' ) ]
);

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	tablet: { width: 700, height: 900 },
	mobile: { width: 400, height: 900 },
};

test.describe( 'Container front end', () => {
	let link;

	test.beforeEach( async ( { posts, page } ) => {
		( { link } = await posts.create(
			[ CARD, ROW, GRID, SIZED, UNSAFE ].join( '' ),
			{ title: 'Container' }
		) );

		// The card's links go nowhere real.
		await page.route( 'https://example.org/**', ( route ) =>
			route.fulfill( {
				contentType: 'text/html',
				body: '<title>stub</title>',
			} )
		);
		await page.setViewportSize( VIEWPORTS.desktop );
	} );

	test( 'a linked container nests no link: its link is a sibling of the content', async ( {
		page,
	} ) => {
		await page.goto( link );
		const card = page.locator( '#card' );

		expect( await card.evaluate( ( el ) => el.tagName ) ).toBe( 'ARTICLE' );
		await expect( card.locator( 'a a' ) ).toHaveCount( 0 );
		await expect( card.locator( '> a' ) ).toHaveCount( 1 );
		await expect(
			card.locator( '> a.wp-block-zealblocks-container__link' )
		).toHaveAttribute( 'href', 'https://example.org/card' );
		// Named by the first heading, since no label was set.
		await expect(
			page.getByRole( 'link', { name: 'Pricing plan' } )
		).toHaveCount( 1 );
	} );

	test( 'a click on the content follows the card link; a click on its button follows the button', async ( {
		page,
	} ) => {
		await page.goto( link );
		const text = await page.locator( '#card p' ).boundingBox();

		await Promise.all( [
			page.waitForURL( 'https://example.org/card' ),
			page.mouse.click( text.x + 20, text.y + text.height / 2 ),
		] );

		await page.goto( link );
		const button = await page.locator( '#buy' ).boundingBox();

		await Promise.all( [
			page.waitForURL( 'https://example.org/buy' ),
			page.mouse.click(
				button.x + button.width / 2,
				button.y + button.height / 2
			),
		] );
	} );

	test( 'the link covers the card and the first block keeps no top margin', async ( {
		page,
	} ) => {
		await page.goto( link );
		const sizes = await page
			.locator( '#card > .wp-block-zealblocks-container__link' )
			.evaluate( ( el ) => {
				const own = el.getBoundingClientRect();
				const card = el.parentElement.getBoundingClientRect();

				// Inside the border: the link fills the padding box.
				return [
					Math.round( card.width - own.width ),
					Math.round( card.height - own.height ),
				];
			} );

		expect( sizes ).toEqual( [ 2, 2 ] );
		expect(
			await computed( page.locator( '#card h2' ), 'margin-top' )
		).toBe( '0px' );
	} );

	test( 'hover changes the background, border, shadow and lift, and resets after', async ( {
		page,
	} ) => {
		// wp-scripts runs every test with reduced motion; the lift needs it off.
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.goto( link );
		const card = page.locator( '#card' );
		const box = await page.locator( '#card h2' ).boundingBox();

		await page.mouse.move( box.x + 10, box.y + box.height / 2 );
		expect( await computed( card, 'background-color' ) ).toBe(
			'rgb(255, 255, 204)'
		);
		expect( await computed( card, 'border-top-color' ) ).toBe(
			'rgb(255, 0, 0)'
		);
		expect( await computed( card, 'box-shadow' ) ).toBe(
			'rgba(0, 0, 0, 0.2) 0px 8px 16px 0px'
		);
		expect( await computed( card, 'translate' ) ).toBe( '0px -6px' );

		await page.mouse.move( 1, 1 );
		expect( await computed( card, 'background-color' ) ).toBe(
			'rgb(240, 240, 240)'
		);
		expect( await computed( card, 'translate' ) ).toBe( 'none' );
	} );

	test( 'with reduced motion the card changes colour on hover but does not lift', async ( {
		page,
	} ) => {
		await page.emulateMedia( { reducedMotion: 'reduce' } );
		await page.goto( link );
		const card = page.locator( '#card' );
		const box = await page.locator( '#card h2' ).boundingBox();

		await page.mouse.move( box.x + 10, box.y + box.height / 2 );
		expect( await computed( card, 'background-color' ) ).toBe(
			'rgb(255, 255, 204)'
		);
		expect( await computed( card, 'translate' ) ).toBe( 'none' );
	} );

	test( 'keyboard: the card link, then its button; focus shows the hover state and a ring', async ( {
		page,
	} ) => {
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.goto( link );
		const card = page.locator( '#card' );
		const cardLink = card.locator(
			'> .wp-block-zealblocks-container__link'
		);

		await tabTo( page, cardLink );
		expect( await computed( card, 'outline-style' ) ).toBe( 'solid' );
		expect( await computed( card, 'background-color' ) ).toBe(
			'rgb(255, 255, 204)'
		);

		await page.keyboard.press( 'Tab' );
		await expect( page.locator( '#buy' ) ).toBeFocused();
		// Focus inside the card still shows its hover state, without the ring.
		expect( await computed( card, 'translate' ) ).toBe( '0px -6px' );
		expect( await computed( card, 'outline-style' ) ).toBe( 'none' );
	} );

	test( 'reverse order follows each device, and Mobile undoes it', async ( {
		page,
	} ) => {
		const order = () =>
			page.locator( '#row p' ).evaluateAll( ( items ) =>
				items
					.map( ( item ) => [
						item.textContent,
						item.getBoundingClientRect(),
					] )
					.sort(
						( a, b ) =>
							a[ 1 ].left - b[ 1 ].left || a[ 1 ].top - b[ 1 ].top
					)
					.map( ( [ text ] ) => text )
			);

		await page.goto( link );
		expect(
			await computed( page.locator( '#row' ), 'flex-direction' )
		).toBe( 'row-reverse' );
		expect( await order() ).toEqual( [ 'Three', 'Two', 'One' ] );

		// Tablet has no layer of its own, so it inherits the base.
		await page.setViewportSize( VIEWPORTS.tablet );
		expect(
			await computed( page.locator( '#row' ), 'flex-direction' )
		).toBe( 'row-reverse' );

		// Mobile: core's vertical orientation, not reversed.
		await page.setViewportSize( VIEWPORTS.mobile );
		expect(
			await computed( page.locator( '#row' ), 'flex-direction' )
		).toBe( 'column' );
		expect( await order() ).toEqual( [ 'One', 'Two', 'Three' ] );
	} );

	test( 'a grid preset: one third and two thirds, one column on mobile', async ( {
		page,
	} ) => {
		const widths = () =>
			page
				.locator( '#grid > .wp-block-zealblocks-container' )
				.evaluateAll( ( items ) =>
					items.map( ( item ) =>
						Math.round( item.getBoundingClientRect().width )
					)
				);

		await page.goto( link );
		const [ narrow, wide ] = await widths();

		expect( wide ).toBeGreaterThan( narrow * 2 );

		await page.setViewportSize( VIEWPORTS.mobile );
		const [ first, second ] = await widths();

		expect( first ).toBe( second );
		expect(
			(
				await computed(
					page.locator( '#grid' ),
					'grid-template-columns'
				)
			)
				.trim()
				.split( ' ' )
		).toHaveLength( 1 );
	} );

	test( 'max width beats the theme content width, per device; overflow applies', async ( {
		page,
	} ) => {
		await page.goto( link );
		const sized = page.locator( '#sized' );

		expect( await sized.evaluate( ( el ) => el.tagName ) ).toBe(
			'SECTION'
		);
		await expect( sized ).toHaveAttribute( 'aria-label', 'Features' );
		expect( await computed( sized, 'max-width' ) ).toBe( '400px' );
		expect( await computed( sized, 'overflow' ) ).toBe( 'hidden' );

		await page.setViewportSize( VIEWPORTS.mobile );
		expect( await computed( sized, 'max-width' ) ).toBe( '200px' );
	} );

	test( 'an unknown tag falls back to a div, and an unsafe URL makes no link', async ( {
		page,
	} ) => {
		await page.goto( link );
		const unsafe = page.locator( '#unsafe' );

		expect( await unsafe.evaluate( ( el ) => el.tagName ) ).toBe( 'DIV' );
		await expect( unsafe.locator( 'a' ) ).toHaveCount( 0 );
		await expect( unsafe ).not.toHaveClass( /has-link/ );
		await expect( page.locator( 'script#unsafe' ) ).toHaveCount( 0 );
	} );
} );
