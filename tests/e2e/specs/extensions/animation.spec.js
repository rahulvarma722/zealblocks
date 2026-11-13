/**
 * Entrance animation on the front end, on all four blocks: TC-X-01, TC-X-05,
 * TC-X-07 to TC-X-10, TC-X-14.
 */

const { test, expect, block, computed } = require( '../../utils' );

// wp-scripts' config reduces motion for every test; these need it on.
test.use( {
	contextOptions: { reducedMotion: 'no-preference', strictSelectors: true },
} );

const SPACER =
	'<!-- wp:spacer {"height":"2400px"} --><div style="height:2400px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->';

const animated = ( type, extra = {} ) => ( {
	animationType: type,
	animationDuration: 200,
	...extra,
} );

/**
 * Whether a block has played: the class is on and it is fully visible.
 *
 * @param {import('@playwright/test').Locator} locator Block.
 * @return {Promise<string>} 'played', or its class/opacity state.
 */
async function state( locator ) {
	const played = await locator.evaluate( ( el ) =>
		el.classList.contains( 'is-animated' )
	);
	const opacity = await computed( locator, 'opacity' );

	return played && '1' === opacity
		? 'played'
		: `${ played ? 'is-animated' : 'waiting' } / ${ opacity }`;
}

test.describe( 'Entrance animation', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			[
				block(
					'zealblocks/buttons',
					{ anchor: 'group', ...animated( 'fade-up' ) },
					[
						block( 'zealblocks/button', {
							text: 'Inner',
							url: 'https://example.org/',
							anchor: 'inner',
							...animated( 'zoom-in', { animationDelay: 100 } ),
						} ),
					]
				),
				block( 'zealblocks/icon', {
					icon: 'heart',
					anchor: 'icon',
					...animated( 'slide-left' ),
				} ),
				block( 'zealblocks/text', {
					content: 'Animated text',
					anchor: 'text',
					...animated( 'fade' ),
				} ),
				SPACER,
				block( 'zealblocks/icon', {
					icon: 'star',
					anchor: 'below',
					...animated( 'fade' ),
				} ),
				block( 'zealblocks/icon', {
					icon: 'star',
					anchor: 'repeat',
					...animated( 'fade', { animationRepeat: true } ),
				} ),
			].join( '' ),
			{ title: 'Animation' }
		) );
	} );

	test( 'blocks in view play on load, a group and its Buttons each on their own', async ( {
		page,
	} ) => {
		await page.goto( link );

		for ( const id of [ 'group', 'inner', 'icon', 'text' ] ) {
			await expect
				.poll( () => state( page.locator( `#${ id }` ) ) )
				.toBe( 'played' );
		}
	} );

	test( 'a block below the fold waits, then plays when scrolled into view', async ( {
		page,
	} ) => {
		await page.goto( link );
		const below = page.locator( '#below' );

		await page.waitForTimeout( 400 );
		expect( await state( below ) ).toBe( 'waiting / 0' );

		await below.scrollIntoViewIfNeeded();
		await expect.poll( () => state( below ) ).toBe( 'played' );
	} );

	test( 'repeat plays again after scrolling out and back', async ( {
		page,
	} ) => {
		await page.goto( link );
		const repeat = page.locator( '#repeat' );

		await repeat.scrollIntoViewIfNeeded();
		await expect.poll( () => state( repeat ) ).toBe( 'played' );

		await page.evaluate( () => window.scrollTo( 0, 0 ) );
		await expect
			.poll( () =>
				repeat.evaluate( ( el ) =>
					el.classList.contains( 'is-animated' )
				)
			)
			.toBe( false );

		await repeat.scrollIntoViewIfNeeded();
		await expect.poll( () => state( repeat ) ).toBe( 'played' );
	} );

	test( 'reduced motion: everything is visible and nothing moves', async ( {
		page,
	} ) => {
		await page.emulateMedia( { reducedMotion: 'reduce' } );
		await page.goto( link );

		for ( const id of [ 'group', 'icon', 'below' ] ) {
			const locator = page.locator( `#${ id }` );

			expect( await computed( locator, 'opacity' ) ).toBe( '1' );
			expect( await computed( locator, 'animation-name' ) ).toBe(
				'none'
			);
		}
	} );

	test( 'no IntersectionObserver: everything is shown at once', async ( {
		page,
	} ) => {
		await page.addInitScript( () => {
			delete window.IntersectionObserver;
		} );
		await page.goto( link );

		await expect
			.poll( () => state( page.locator( '#below' ) ) )
			.toBe( 'played' );
	} );

	test( 'JavaScript off: everything is visible', async ( { browser } ) => {
		const context = await browser.newContext( {
			javaScriptEnabled: false,
		} );
		const page = await context.newPage();

		await page.goto( link );
		for ( const id of [ 'group', 'icon', 'below' ] ) {
			expect(
				await computed( page.locator( `#${ id }` ), 'opacity' )
			).toBe( '1' );
		}

		await context.close();
	} );

	test( 'the script loads once, and not on a page with nothing animated', async ( {
		page,
		posts,
	} ) => {
		const script = 'script[src*="animation-view"]';

		await page.goto( link );
		await expect( page.locator( script ) ).toHaveCount( 1 );

		const still = await posts.create(
			block( 'zealblocks/icon', { icon: 'heart' } ),
			{ title: 'Not animated' }
		);

		await page.goto( still.link );
		await expect( page.locator( script ) ).toHaveCount( 0 );
	} );
} );
