/**
 * Container phase 2 on the front end: the overlay, the aspect ratio, the
 * background video and its pause button, and the child settings of a nested
 * Container. TC-C-30 to TC-C-45.
 *
 * The video tests use a video already in the media library and are skipped
 * when there is none: the suite never uploads to the site it runs against.
 */

const { test, expect, block, computed } = require( '../../utils' );

const paragraph = ( text ) =>
	`<!-- wp:paragraph --><p>${ text }</p><!-- /wp:paragraph -->`;

const container = ( attributes, inner ) =>
	block( 'zealblocks/container', attributes, inner );

const VIEWPORTS = {
	desktop: { width: 1280, height: 900 },
	mobile: { width: 400, height: 900 },
};

const TOGGLE = '.wp-block-zealblocks-container__video-toggle';

/**
 * A video from the media library, or null.
 *
 * @param {Object} requestUtils Request utils.
 * @return {Promise<?string>} Its URL.
 */
async function libraryVideo( requestUtils ) {
	const media = await requestUtils.rest( {
		path: '/wp/v2/media',
		params: { media_type: 'video', per_page: 1 },
	} );

	return media[ 0 ]?.source_url ?? null;
}

/**
 * The overlay's computed style.
 *
 * @param {import('@playwright/test').Locator} locator  Container.
 * @param {string}                             property CSS property.
 * @return {Promise<string>} Value on `::before`.
 */
const overlay = ( locator, property ) =>
	computed( locator, property, '::before' );

