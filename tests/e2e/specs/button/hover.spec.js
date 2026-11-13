/**
 * Button hover and focus on the front end: TC-HV-01 to TC-HV-03, TC-B-30 to
 * TC-B-35, TC-B-43.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

const STYLE = {
	color: { text: '#ffffff', background: '#2e6bd1' },
	border: { width: '2px', style: 'solid', color: '#2e6bd1' },
	zealblocks: {
		textHover: '#111111',
		backgroundHover: '#ffcc00',
		borderHover: '#ff0000',
		iconColor: '#00ff00',
		iconHover: '#0000ff',
		hoverDuration: '0ms',
		shadowHoverX: '0px',
		shadowHoverY: '6px',
		shadowHoverBlur: '12px',
		shadowHoverSpread: '0px',
		shadowHoverColor: 'rgba(0, 0, 0, 0.5)',
	},
};

test.describe( 'Button hover and focus', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			block( 'zealblocks/buttons', {}, [
				block( 'zealblocks/button', {
					text: 'Styled',
					url: 'https://example.org/',
					icon: 'arrow-right',
					anchor: 'styled',
					style: STYLE,
				} ),
				block( 'zealblocks/button', {
					text: 'Tag button',
					anchor: 'tag-button',
					style: STYLE,
				} ),
				block( 'zealblocks/button', {
					text: 'Plain',
					url: 'https://example.org/b',
					anchor: 'plain',
				} ),
			] ),
			{ title: 'Button hover' }
		) );
	} );

	/**
	 * Reads what hover changes.
	 *
	 * @param {import('@playwright/test').Locator} button The button.
	 * @return {Promise<Object>} Computed values.
	 */
	async function read( button ) {
		const icon = button.locator( '.wp-block-zealblocks-button__icon' );

		return {
			color: await computed( button, 'color' ),
			background: await computed( button, 'background-color' ),
			border: await computed( button, 'border-top-color' ),
			shadow: await computed( button, 'box-shadow' ),
			icon: ( await icon.count() )
				? await computed( icon, 'color' )
				: null,
		};
	}

	const REST = {
		color: 'rgb(255, 255, 255)',
		background: 'rgb(46, 107, 209)',
		border: 'rgb(46, 107, 209)',
		shadow: 'none',
		icon: 'rgb(0, 255, 0)',
	};

	const HOVER = {
		color: 'rgb(17, 17, 17)',
		background: 'rgb(255, 204, 0)',
		border: 'rgb(255, 0, 0)',
		shadow: 'rgba(0, 0, 0, 0.5) 0px 6px 12px 0px',
		icon: 'rgb(0, 0, 255)',
	};

	test( 'mouse hover applies every hover value, and leaving restores them', async ( {
		page,
	} ) => {
		await page.goto( link );
		const button = page.locator( '#styled' );

		expect( await read( button ) ).toEqual( REST );

		await button.hover();
		expect( await read( button ) ).toEqual( HOVER );

		await page.mouse.move( 0, 0 );
		expect( await read( button ) ).toEqual( REST );
	} );

	test( 'keyboard focus applies the same values (:focus-visible)', async ( {
		page,
	} ) => {
		await page.goto( link );
		const button = page.locator( '#styled' );

		await tabTo( page, button );
		expect( await read( button ) ).toEqual( HOVER );
	} );

	test( 'a mouse click on a <button> does not leave the hover values on', async ( {
		page,
	} ) => {
		await page.goto( link );
		const button = page.locator( '#tag-button' );

		await button.click();
		await page.mouse.move( 0, 0 );

		await expect( button ).toBeFocused();
		expect( await computed( button, 'background-color' ) ).toBe(
			REST.background
		);
	} );

	test( 'a button without hover styling keeps its look on hover', async ( {
		page,
	} ) => {
		await page.goto( link );
		const plain = page.locator( '#plain' );
		const before = await computed( plain, 'color' );

		await plain.hover();
		expect( await computed( plain, 'color' ) ).toBe( before );
		expect( await computed( plain, 'text-decoration-line' ) ).toBe(
			'none'
		);
	} );
} );
