/**
 * Everything that changes by device, at the breakpoint edges: TC-PD-05,
 * TC-X-20, TC-X-21 (z-index), TC-X-50 (core's hide per device).
 *
 * Core's viewport media queries: Mobile is `width <= 480px`, Tablet
 * `480px < width <= 782px`, Desktop everything wider. 480/481 and 782/783 are
 * the edges either side of each breakpoint.
 */

const { test, expect, block, computed } = require( '../../utils' );

const WIDTHS = [
	[ 480, 'mobile' ],
	[ 481, 'tablet' ],
	[ 782, 'tablet' ],
	[ 783, 'desktop' ],
];

const hiddenOn = ( viewport ) => ( {
	metadata: { blockVisibility: { viewport: { [ viewport ]: false } } },
} );

test.describe( 'Per device', () => {
	let link;

	test.beforeEach( async ( { posts } ) => {
		( { link } = await posts.create(
			[
				block(
					'zealblocks/buttons',
					{
						anchor: 'group',
						style: {
							zealblocks: { zIndex: '5' },
							'@mobile': { zealblocks: { zIndex: '-2' } },
						},
					},
					[
						block( 'zealblocks/button', {
							text: 'Sized',
							url: 'https://example.org/',
							anchor: 'sized',
							style: {
								zealblocks: { width: '300px' },
								'@tablet': { zealblocks: { width: '200px' } },
								'@mobile': { zealblocks: { width: '100px' } },
							},
						} ),
					]
				),
				block( 'zealblocks/text', {
					content: 'Hidden on phones',
					anchor: 'text-no-mobile',
					...hiddenOn( 'mobile' ),
				} ),
				block( 'zealblocks/icon', {
					icon: 'heart',
					anchor: 'icon-no-desktop',
					...hiddenOn( 'desktop' ),
				} ),
				block(
					'zealblocks/buttons',
					{ anchor: 'group-no-tablet', ...hiddenOn( 'tablet' ) },
					[
						block( 'zealblocks/button', {
							text: 'In a group hidden on tablets',
							url: 'https://example.org/',
						} ),
					]
				),
				block( 'zealblocks/buttons', {}, [
					block( 'zealblocks/button', {
						text: 'Icon button hidden on phones',
						url: 'https://example.org/',
						icon: 'arrow-right',
						anchor: 'button-no-mobile',
						...hiddenOn( 'mobile' ),
					} ),
				] ),
			].join( '' ),
			{ title: 'Per device' }
		) );
	} );

	for ( const [ width, band ] of WIDTHS ) {
		test( `${ width }px is ${ band }`, async ( { page } ) => {
			await page.setViewportSize( { width, height: 900 } );
			await page.goto( link );

			const display = ( id ) =>
				computed( page.locator( `#${ id }` ), 'display' );

			// Button width, one value per band (TC-PD-05).
			expect( await computed( page.locator( '#sized' ), 'width' ) ).toBe(
				{ mobile: '100px', tablet: '200px', desktop: '300px' }[ band ]
			);

			// Z-index: the base layer, and Mobile's own (TC-X-20, TC-X-21).
			expect(
				await computed( page.locator( '#group' ), 'z-index' )
			).toBe( 'mobile' === band ? '-2' : '5' );
			expect(
				await computed( page.locator( '#group' ), 'position' )
			).toBe( 'relative' );

			// Core's hide per device, on each block (TC-X-50).
			expect( 'none' === ( await display( 'text-no-mobile' ) ) ).toBe(
				'mobile' === band
			);
			expect( 'none' === ( await display( 'icon-no-desktop' ) ) ).toBe(
				'desktop' === band
			);
			expect( 'none' === ( await display( 'group-no-tablet' ) ) ).toBe(
				'tablet' === band
			);
			expect( 'none' === ( await display( 'button-no-mobile' ) ) ).toBe(
				'mobile' === band
			);
		} );
	}
} );