test.describe( 'Container overlay and aspect ratio', () => {
	let link;

	test.beforeEach( async ( { posts, page } ) => {
		( { link } = await posts.create(
			[
				container(
					{
						anchor: 'hero',
						style: {
							color: { background: '#223344' },
							dimensions: { aspectRatio: '16/9' },
							zealblocks: {
								overlay: '#000000',
								overlayOpacity: '0.6',
								overlayBlend: 'multiply',
								overlayHoverOpacity: '0.3',
								hoverDuration: '0ms',
							},
							'@mobile': {
								dimensions: { aspectRatio: '4/3' },
								zealblocks: { overlayOpacity: '0.8' },
							},
						},
					},
					[ paragraph( 'Hero' ) ]
				),
				container(
					{
						anchor: 'pattern',
						overlayImage: {
							url: 'https://example.org/pattern.png',
						},
						overlayImageSize: 'repeat',
						overlayImagePosition: { x: 0.25, y: 0.75 },
						style: {
							zealblocks: {
								overlay:
									'linear-gradient(135deg,#ff0000 0%,#0000ff 100%)',
							},
						},
					},
					[ paragraph( 'Pattern' ) ]
				),
				container(
					{
						anchor: 'unsafe',
						overlayImage: {
							url: 'javascript:alert(1)',
						},
						style: {
							zealblocks: {
								overlayOpacity: '2',
								overlayBlend: 'evil',
							},
						},
					},
					[ paragraph( 'Unsafe' ) ]
				),
			].join( '' ),
			{ title: 'Container overlay' }
		) );

		await page.route( 'https://example.org/**', ( route ) =>
			route.fulfill( { status: 404, body: '' } )
		);
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.setViewportSize( VIEWPORTS.desktop );
	} );

	test( 'the overlay: fill, opacity and blend per device, and its hover opacity', async ( {
		page,
	} ) => {
		await page.goto( link );
		const hero = page.locator( '#hero' );

		expect( await overlay( hero, 'background-color' ) ).toBe(
			'rgb(0, 0, 0)'
		);
		expect( await overlay( hero, 'opacity' ) ).toBe( '0.6' );
		expect( await overlay( hero, 'mix-blend-mode' ) ).toBe( 'multiply' );
		// Behind the content: the paragraph stays on top.
		expect( await overlay( hero, 'z-index' ) ).toBe( '-1' );
		expect( await computed( hero, 'isolation' ) ).toBe( 'isolate' );

		const box = await hero.boundingBox();

		await page.mouse.move( box.x + 20, box.y + 20 );
		expect( await overlay( hero, 'opacity' ) ).toBe( '0.3' );
		await page.mouse.move( 1, 1 );

		await page.setViewportSize( VIEWPORTS.mobile );
		expect( await overlay( hero, 'opacity' ) ).toBe( '0.8' );
	} );

	test( 'the overlay image tiles above the gradient, at its focal point', async ( {
		page,
	} ) => {
		await page.goto( link );
		const pattern = page.locator( '#pattern' );

		expect( await overlay( pattern, 'background-image' ) ).toMatch(
			/^url\("https:\/\/example\.org\/pattern\.png"\), linear-gradient\(/
		);
		expect( await overlay( pattern, 'background-position' ) ).toBe(
			'25% 75%, 0% 0%'
		);
		expect( await overlay( pattern, 'background-repeat' ) ).toBe(
			'repeat, repeat'
		);
	} );

	test( 'unsafe overlay values leave no overlay', async ( { page } ) => {
		await page.goto( link );
		const unsafe = page.locator( '#unsafe' );

		await expect( unsafe ).not.toHaveClass( /has-overlay/ );
		expect( await unsafe.getAttribute( 'style' ) ).toBeNull();
	} );

	test( 'the aspect ratio follows the device', async ( { page } ) => {
		await page.goto( link );
		const hero = page.locator( '#hero' );

		expect( await computed( hero, 'aspect-ratio' ) ).toBe( '16 / 9' );
		await page.setViewportSize( VIEWPORTS.mobile );
		expect( await computed( hero, 'aspect-ratio' ) ).toBe( '4 / 3' );
	} );
} );

test.describe( 'Container background video', () => {
	let link;
	let video;

	test.beforeEach( async ( { posts, page, requestUtils } ) => {
		video = await libraryVideo( requestUtils );
		test.skip( ! video, 'no video in the media library' );

		( { link } = await posts.create(
			[
				container(
					{
						anchor: 'hero',
						videoUrl: video,
						videoPosition: { x: 0.3, y: 0.4 },
						style: { dimensions: { minHeight: '300px' } },
					},
					[ paragraph( 'Hero' ) ]
				),
				container(
					{
						anchor: 'desktop-only',
						// Its own URL, so the test can tell its request apart.
						videoUrl: `${ video }?desktop-only`,
						videoOnMobile: false,
						style: { dimensions: { minHeight: '300px' } },
					},
					[ paragraph( 'Desktop only' ) ]
				),
				container(
					{
						anchor: 'not-a-video',
						videoUrl: 'https://example.org/photo.jpg',
					},
					[ paragraph( 'Not a video' ) ]
				),
			].join( '' ),
			{ title: 'Container video' }
		) );

		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await page.setViewportSize( VIEWPORTS.desktop );
	} );

	test( 'plays muted behind the content, from its focal point, with no autoplay attribute', async ( {
		page,
	} ) => {
		await page.goto( link );
		const element = page.locator( '#hero > video' );

		expect( await element.getAttribute( 'autoplay' ) ).toBeNull();
		await expect( element ).toHaveAttribute( 'src', video );
		await expect
			.poll( () => element.evaluate( ( el ) => el.paused ) )
			.toBe( false );
		expect(
			await element.evaluate( ( el ) => [
				el.muted,
				el.loop,
				window.getComputedStyle( el ).zIndex,
				window.getComputedStyle( el ).objectPosition,
			] )
		).toEqual( [ true, true, '-2', '30% 40%' ] );
	} );

	test( 'the pause button pauses and resumes, and says which it will do', async ( {
		page,
	} ) => {
		await page.goto( link );
		const element = page.locator( '#hero > video' );
		const toggle = page.locator( `#hero > ${ TOGGLE }` );

		await expect( toggle ).toBeVisible();
		await expect
			.poll( () => element.evaluate( ( el ) => el.paused ) )
			.toBe( false );
		await expect( toggle ).toHaveAccessibleName( 'Pause background video' );

		await toggle.click();
		expect( await element.evaluate( ( el ) => el.paused ) ).toBe( true );
		await expect( toggle ).toHaveAccessibleName( 'Play background video' );

		await toggle.press( 'Enter' );
		await expect
			.poll( () => element.evaluate( ( el ) => el.paused ) )
			.toBe( false );
	} );

	test( 'off on mobile: hidden, and the file is never requested', async ( {
		browser,
	} ) => {
		const context = await browser.newContext( {
			viewport: VIEWPORTS.mobile,
			reducedMotion: 'no-preference',
		} );
		const page = await context.newPage();
		const requested = [];

		page.on( 'request', ( request ) => {
			if ( request.url().endsWith( '?desktop-only' ) ) {
				requested.push( request.url() );
			}
		} );

		await page.goto( link );
		await page.locator( '#desktop-only' ).scrollIntoViewIfNeeded();
		// The other container may still play its own copy on mobile.
		const hidden = page.locator( '#desktop-only > video' );

		expect( await computed( hidden, 'display' ) ).toBe( 'none' );
		expect( await hidden.getAttribute( 'src' ) ).toBeNull();
		expect(
			await computed(
				page.locator( `#desktop-only > ${ TOGGLE }` ),
				'display'
			)
		).toBe( 'none' );
		expect(
			await page.locator( '#hero > video' ).getAttribute( 'src' )
		).toBe( video );
		expect( requested ).toEqual( [] );
		await context.close();
	} );

	test( 'reduced motion: the poster stays, nothing downloads, and the button offers to play', async ( {
		browser,
	} ) => {
		const context = await browser.newContext( {
			viewport: VIEWPORTS.desktop,
			reducedMotion: 'reduce',
		} );
		const page = await context.newPage();

		await page.goto( link );
		const element = page.locator( '#hero > video' );
		const toggle = page.locator( `#hero > ${ TOGGLE }` );

		await expect( toggle ).toHaveAccessibleName( 'Play background video' );
		expect( await element.getAttribute( 'src' ) ).toBeNull();

		await toggle.click();
		await expect
			.poll( () => element.evaluate( ( el ) => el.paused ) )
			.toBe( false );
		await context.close();
	} );

	test( 'without JavaScript nothing plays and there is no dead button', async ( {
		browser,
	} ) => {
		const context = await browser.newContext( {
			javaScriptEnabled: false,
		} );
		const page = await context.newPage();

		await page.goto( link );
		expect(
			await page.locator( '#hero > video' ).getAttribute( 'src' )
		).toBeNull();
		await expect( page.locator( `#hero > ${ TOGGLE }` ) ).toBeHidden();
		await context.close();
	} );

	test( 'a file that is not a video makes no video', async ( { page } ) => {
		await page.goto( link );
		await expect( page.locator( '#not-a-video video' ) ).toHaveCount( 0 );
		await expect( page.locator( '#not-a-video' ) ).not.toHaveClass(
			/has-video/
		);
	} );
} );

test.describe( 'Container child settings', () => {
	let link;

	test.beforeEach( async ( { posts, page } ) => {
		( { link } = await posts.create(
			[
				container(
					{
						anchor: 'grid',
						layout: { type: 'grid', columnCount: 2 },
					},
					[
						container(
							{
								anchor: 'card',
								layout: { type: 'constrained' },
								style: {
									spacing: {
										padding: {
											top: '30px',
											bottom: '30px',
										},
									},
								},
							},
							[
								container(
									{
										anchor: 'badge',
										layout: { type: 'constrained' },
										style: {
											zealblocks: {
												position: 'absolute',
												positionTop: '-10px',
												positionRight: '-10px',
											},
											'@mobile': {
												zealblocks: {
													position: 'relative',
													positionTop: '0px',
													positionRight: '0px',
												},
											},
										},
									},
									[ paragraph( 'Popular' ) ]
								),
								paragraph( 'Card' ),
							]
						),
						container(
							{
								anchor: 'other',
								layout: { type: 'constrained' },
							},
							[ paragraph( 'Other' ) ]
						),
					]
				),
				container(
					{
						anchor: 'row',
						layout: { type: 'flex', flexWrap: 'nowrap' },
						style: { dimensions: { minHeight: '200px' } },
					},
					[
						container( { anchor: 'r1' }, [ paragraph( 'R1' ) ] ),
						container(
							{
								anchor: 'r2',
								style: {
									'@mobile': {
										zealblocks: { order: '-9999' },
									},
								},
							},
							[ paragraph( 'R2' ) ]
						),
						container(
							{
								anchor: 'r3',
								style: { zealblocks: { alignSelf: 'end' } },
							},
							[ paragraph( 'R3' ) ]
						),
					]
				),
			].join( '' ),
			{ title: 'Container child settings' }
		) );

		await page.setViewportSize( VIEWPORTS.desktop );
	} );

	test( 'a badge placed absolutely sits over its card corner, and back in flow on mobile', async ( {
		page,
	} ) => {
		const offsets = () =>
			page.evaluate( () => {
				const badge = document.querySelector( '#badge' );
				const card = document
					.querySelector( '#card' )
					.getBoundingClientRect();
				const own = badge.getBoundingClientRect();

				return [
					window.getComputedStyle( badge ).position,
					Math.round( own.top - card.top ),
					Math.round( card.right - own.right ),
				];
			} );

		await page.goto( link );
		expect( await offsets() ).toEqual( [ 'absolute', -10, -10 ] );

		await page.setViewportSize( VIEWPORTS.mobile );
		expect( ( await offsets() )[ 0 ] ).toBe( 'relative' );
	} );

	test( 'order moves a child first on mobile only; align self places one at the end', async ( {
		page,
	} ) => {
		const order = () =>
			page
				.locator( '#row > .wp-block-zealblocks-container' )
				.evaluateAll( ( items ) =>
					items
						.map( ( item ) => [
							item.id,
							item.getBoundingClientRect(),
						] )
						.sort(
							( a, b ) =>
								a[ 1 ].left - b[ 1 ].left ||
								a[ 1 ].top - b[ 1 ].top
						)
						.map( ( [ id ] ) => id )
				);

		await page.goto( link );
		expect( await order() ).toEqual( [ 'r1', 'r2', 'r3' ] );
		expect(
			await page.evaluate(
				() =>
					document.querySelector( '#row' ).getBoundingClientRect()
						.bottom -
					document.querySelector( '#r3' ).getBoundingClientRect()
						.bottom
			)
		).toBe( 0 );

		await page.setViewportSize( VIEWPORTS.mobile );
		expect( ( await order() )[ 0 ] ).toBe( 'r2' );
	} );
} );
