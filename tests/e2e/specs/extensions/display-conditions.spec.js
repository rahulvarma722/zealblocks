/**
 * Display conditions, decided on the server per visitor: TC-X-31 to TC-X-35,
 * TC-X-40.
 */

const { test, expect, block } = require( '../../utils' );

const LOGGED_OUT = { hideWhenLoggedOut: true };
const LOGGED_IN = { hideWhenLoggedIn: true };

test.describe( 'Display conditions', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			[
				block(
					'zealblocks/buttons',
					{ anchor: 'hidden-group', displayConditions: LOGGED_OUT },
					[
						block( 'zealblocks/button', {
							text: 'In a hidden group',
							url: 'https://example.org/',
							style: {
								zealblocks: { backgroundHover: '#0d0e0f' },
							},
						} ),
					]
				),
				block( 'zealblocks/buttons', { anchor: 'visible-group' }, [
					block( 'zealblocks/button', {
						text: 'Always',
						url: 'https://example.org/',
					} ),
					block( 'zealblocks/button', {
						text: 'Members only',
						url: 'https://example.org/',
						displayConditions: LOGGED_OUT,
					} ),
				] ),
				block( 'zealblocks/icon', {
					icon: 'heart',
					anchor: 'guests-only',
					displayConditions: LOGGED_IN,
				} ),
				block( 'zealblocks/text', {
					content: 'Firefox users miss this',
					anchor: 'not-firefox',
					displayConditions: { hideForBrowser: 'firefox' },
				} ),
			].join( '' ),
			{ title: 'Display conditions' }
		) );
	} );

	test( 'a visitor: hidden blocks are absent from the page and its source', async ( {
		visitorPage: page,
	} ) => {
		const response = await page.goto( link );
		const source = await response.text();

		await expect( page.locator( '#hidden-group' ) ).toHaveCount( 0 );
		await expect( page.locator( '#guests-only' ) ).toHaveCount( 1 );
		expect( source ).not.toContain( 'In a hidden group' );
		expect( source ).not.toContain( 'Members only' );
		// The hidden group's Button would have printed this hover rule.
		expect( source ).not.toContain( '0d0e0f' );
	} );

	test( 'a hidden Button leaves no empty slot in its group', async ( {
		visitorPage: page,
	} ) => {
		await page.goto( link );

		await expect( page.locator( '#visible-group > *' ) ).toHaveCount( 1 );
		await expect( page.locator( '#visible-group' ) ).toHaveText( 'Always' );
	} );

	test( 'a logged-in user sees the reverse', async ( { page } ) => {
		await page.goto( link );

		await expect( page.locator( '#hidden-group' ) ).toHaveCount( 1 );
		await expect( page.locator( '#visible-group > *' ) ).toHaveCount( 2 );
		await expect( page.locator( '#guests-only' ) ).toHaveCount( 0 );
	} );

	test( 'the browser condition follows the user agent the server sees', async ( {
		browser,
	} ) => {
		const visit = async ( userAgent ) => {
			const context = await browser.newContext( {
				userAgent,
				storageState: { cookies: [], origins: [] },
			} );
			const page = await context.newPage();

			await page.goto( link );
			const count = await page.locator( '#not-firefox' ).count();

			await context.close();
			return count;
		};

		expect(
			await visit(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.0; rv:128.0) Gecko/20100101 Firefox/128.0'
			)
		).toBe( 0 );
		expect(
			await visit(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
			)
		).toBe( 1 );
	} );
} );
