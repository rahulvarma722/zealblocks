/**
 * The List on the published page: per-device values at the breakpoints,
 * wrapping, narrow screens, right-to-left, a block theme, the keyboard.
 * The posts are written as markup, as the editor saves them; the controls
 * that make that markup are operated in controls.spec.js. TC-LS-60 to
 * TC-LS-66.
 */

const { test, expect, block, computed } = require( '../../utils' );

const LOCKED = { move: true, remove: true };

/**
 * An item's markup: an Icon, and a Container holding a Text and more.
 *
 * @param {string}   text  The Text's content.
 * @param {string[]} extra Markup after the Text, in the Container.
 * @return {string} Markup.
 */
const item = ( text, extra = [] ) =>
	block( 'zealblocks/list-item', {}, [
		block( 'zealblocks/icon', { icon: 'check', lock: LOCKED } ),
		block(
			'zealblocks/container',
			{
				layout: { type: 'default' },
				style: { spacing: { blockGap: '0.25em' } },
				lock: LOCKED,
			},
			[ block( 'zealblocks/text', { content: text } ), ...extra ]
		),
	] );

const list = ( attributes, items ) =>
	block( 'zealblocks/list', attributes, items );

// The same content as a core List, to compare spacing with.
const coreList = ( anchor ) =>
	`<!-- wp:list {"anchor":"${ anchor }"} --><ul id="${ anchor }" class="wp-block-list">` +
	'<!-- wp:list-item --><li>One<!-- wp:list --><ul class="wp-block-list"><!-- wp:list-item --><li>Nested</li><!-- /wp:list-item --></ul><!-- /wp:list --></li><!-- /wp:list-item -->' +
	'<!-- wp:list-item --><li>Two</li><!-- /wp:list-item -->' +
	'</ul><!-- /wp:list -->';

const ourList = ( anchor ) =>
	list( { anchor }, [
		item( 'One', [ list( {}, [ item( 'Nested' ) ] ) ] ),
		item( 'Two' ),
	] );

/**
 * The distance from each line of text to the next, in a list.
 *
 * @param {import('@playwright/test').Locator} locator The list.
 * @return {Promise<number[]>} Pixels, rounded.
 */
const pitches = ( locator ) =>
	locator.evaluate( ( element ) => {
		const tops = [];
		const walk = ( node ) => {
			node.childNodes.forEach( ( child ) => {
				if ( 3 === child.nodeType && child.textContent.trim() ) {
					const range = document.createRange();

					range.selectNodeContents( child );
					tops.push( range.getClientRects()[ 0 ].top );
				} else if ( 1 === child.nodeType ) {
					walk( child );
				}
			} );
		};

		walk( element );

		return tops
			.slice( 1 )
			.map( ( top, i ) => Math.round( top - tops[ i ] ) );
	} );

/**
 * For each item of a list: its SVG's middle against its first line's middle,
 * and where the icon sits against the text.
 *
 * @param {import('@playwright/test').Locator} locator The list.
 * @return {Promise<Object[]>} One entry per item, nested ones included.
 */
const icons = ( locator ) =>
	locator.evaluate( ( element ) =>
		[ ...element.querySelectorAll( 'li' ) ].map( ( li ) => {
			const icon = li.querySelector(
				':scope > .wp-block-zealblocks-icon'
			);
			const svg = icon.querySelector( 'svg' ).getBoundingClientRect();
			const text = li.querySelector(
				':scope > .wp-block-zealblocks-container > p'
			);
			const box = text.getBoundingClientRect();
			const line = parseFloat(
				window.getComputedStyle( text ).lineHeight
			);

			return {
				offset: svg.top + svg.height / 2 - ( box.top + line / 2 ),
				iconLeft: Math.round( icon.getBoundingClientRect().left ),
				iconRight: Math.round( icon.getBoundingClientRect().right ),
				textLeft: Math.round( box.left ),
				textRight: Math.round( box.right ),
				textMargins: window.getComputedStyle( text ).margin,
			};
		} )
	);

