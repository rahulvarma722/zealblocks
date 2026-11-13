/**
 * Button icon rotation, icon-only buttons and the hover icon on the front end:
 * TC-B-36 to TC-B-40.
 */

const { test, expect, block, computed, tabTo } = require( '../../utils' );

/**
 * The visible children of a button, left to right, by their BEM suffix.
 *
 * @param {import('@playwright/test').Locator} button The button.
 * @return {Promise<string>} e.g. 'icon | text'.
 */
function visibleOrder( button ) {
	return button.evaluate( ( element ) =>
		[ ...element.children ]
			.filter(
				( child ) => window.getComputedStyle( child ).display !== 'none'
			)
			.map( ( child ) => ( {
				name: [ ...child.classList ]
					.find( ( name ) =>
						name.startsWith( 'wp-block-zealblocks-button__' )
					)
					.replace( 'wp-block-zealblocks-button__', '' ),
				x: child.getBoundingClientRect().x,
			} ) )
			.sort( ( a, b ) => a.x - b.x )
			.map( ( child ) => child.name )
			.join( ' | ' )
	);
}

const button = ( text, attributes ) =>
	block( 'zealblocks/button', {
		text,
		url: 'https://example.org/',
		...attributes,
	} );

test.describe( 'Button icon options', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			block( 'zealblocks/buttons', {}, [
				button( 'Rotated', {
					icon: 'arrow-right',
					iconRotation: 90,
					anchor: 'rotated',
				} ),
				button( 'Mirrored', {
					icon: 'arrow-right',
					iconRotation: 45,
					flipForRTL: true,
					anchor: 'mirrored',
				} ),
				button( 'Hover right', {
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					anchor: 'hover-right',
				} ),
				button( 'Both left', {
					icon: 'heart',
					iconPosition: 'left',
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					hoverIconPosition: 'left',
					anchor: 'both-left',
				} ),
				button( 'Icon left, hover right', {
					icon: 'heart',
					iconPosition: 'left',
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					anchor: 'left-right',
				} ),
				button( 'Icon right, hover left', {
					icon: 'heart',
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					hoverIconPosition: 'left',
					anchor: 'right-left',
				} ),
				button( 'Download', {
					icon: 'heart',
					showText: false,
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					hoverIconAriaLabel: 'Learn more',
					anchor: 'icon-only',
				} ),
			] ),
			{ title: 'Button icon options' }
		) );
	} );

	test( 'rotation turns the icon, and RTL mirrors the rotated icon whole', async ( {
		page,
	} ) => {
		await page.goto( link );
		const rotated = page.locator( '#rotated svg' );
		const mirrored = page.locator( '#mirrored svg' );

		expect( await computed( rotated, 'transform' ) ).toBe(
			'matrix(0, 1, -1, 0, 0, 0)'
		);

		// scaleX(-1) after rotate(45deg): down-right becomes down-left.
		await page.evaluate( () =>
			document.documentElement.setAttribute( 'dir', 'rtl' )
		);
		expect( await computed( mirrored, 'transform' ) ).toBe(
			'matrix(-0.707107, 0.707107, 0.707107, 0.707107, 0, 0)'
		);
		// No flip toggle: the rotation stays as authored in RTL.
		expect( await computed( rotated, 'transform' ) ).toBe(
			'matrix(0, 1, -1, 0, 0, 0)'
		);
	} );

	for ( const [ id, rest, hover ] of [
		[ 'hover-right', 'text', 'text | hover-icon' ],
		[ 'both-left', 'icon | text', 'hover-icon | text' ],
		[ 'left-right', 'icon | text', 'text | hover-icon' ],
		[ 'right-left', 'text | icon', 'hover-icon | text' ],
	] ) {
		test( `hover icon side: ${ id }`, async ( { page } ) => {
			await page.goto( link );
			const target = page.locator( `#${ id }` );

			expect( await visibleOrder( target ) ).toBe( rest );
			await target.hover();
			expect( await visibleOrder( target ) ).toBe( hover );
		} );
	}

	test( 'icon only: no text, the text names it, the hover label swaps on hover and focus', async ( {
		page,
	} ) => {
		await page.goto( link );
		const iconOnly = page.locator( '#icon-only' );

		await expect(
			iconOnly.locator( '.wp-block-zealblocks-button__text' )
		).toHaveCount( 0 );
		await expect( iconOnly ).toHaveAttribute( 'aria-label', 'Download' );
		expect( await visibleOrder( iconOnly ) ).toBe( 'icon' );

		await iconOnly.hover();
		await expect( iconOnly ).toHaveAttribute( 'aria-label', 'Learn more' );
		expect( await visibleOrder( iconOnly ) ).toBe( 'hover-icon' );

		await page.mouse.move( 0, 0 );
		await expect( iconOnly ).toHaveAttribute( 'aria-label', 'Download' );

		await tabTo( page, iconOnly );
		await expect( iconOnly ).toHaveAttribute( 'aria-label', 'Learn more' );
		await page.keyboard.press( 'Tab' );
		await expect( iconOnly ).toHaveAttribute( 'aria-label', 'Download' );
	} );

	test( 'the hover label script loads only on a page that uses it', async ( {
		page,
		posts,
	} ) => {
		const script = 'script[src*="hover-label-view"]';

		await page.goto( link );
		await expect( page.locator( script ) ).toHaveCount( 1 );

		const other = await posts.create(
			block( 'zealblocks/buttons', {}, [
				button( 'Hover icon beside text', {
					showIconOnHover: true,
					hoverIcon: 'arrow-right',
					hoverIconAriaLabel: 'Ignored beside text',
				} ),
			] ),
			{ title: 'No hover label' }
		);

		await page.goto( other.link );
		await expect( page.locator( script ) ).toHaveCount( 0 );
	} );
} );