test.describe( 'List on the page', () => {
	test( 'per-device values switch at 480/481 and 782/783 (TC-LS-60)', async ( {
		page,
		posts,
	} ) => {
		const { link } = await posts.create(
			list(
				{
					anchor: 'devices',
					style: {
						zealblocks: {
							itemGap: '20px',
							iconSize: '24px',
							iconGap: '16px',
						},
						'@tablet': {
							zealblocks: {
								itemGap: '12px',
								iconSize: '20px',
								iconGap: '10px',
							},
						},
						'@mobile': {
							zealblocks: {
								itemGap: '6px',
								iconSize: '14px',
								iconGap: '4px',
							},
						},
					},
				},
				[ item( 'A' ), item( 'B' ) ]
			),
			{ title: 'List breakpoints' }
		);

		await page.goto( link );
		const measure = () =>
			page.locator( '#devices' ).evaluate( ( element ) => {
				const [ first, second ] = element.children;
				const icon = first.querySelector( '.wp-block-zealblocks-icon' );
				const body = first.querySelector(
					'.wp-block-zealblocks-container'
				);

				return [
					Math.round(
						second.getBoundingClientRect().top -
							first.getBoundingClientRect().bottom
					),
					Math.round( icon.getBoundingClientRect().width ),
					Math.round(
						body.getBoundingClientRect().left -
							icon.getBoundingClientRect().right
					),
				];
			} );

		for ( const [ width, expected ] of [
			[ 1280, [ 20, 24, 16 ] ],
			[ 783, [ 20, 24, 16 ] ],
			[ 782, [ 12, 20, 10 ] ],
			[ 481, [ 12, 20, 10 ] ],
			[ 480, [ 6, 14, 4 ] ],
			[ 360, [ 6, 14, 4 ] ],
		] ) {
			await page.setViewportSize( { width, height: 900 } );
			expect( [ width, await measure() ] ).toEqual( [ width, expected ] );
		}
	} );

	test( 'long text wraps beside the icon; 360px wide, three levels deep, nothing overflows (TC-LS-61, TC-LS-62)', async ( {
		page,
		posts,
	} ) => {
		const long =
			'A long item that has to wrap onto several lines on a phone, so the second and third lines must start where the first one did, not under the icon.';
		const { link } = await posts.create(
			list( { anchor: 'deep' }, [
				item( long, [
					list( {}, [
						item( long, [ list( {}, [ item( long ) ] ) ] ),
					] ),
				] ),
			] ),
			{ title: 'List wrapping' }
		);

		await page.setViewportSize( { width: 360, height: 800 } );
		await page.goto( link );

		const lines = await page.locator( '#deep' ).evaluate( ( element ) =>
			[ ...element.querySelectorAll( 'p' ) ].map( ( text ) => {
				const range = document.createRange();

				range.selectNodeContents( text );
				const rects = [ ...range.getClientRects() ];

				return {
					count: new Set(
						rects.map( ( rect ) => Math.round( rect.top ) )
					).size,
					lefts: new Set(
						rects.map( ( rect ) => Math.round( rect.left ) )
					).size,
				};
			} )
		);

		// Every text wraps, and all its lines start at one left edge.
		lines.forEach( ( { count, lefts } ) => {
			expect( count ).toBeGreaterThan( 1 );
			expect( lefts ).toBe( 1 );
		} );

		( await icons( page.locator( '#deep' ) ) ).forEach( ( one ) => {
			expect( one.textLeft ).toBeGreaterThan( one.iconRight );
			expect( Math.abs( one.offset ) ).toBeLessThan( 1 );
		} );

		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth
			)
		).toBe( true );
	} );

	test( 'right to left: the icon on the right, nesting from the right (TC-LS-63)', async ( {
		page,
		posts,
	} ) => {
		const { link } = await posts.create( ourList( 'rtl' ), {
			title: 'List RTL',
		} );

		await page.goto( link );
		await page.evaluate( () => {
			document.documentElement.dir = 'rtl';
		} );

		const [ one, nested, two ] = await icons( page.locator( '#rtl' ) );

		[ one, nested, two ].forEach( ( entry ) => {
			expect( entry.iconLeft ).toBeGreaterThanOrEqual( entry.textRight );
			expect( Math.abs( entry.offset ) ).toBeLessThan( 1 );
		} );
		// Nested: further in from the right, under its parent's text.
		expect( nested.iconRight ).toBeLessThan( one.iconLeft );
		expect( one.iconRight ).toBe( two.iconRight );
	} );

	test( 'on Astra spaced like a core List; on a block theme, no stray margins (TC-LS-64)', async ( {
		page,
		posts,
	} ) => {
		const { link } = await posts.create(
			ourList( 'ours' ) + coreList( 'core' ),
			{ title: 'List against core' }
		);
		const url = new URL( link );
		const checkIcons = async () => {
			( await icons( page.locator( '#ours' ) ) ).forEach( ( one ) => {
				expect( Math.abs( one.offset ) ).toBeLessThan( 1 );
				expect( one.textMargins ).toBe( '0px' );
			} );
			expect(
				await computed( page.locator( '#ours' ), 'list-style-type' )
			).toBe( 'none' );
		};

		// Astra styles every `li`, so both lists get its rhythm.
		await page.goto( url.toString() );
		const ours = await pitches( page.locator( '#ours' ) );
		const core = await pitches( page.locator( '#core' ) );

		expect( ours ).toHaveLength( core.length );
		ours.forEach( ( pitch, i ) =>
			expect( Math.abs( pitch - core[ i ] ) ).toBeLessThanOrEqual( 2 )
		);
		await checkIcons();

		/*
		 * Twenty Twenty-Five, previewed (nothing is switched on the site).
		 * Its 0.5rem between items is custom CSS for core's List only
		 * (theme.json, `core/list`), so it does not reach this block: here
		 * the List has its own rhythm, one line per item and 0.25em before
		 * a nested list, until "Space between items" is set.
		 */
		url.searchParams.set( 'wp_theme_preview', 'twentytwentyfive' );
		await page.goto( url.toString() );
		await expect( page.locator( 'body' ) ).not.toHaveClass( /ast-/ );

		const text = page.locator( '#ours p' ).first();
		const line = parseFloat( await computed( text, 'line-height' ) );
		const size = parseFloat( await computed( text, 'font-size' ) );
		const [ toNested, toNext ] = await pitches( page.locator( '#ours' ) );

		expect(
			Math.abs( toNested - ( line + size * 0.25 ) )
		).toBeLessThanOrEqual( 1 );
		expect( Math.abs( toNext - line ) ).toBeLessThanOrEqual( 1 );
		await checkIcons();
	} );

	test( 'the keyboard never stops on an icon; a link in an item is reachable (TC-LS-65)', async ( {
		browserName,
		page,
		posts,
	} ) => {
		const { link } = await posts.create(
			list( { anchor: 'keys' }, [
				item( 'One' ),
				item( 'Read <a href="https://example.org/">the guide</a>' ),
				item( 'Three' ),
			] ),
			{ title: 'List keyboard' }
		);

		await page.goto( link );
		const keys = page.locator( '#keys' );

		// Nothing in an icon can take focus.
		expect(
			await keys.evaluate(
				( element ) =>
					[
						...element.querySelectorAll(
							'.wp-block-zealblocks-icon, .wp-block-zealblocks-icon *'
						),
					].filter(
						( node ) =>
							node.tabIndex >= 0 &&
							'false' !== node.getAttribute( 'focusable' )
					).length
			)
		).toBe( 0 );
		await expect(
			keys.locator( '.wp-block-zealblocks-icon svg' ).first()
		).toHaveAttribute( 'focusable', 'false' );

		/*
		 * Walk through the list with the keyboard from just before it, and
		 * note every stop inside it. Safari moves to links with Option+Tab
		 * (plain Tab skips them unless "Press Tab to highlight each item"
		 * is on), and WebKit in Playwright does the same.
		 */
		const key = 'webkit' === browserName ? 'Alt+Tab' : 'Tab';

		await keys.evaluate( ( element ) => {
			const marker = element.ownerDocument.createElement( 'span' );

			marker.tabIndex = -1;
			element.before( marker );
			marker.focus();
			marker.remove();
		} );

		const stops = [];

		for ( let i = 0; i < 5; i++ ) {
			await page.keyboard.press( key );
			stops.push(
				await keys.evaluate( ( element ) => {
					const active = element.ownerDocument.activeElement;

					return element.contains( active )
						? active.textContent.trim() || active.tagName
						: null;
				} )
			);
		}

		// One stop in the list, the link; then out of it.
		expect( stops.filter( Boolean ) ).toEqual( [ 'the guide' ] );
		expect( stops[ 0 ] ).toBe( 'the guide' );
	} );

	test( 'axe-core: no violations on icon, numbered and nested lists, on Astra and a block theme (TC-LS-66)', async ( {
		page,
		posts,
	} ) => {
		const { link } = await posts.create(
			list( { anchor: 'a11y-icons' }, [
				item( 'Fast setup' ),
				item( 'Read <a href="https://example.org/">the guide</a>', [
					list( {}, [ item( 'Nested' ) ] ),
				] ),
			] ) +
				list(
					{
						anchor: 'a11y-numbers',
						ordered: true,
						type: 'upper-roman',
						start: 3,
					},
					[ item( 'Step' ), item( 'Step' ) ]
				),
			{ title: 'List accessibility' }
		);

		for ( const theme of [ null, 'twentytwentyfive' ] ) {
			const url = new URL( link );

			if ( theme ) {
				url.searchParams.set( 'wp_theme_preview', theme );
			}

			await page.goto( url.toString() );
			// axe-core comes with the WordPress e2e tooling.
			await page.addScriptTag( {
				path: require.resolve( 'axe-core/axe.min.js' ),
			} );

			const violations = await page.evaluate( async () => {
				const result = await window.axe.run(
					{ include: [ [ '#a11y-icons' ], [ '#a11y-numbers' ] ] },
					{
						runOnly: {
							type: 'tag',
							values: [
								'wcag2a',
								'wcag2aa',
								'wcag21a',
								'wcag21aa',
								'wcag22aa',
								'best-practice',
							],
						},
					}
				);

				return result.violations.map(
					( violation ) =>
						`${ violation.id }: ${ violation.nodes[ 0 ].target }`
				);
			} );

			expect( [ theme, violations ] ).toEqual( [ theme, [] ] );
		}
	} );
} );
