/**
 * The List's controls, operated the way an author does: click, type, pick.
 * Each test checks what is stored, what the canvas shows and what the
 * published page shows. The list, its items, and the Icon and Container
 * inside an item. TC-LS-40 to TC-LS-57.
 */

const { test, expect, computed } = require( '../../utils' );

const LOCKED = { move: true, remove: true };

// An item as the editor makes it: an Icon, and a Container holding a Text
// and anything after it.
const item = ( text, extra = [], icon = {} ) => ( {
	name: 'zealblocks/list-item',
	innerBlocks: [
		{
			name: 'zealblocks/icon',
			attributes: { icon: 'check', lock: LOCKED, ...icon },
		},
		{
			name: 'zealblocks/container',
			attributes: {
				layout: { type: 'default' },
				style: { spacing: { blockGap: '0.25em' } },
				lock: LOCKED,
			},
			innerBlocks: [
				{ name: 'zealblocks/text', attributes: { content: text } },
				...extra,
			],
		},
	],
} );

const list = ( attributes, items ) => ( {
	name: 'zealblocks/list',
	attributes,
	innerBlocks: items,
} );

/**
 * Starts a post with blocks, selects one, opens a tab.
 *
 * @param {Object}   fixtures        Playwright fixtures.
 * @param {Object}   fixtures.admin  Admin utils.
 * @param {Object}   fixtures.editor Editor utils.
 * @param {Object}   fixtures.page   Page.
 * @param {Object}   fixtures.posts  The posts fixture.
 * @param {Object[]} blocks          Blocks.
 * @param {number[]} path            Indexes of the block to select.
 * @param {?string}  tab             'Settings', 'Styles', or null for none.
 * @return {Promise<void>}
 */
async function setUp( { admin, editor, page, posts }, blocks, path, tab ) {
	await admin.createNewPost( { title: '[e2e] List controls' } );
	posts.track(
		await page.evaluate( () =>
			window.wp.data.select( 'core/editor' ).getCurrentPostId()
		)
	);

	for ( const block of blocks ) {
		await editor.insertBlock( block );
	}

	await selectPath( page, path );
	await editor.openDocumentSettingsSidebar();

	if ( tab ) {
		await page.getByRole( 'tab', { name: tab } ).click();
	}
}

/**
 * Selects a block by its path of indexes.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @param {number[]}                        path Indexes from the root.
 * @return {Promise<void>}
 */
function selectPath( page, path ) {
	return page.evaluate( ( indexes ) => {
		const { select, dispatch } = window.wp.data;
		let blocks = select( 'core/block-editor' ).getBlocks();
		let found;

		indexes.forEach( ( index ) => {
			found = blocks[ index ];
			blocks = found.innerBlocks;
		} );

		dispatch( 'core/block-editor' ).selectBlock( found.clientId );
	}, path );
}

/**
 * Attributes of the block at a path.
 *
 * @param {import('@playwright/test').Page} page Page.
 * @param {number[]}                        path Indexes from the root.
 * @return {Promise<Object>} Attributes.
 */
function attributesAt( page, path ) {
	return page.evaluate( ( indexes ) => {
		let blocks = window.wp.data.select( 'core/block-editor' ).getBlocks();
		let found;

		indexes.forEach( ( index ) => {
			found = blocks[ index ];
			blocks = found.innerBlocks;
		} );

		return found.attributes;
	}, path );
}

// The icon of each item of the first list, in order.
const icons = ( page ) =>
	page.evaluate( () =>
		window.wp.data
			.select( 'core/block-editor' )
			.getBlocks()[ 0 ]
			.innerBlocks.map( ( one ) => one.innerBlocks[ 0 ].attributes.icon )
	);

const inspector = ( page ) => page.locator( '.block-editor-block-inspector' );

/**
 * One inspector panel, by its heading.
 *
 * @param {import('@playwright/test').Page} page  Page.
 * @param {string}                          title e.g. 'Typography'.
 * @return {import('@playwright/test').Locator} The panel.
 */
const panel = ( page, title ) =>
	inspector( page )
		.locator( '.components-tools-panel' )
		.filter( {
			has: page.getByRole( 'heading', { name: title, exact: true } ),
		} );

/**
 * Turns on an optional control from a panel's options menu, if it is off.
 *
 * @param {import('@playwright/test').Page} page  Page.
 * @param {string}                          title e.g. 'Dimensions'.
 * @param {string}                          entry e.g. 'Z-index'.
 * @return {Promise<void>}
 */
async function showOptional( page, title, entry ) {
	await inspector( page )
		.getByRole( 'button', { name: `${ title } options` } )
		.click();
	const escaped = entry.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
	const menuItem = page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( 'menuitemcheckbox', {
			name: new RegExp( `^(?:Show |Hide and reset )?${ escaped }$` ),
		} );

	if ( 'true' !== ( await menuItem.getAttribute( 'aria-checked' ) ) ) {
		await menuItem.click();
	}

	await page.keyboard.press( 'Escape' );
}

/**
 * Opens a colour row, picks a swatch, closes it again.
 *
 * @param {import('@playwright/test').Locator} scope   Where the row is.
 * @param {string}                             control The row's name.
 * @param {number}                             index   Which swatch.
 * @return {Promise<void>}
 */
async function pickSwatch( scope, control, index = 0 ) {
	const page = scope.page();
	const content = page.locator(
		'.block-editor-panel-color-gradient-settings__dropdown-content'
	);

	await scope.getByRole( 'button', { name: control, exact: true } ).click();
	await content
		.locator( '.components-circular-option-picker__option:visible' )
		.nth( index )
		.click();
	await page.keyboard.press( 'Escape' );
	await expect( content ).toHaveCount( 0 );
}

/**
 * The rgb() a stored colour resolves to, preset or not.
 *
 * @param {import('@playwright/test').Page} page  Page (published).
 * @param {string}                          value Stored colour.
 * @return {Promise<string>} rgb().
 */
function resolveColor( page, value ) {
	return page.evaluate( ( color ) => {
		const css = color.startsWith( 'var:preset|color|' )
			? `var(--wp--preset--color--${ color.split( '|' ).pop() })`
			: color;
		const probe = document.createElement( 'span' );

		probe.style.color = css;
		document.body.appendChild( probe );
		const resolved = window.getComputedStyle( probe ).color;

		probe.remove();

		return resolved;
	}, value );
}

const publish = ( page ) =>
	page.evaluate( async () => {
		const { dispatch, select } = window.wp.data;

		dispatch( 'core/editor' ).editPost( { status: 'publish' } );
		await dispatch( 'core/editor' ).savePost();

		return select( 'core/editor' ).getPermalink();
	} );

const viewMenu = async ( page, name, role ) => {
	await page.getByRole( 'button', { name: 'View', exact: true } ).click();
	await page
		.locator( '.components-dropdown-menu__menu' )
		.getByRole( role, { name } )
		.click();
	await page.keyboard.press( 'Escape' );
};

/**
 * Runs a callback with the editor previewing a device and Responsive styles
 * on, and always puts both back.
 *
 * @param {import('@playwright/test').Page} page   Page.
 * @param {RegExp}                          device e.g. /^Mobile/.
 * @param {Function}                        run    The edits.
 * @return {Promise<void>}
 */
async function onDevice( page, device, run ) {
	await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );

	try {
		await viewMenu( page, device, 'menuitemradio' );
		await run();
	} finally {
		await viewMenu( page, /^Desktop/, 'menuitemradio' );
		await viewMenu( page, /Responsive styles/, 'menuitemcheckbox' );
	}
}

const canvas = ( page ) => page.frameLocator( 'iframe[name="editor-canvas"]' );

// Geometry of the first item of a list: its icon box, SVG, and first text.
const geometry = ( listLocator ) =>
	listLocator.evaluate( ( element ) => {
		const li = element.querySelector( ':scope > li' );
		const icon = li.querySelector( ':scope > .wp-block-zealblocks-icon' );
		const svg = icon.querySelector( 'svg' ).getBoundingClientRect();
		const body = li
			.querySelector( ':scope > .wp-block-zealblocks-container' )
			.getBoundingClientRect();
		const box = icon.getBoundingClientRect();
		const text = li.querySelector( 'p' );
		const line = parseFloat(
			text.ownerDocument.defaultView.getComputedStyle( text ).lineHeight
		);
		const textTop = text.getBoundingClientRect().top;

		return {
			iconWidth: Math.round( box.width ),
			gap: Math.round( body.left - box.right ),
			// SVG middle against the first line's middle.
			offset: svg.top + svg.height / 2 - ( textTop + line / 2 ),
			// SVG middle against the whole item's middle.
			centred:
				svg.top +
				svg.height / 2 -
				( li.getBoundingClientRect().top +
					li.getBoundingClientRect().height / 2 ),
		};
	} );

test.describe( 'List controls, operated', () => {
	test( "each preset sets every item's icon, and the canvas draws it (TC-LS-40)", async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ list( {}, [ item( 'A' ), item( 'B' ) ] ) ],
			[ 0 ],
			'Settings'
		);

		const presets = {
			Check: 'check',
			'Circle Check': 'circle-check',
			'Arrow Right': 'arrow-right',
			'Chevron Right': 'chevron-right',
			Star: 'star',
			Circle: 'circle',
			Minus: 'minus',
		};
		const drawn = new Set();

		for ( const [ label, slug ] of Object.entries( presets ) ) {
			const button = inspector( page ).getByRole( 'button', {
				name: `Icon: ${ label }`,
				exact: true,
			} );

			await button.click();
			await expect( button ).toHaveAttribute( 'aria-pressed', 'true' );
			expect( await icons( page ) ).toEqual( [ slug, slug ] );
			expect( ( await attributesAt( page, [ 0 ] ) ).icon ).toBe( slug );

			// The canvas draws each one: a different path every time.
			const path = await canvas( page )
				.locator( '.wp-block-zealblocks-list > li' )
				.first()
				.locator( 'svg path' )
				.first()
				.getAttribute( 'd' );

			drawn.add( path );
		}

		expect( drawn.size ).toBe( 7 );
	} );

	test( '"Or any icon" picks from the library for every item, and cannot be removed (TC-LS-41)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ list( { icon: 'check' }, [ item( 'A' ), item( 'B' ) ] ) ],
			[ 0 ],
			'Settings'
		);

		await expect(
			inspector( page ).getByRole( 'button', { name: /^Remove icon/ } )
		).toHaveCount( 0 );

		await inspector( page )
			.getByRole( 'button', { name: 'Replace icon: Check' } )
			.click();
		await page.getByLabel( 'Search icons' ).first().fill( 'heart' );
		await page
			.getByRole( 'dialog' )
			.getByRole( 'button', { name: 'Heart', exact: true } )
			.click();

		expect( await icons( page ) ).toEqual( [ 'heart', 'heart' ] );
		expect( ( await attributesAt( page, [ 0 ] ) ).icon ).toBe( 'heart' );
		await expect(
			inspector( page ).getByRole( 'button', {
				name: 'Replace icon: Heart',
			} )
		).toBeVisible();
	} );

	test( 'each numbering style shows in the canvas and on the page (TC-LS-42)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { ordered: true, anchor: 'styles' }, [
					item( 'A' ),
					item( 'B' ),
				] ),
			],
			[ 0 ],
			'Settings'
		);

		const select = inspector( page ).getByLabel( 'Numbering', {
			exact: true,
		} );
		const ol = canvas( page ).locator( 'ol.wp-block-zealblocks-list' );

		for ( const style of [
			'decimal-leading-zero',
			'lower-alpha',
			'upper-alpha',
			'lower-roman',
			'upper-roman',
			'decimal',
		] ) {
			await select.selectOption( style );
			await expect
				.poll( () =>
					ol.evaluate(
						( el ) =>
							el.ownerDocument.defaultView.getComputedStyle( el )
								.listStyleType
					)
				)
				.toBe( style );
		}

		await select.selectOption( 'lower-roman' );
		expect( ( await attributesAt( page, [ 0 ] ) ).type ).toBe(
			'lower-roman'
		);

		await page.goto( await publish( page ) );
		expect(
			await computed( page.locator( '#styles' ), 'list-style-type' )
		).toBe( 'lower-roman' );
	} );

	test( 'icon position: centred on a two-line item, in the canvas and on the page (TC-LS-43)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { anchor: 'centred' }, [
					item( 'First line<br>Second line<br>Third line' ),
				] ),
			],
			[ 0 ],
			'Settings'
		);

		const canvasList = canvas( page )
			.locator( '.wp-block-zealblocks-list' )
			.first();

		// The default: on the first line, not the middle of three.
		expect(
			Math.abs( ( await geometry( canvasList ) ).offset )
		).toBeLessThan( 1 );
		expect(
			Math.abs( ( await geometry( canvasList ) ).centred )
		).toBeGreaterThan( 10 );

		await inspector( page )
			.getByLabel( 'Icon position', { exact: true } )
			.selectOption( 'center' );
		expect( ( await attributesAt( page, [ 0 ] ) ).iconAlign ).toBe(
			'center'
		);
		await expect( canvasList ).toHaveClass( /\bis-icon-centred\b/ );
		expect(
			Math.abs( ( await geometry( canvasList ) ).centred )
		).toBeLessThan( 1 );

		await page.goto( await publish( page ) );
		const pageList = page.locator( '#centred' );

		await expect( pageList ).toHaveClass( /\bis-icon-centred\b/ );
		expect(
			Math.abs( ( await geometry( pageList ) ).centred )
		).toBeLessThan( 1 );
	} );

	test( 'icon size and the space after it, with Mobile values of their own (TC-LS-44)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ list( { anchor: 'sized' }, [ item( 'A' ), item( 'B' ) ] ) ],
			[ 0 ],
			'Styles'
		);

		const dimensions = panel( page, 'Dimensions' );

		await dimensions
			.getByRole( 'spinbutton', { name: 'Icon size', exact: true } )
			.fill( '24' );
		await showOptional( page, 'Dimensions', 'Space after the icon' );
		await dimensions
			.getByRole( 'spinbutton', {
				name: 'Space after the icon',
				exact: true,
			} )
			.fill( '12' );

		const canvasList = canvas( page )
			.locator( '.wp-block-zealblocks-list' )
			.first();

		await expect
			.poll( async () => {
				const { iconWidth, gap } = await geometry( canvasList );

				return [ iconWidth, gap ];
			} )
			.toEqual( [ 24, 12 ] );

		await onDevice( page, /^Mobile/, async () => {
			await dimensions
				.getByRole( 'spinbutton', {
					name: 'Icon size (Mobile)',
					exact: true,
				} )
				.fill( '16' );
			await dimensions
				.getByRole( 'spinbutton', {
					name: 'Space after the icon (Mobile)',
					exact: true,
				} )
				.fill( '4' );
		} );

		const { style } = await attributesAt( page, [ 0 ] );

		expect( style.zealblocks ).toMatchObject( {
			iconSize: '24px',
			iconGap: '12px',
		} );
		expect( style[ '@mobile' ].zealblocks ).toMatchObject( {
			iconSize: '16px',
			iconGap: '4px',
		} );

		await page.goto( await publish( page ) );
		const pageList = page.locator( '#sized' );
		const measure = async () => {
			const { iconWidth, gap, offset } = await geometry( pageList );

			expect( Math.abs( offset ) ).toBeLessThan( 1 );

			return [ iconWidth, gap ];
		};

		for ( const [ width, expected ] of [
			[ 1280, [ 24, 12 ] ],
			[ 782, [ 24, 12 ] ],
			[ 481, [ 24, 12 ] ],
			[ 480, [ 16, 4 ] ],
		] ) {
			await page.setViewportSize( { width, height: 900 } );
			expect( await measure() ).toEqual( expected );
		}
	} );

	test( 'numbers: their colour and size on the page (TC-LS-45)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { ordered: true, anchor: 'marked' }, [
					item( 'A' ),
					item( 'B' ),
				] ),
			],
			[ 0 ],
			'Styles'
		);

		await pickSwatch( panel( page, 'Color' ), 'Numbers', 1 );
		await showOptional( page, 'Dimensions', 'Number size' );
		await panel( page, 'Dimensions' )
			.getByRole( 'spinbutton', { name: 'Number size', exact: true } )
			.fill( '22' );

		const { style } = await attributesAt( page, [ 0 ] );

		expect( style.zealblocks.markerColor ).toBeTruthy();
		expect( style.zealblocks.markerSize ).toBe( '22px' );

		await page.goto( await publish( page ) );
		const first = page.locator( '#marked > li' ).first();

		expect( await computed( first, 'color', '::marker' ) ).toBe(
			await resolveColor( page, style.zealblocks.markerColor )
		);
		expect( await computed( first, 'font-size', '::marker' ) ).toBe(
			'22px'
		);
		// The text keeps its own colour and size.
		expect( await computed( first.locator( 'p' ), 'font-size' ) ).not.toBe(
			'22px'
		);
	} );

	test( "typography on the list reaches the items' text (TC-LS-46)", async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { anchor: 'typed' }, [
					item( 'Alpha' ),
					item( 'Beta' ),
				] ),
			],
			[ 0 ],
			'Styles'
		);

		const typography = panel( page, 'Typography' );

		await pickSwatch( typography, 'Color', 1 );
		await typography
			.getByRole( 'radio', { name: 'Large', exact: true } )
			.click();
		await showOptional( page, 'Typography', 'Line height' );
		await typography
			.getByRole( 'spinbutton', { name: 'Line height', exact: true } )
			.fill( '2' );
		await showOptional( page, 'Typography', 'Letter spacing' );
		await typography
			.getByRole( 'spinbutton', { name: 'Letter spacing', exact: true } )
			.fill( '2' );
		await showOptional( page, 'Typography', 'Decoration' );
		await typography
			.getByRole( 'button', { name: 'Underline', exact: true } )
			.click();
		await showOptional( page, 'Typography', 'Letter case' );
		await typography
			.getByRole( 'button', { name: 'Uppercase', exact: true } )
			.click();

		const attrs = await attributesAt( page, [ 0 ] );

		expect( attrs.fontSize ).toBe( 'large' );
		expect( attrs.style.typography ).toMatchObject( {
			lineHeight: '2',
			letterSpacing: '2px',
			textDecoration: 'underline',
			textTransform: 'uppercase',
		} );

		await page.goto( await publish( page ) );
		const text = page.locator( '#typed p' ).first();
		const size = parseFloat( await computed( text, 'font-size' ) );

		expect( await computed( text, 'color' ) ).toBe(
			await resolveColor(
				page,
				attrs.textColor
					? `var:preset|color|${ attrs.textColor }`
					: attrs.style.color.text
			)
		);
		expect( size ).toBe(
			parseFloat(
				await computed( page.locator( '#typed' ), 'font-size' )
			)
		);
		expect( parseFloat( await computed( text, 'line-height' ) ) ).toBe(
			size * 2
		);
		expect( await computed( text, 'letter-spacing' ) ).toBe( '2px' );
		expect( await computed( text, 'text-transform' ) ).toBe( 'uppercase' );
		expect(
			await computed( page.locator( '#typed' ), 'text-decoration-line' )
		).toBe( 'underline' );
		// The icon is not underlined text: it has no text to decorate.
		expect(
			await page
				.locator( '#typed > li > .wp-block-zealblocks-icon svg' )
				.count()
		).toBe( 2 );
	} );

	test( 'background, padding, margin, border and radius on the list (TC-LS-47)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ list( { anchor: 'boxed' }, [ item( 'A' ) ] ) ],
			[ 0 ],
			'Styles'
		);

		await showOptional( page, 'Background', 'Color' );
		await pickSwatch( panel( page, 'Background' ), 'Color', 2 );

		const dimensions = panel( page, 'Dimensions' );

		await dimensions
			.getByRole( 'slider', { name: 'Vertical padding' } )
			.fill( '2' );
		await dimensions
			.getByRole( 'slider', { name: 'Vertical margin' } )
			.fill( '2' );

		const border = panel( page, 'Border' );

		await border
			.getByRole( 'spinbutton', { name: 'Border width', exact: true } )
			.fill( '3' );
		await border
			.getByRole( 'spinbutton', { name: 'Border radius', exact: true } )
			.fill( '8' );

		const { style, backgroundColor } = await attributesAt( page, [ 0 ] );

		expect( backgroundColor || style.color?.background ).toBeTruthy();
		expect( style.spacing.padding.top ).toBeTruthy();
		expect( style.spacing.margin.top ).toBeTruthy();
		expect( style.border.width ).toBe( '3px' );
		// One value, stored for each corner.
		expect( Object.values( style.border.radius ) ).toEqual( [
			'8px',
			'8px',
			'8px',
			'8px',
		] );

		await page.goto( await publish( page ) );
		const ul = page.locator( '#boxed' );

		expect( await computed( ul, 'background-color' ) ).not.toBe(
			'rgba(0, 0, 0, 0)'
		);
		expect(
			parseFloat( await computed( ul, 'padding-top' ) )
		).toBeGreaterThan( 0 );
		expect(
			parseFloat( await computed( ul, 'margin-top' ) )
		).toBeGreaterThan( 0 );
		expect( await computed( ul, 'border-top-width' ) ).toBe( '3px' );
		expect( await computed( ul, 'border-top-left-radius' ) ).toBe( '8px' );
	} );

	test( 'link colour, text alignment, z-index per device and an extra class (TC-LS-48 to TC-LS-50, TC-LS-53)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { anchor: 'misc' }, [
					item( 'See <a href="https://example.org/">the docs</a>' ),
				] ),
			],
			[ 0 ],
			'Styles'
		);

		await showOptional( page, 'Elements', 'Link' );
		await pickSwatch( panel( page, 'Elements' ), 'Link', 3 );

		await showOptional( page, 'Dimensions', 'Z-index' );
		await panel( page, 'Dimensions' )
			.getByRole( 'spinbutton', { name: 'Z-index', exact: true } )
			.fill( '5' );
		await onDevice( page, /^Mobile/, async () => {
			await panel( page, 'Dimensions' )
				.getByRole( 'spinbutton', {
					name: 'Z-index (Mobile)',
					exact: true,
				} )
				.fill( '2' );
		} );

		await page.mouse.move( 10, 10 );
		await page.mouse.move( 400, 300 );
		await page
			.getByRole( 'toolbar', { name: 'Block tools' } )
			.getByRole( 'button', { name: 'Align text' } )
			.click();
		await page
			.getByRole( 'menuitemradio', { name: 'Align text center' } )
			.click();

		await page
			.getByRole( 'tab', { name: 'Advanced' } )
			.click()
			.catch( () => {} );
		await page.getByRole( 'tab', { name: 'Settings' } ).click();
		const advanced = inspector( page ).getByRole( 'button', {
			name: 'Advanced',
		} );

		if ( 'true' !== ( await advanced.getAttribute( 'aria-expanded' ) ) ) {
			await advanced.click();
		}
		await inspector( page )
			.getByLabel( 'Additional CSS class(es)', { exact: true } )
			.fill( 'is-style-features' );

		const attrs = await attributesAt( page, [ 0 ] );

		expect( attrs.className ).toBe( 'is-style-features' );
		expect( attrs.style.typography.textAlign ).toBe( 'center' );
		expect( attrs.style.elements.link.color.text ).toBeTruthy();
		expect( attrs.style.zealblocks.zIndex ).toBeTruthy();

		await page.goto( await publish( page ) );
		const ul = page.locator( '#misc' );

		await expect( ul ).toHaveClass( /\bis-style-features\b/ );
		expect( await computed( ul.locator( 'p' ), 'text-align' ) ).toBe(
			'center'
		);
		expect( await computed( ul.locator( 'a' ), 'color' ) ).toBe(
			await resolveColor( page, attrs.style.elements.link.color.text )
		);
		expect( await computed( ul, 'z-index' ) ).toBe( '5' );
		await page.setViewportSize( { width: 480, height: 900 } );
		expect( await computed( ul, 'z-index' ) ).toBe( '2' );
	} );

	test( 'animation and display conditions set on the list (TC-LS-51, TC-LS-52)', async ( {
		admin,
		browser,
		editor,
		page,
		posts,
	} ) => {
		await page.emulateMedia( { reducedMotion: 'no-preference' } );
		await setUp(
			{ admin, editor, page, posts },
			[ list( { anchor: 'shown' }, [ item( 'A' ) ] ) ],
			[ 0 ],
			'Settings'
		);

		await inspector( page )
			.getByLabel( 'Entrance animation', { exact: true } )
			.selectOption( 'fade-up' );
		await inspector( page )
			.getByLabel( 'Hide from logged-out users', { exact: true } )
			.click();

		const attrs = await attributesAt( page, [ 0 ] );

		expect( attrs.animationType ).toBe( 'fade-up' );
		expect( attrs.displayConditions ).toMatchObject( {
			hideWhenLoggedOut: true,
		} );

		const link = await publish( page );

		// Logged in: the list is there, and plays.
		await page.goto( link );
		const ul = page.locator( '#shown' );

		await ul.scrollIntoViewIfNeeded();
		await expect
			.poll( () =>
				ul.evaluate( ( el ) => el.classList.contains( 'is-animated' ) )
			)
			.toBe( true );
		await expect.poll( () => computed( ul, 'opacity' ) ).toBe( '1' );

		// Logged out: nothing at all.
		const context = await browser.newContext( {
			storageState: { cookies: [], origins: [] },
		} );
		const visitor = await context.newPage();

		await visitor.goto( link );
		await expect(
			visitor.locator( '.wp-block-zealblocks-list' )
		).toHaveCount( 0 );
		await context.close();
	} );

	test( "an item's own background, text colour, weight, padding and border (TC-LS-54)", async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { anchor: 'items' }, [
					item( 'Plain' ),
					item( 'Styled' ),
				] ),
			],
			[ 0, 1 ],
			null
		);

		await showOptional( page, 'Background', 'Color' );
		await pickSwatch( panel( page, 'Background' ), 'Color', 2 );
		await showOptional( page, 'Typography', 'Color' );
		await pickSwatch( panel( page, 'Typography' ), 'Color', 1 );
		await showOptional( page, 'Typography', 'Font weight' );
		const weight = panel( page, 'Typography' ).getByRole( 'combobox', {
			name: /Font weight|Appearance/,
		} );

		await weight.click();
		await page.getByRole( 'option', { name: 'Bold', exact: true } ).click();
		await panel( page, 'Dimensions' )
			.getByRole( 'slider', { name: 'Vertical padding' } )
			.fill( '2' );
		await panel( page, 'Border' )
			.getByRole( 'spinbutton', { name: 'Border width', exact: true } )
			.fill( '2' );

		const attrs = await attributesAt( page, [ 0, 1 ] );

		expect(
			attrs.backgroundColor || attrs.style?.color?.background
		).toBeTruthy();
		expect( attrs.textColor || attrs.style?.color?.text ).toBeTruthy();
		expect( attrs.style.typography.fontWeight ).toBe( '700' );

		await page.goto( await publish( page ) );
		const [ plain, styled ] = await page.locator( '#items > li' ).all();

		expect( await computed( styled, 'background-color' ) ).not.toBe(
			await computed( plain, 'background-color' )
		);
		expect( await computed( styled.locator( 'p' ), 'color' ) ).not.toBe(
			await computed( plain.locator( 'p' ), 'color' )
		);
		expect( await computed( styled.locator( 'p' ), 'font-weight' ) ).toBe(
			'700'
		);
		expect(
			parseFloat( await computed( styled, 'padding-top' ) )
		).toBeGreaterThan( 0 );
		expect( await computed( styled, 'border-top-width' ) ).toBe( '2px' );
		// The icon still meets the first line inside the padded item.
		const offset = await styled.evaluate( ( li ) => {
			const svg = li.querySelector( 'svg' ).getBoundingClientRect();
			const text = li.querySelector( 'p' );
			const line = parseFloat(
				window.getComputedStyle( text ).lineHeight
			);

			return (
				svg.top +
				svg.height / 2 -
				( text.getBoundingClientRect().top + line / 2 )
			);
		} );

		expect( Math.abs( offset ) ).toBeLessThan( 1 );
	} );

	test( "one Icon block's width and colour win over the list's (TC-LS-55)", async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list(
					{
						anchor: 'override',
						style: {
							zealblocks: {
								iconSize: '20px',
								iconColor: '#1a7f37',
							},
						},
					},
					[ item( 'List default' ), item( 'Own icon' ) ]
				),
			],
			[ 0, 1, 0 ],
			'Styles'
		);

		await panel( page, 'Dimensions' )
			.getByRole( 'spinbutton', { name: 'Width', exact: true } )
			.fill( '32' );
		await pickSwatch( panel( page, 'Typography' ), 'Color', 1 );

		const attrs = await attributesAt( page, [ 0, 1, 0 ] );

		expect( attrs.style.dimensions.width ).toBe( '32px' );
		expect( attrs.textColor || attrs.style.color?.text ).toBeTruthy();

		await page.goto( await publish( page ) );
		const [ first, second ] = await page
			.locator( '#override > li > .wp-block-zealblocks-icon' )
			.all();

		expect( await computed( first, 'width' ) ).toBe( '20px' );
		expect( await computed( first, 'color' ) ).toBe( 'rgb(26, 127, 55)' );
		expect( await computed( second, 'width' ) ).toBe( '32px' );
		expect( await computed( second, 'color' ) ).not.toBe(
			'rgb(26, 127, 55)'
		);
	} );

	test( 'an icon badge (background and padding) stays on the first line (TC-LS-56)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[
				list( { anchor: 'badges' }, [
					item( 'Badge', [], {
						style: {
							color: { background: '#dbeafe', text: '#1d4ed8' },
							spacing: {
								padding: {
									top: '6px',
									right: '6px',
									bottom: '6px',
									left: '6px',
								},
							},
							border: { radius: '999px' },
							dimensions: { width: '28px' },
						},
					} ),
				] ),
			],
			[ 0 ],
			'Settings'
		);

		await page.goto( await publish( page ) );
		const pageList = page.locator( '#badges' );
		const { offset } = await geometry( pageList );

		expect( Math.abs( offset ) ).toBeLessThan( 1 );
		expect(
			await computed(
				pageList.locator( '.wp-block-zealblocks-icon' ),
				'background-color'
			)
		).toBe( 'rgb(219, 234, 254)' );
	} );

	test( 'an item\'s Container: its Block spacing, and a paragraph added through its "+" (TC-LS-57)', async ( {
		admin,
		editor,
		page,
		posts,
	} ) => {
		await setUp(
			{ admin, editor, page, posts },
			[ list( { anchor: 'rich' }, [ item( 'Title' ) ] ) ],
			[ 0, 0, 1 ],
			'Styles'
		);

		// Block spacing: the number beside its slider, in the em it has.
		await panel( page, 'Dimensions' )
			.getByRole( 'slider', { name: 'Top block spacing' } )
			.locator( 'xpath=preceding::input[@type="number"][1]' )
			.fill( '1' );
		expect(
			( await attributesAt( page, [ 0, 0, 1 ] ) ).style.spacing.blockGap
		).toBe( '1em' );

		// The Container's "+", then a paragraph below the title.
		await canvas( page )
			.locator(
				'.wp-block-zealblocks-list-item > .wp-block-zealblocks-container .block-list-appender button'
			)
			.click();
		await page
			.getByRole( 'searchbox', { name: /Search/ } )
			.fill( 'Paragraph' );
		await page
			.getByRole( 'option', { name: 'Paragraph', exact: true } )
			.click();
		await page.keyboard.type( 'Detail' );

		expect(
			await page.evaluate( () =>
				window.wp.data
					.select( 'core/block-editor' )
					.getBlocks()[ 0 ]
					.innerBlocks[ 0 ].innerBlocks[ 1 ].innerBlocks.map(
						( block ) => block.name
					)
			)
		).toEqual( [ 'zealblocks/text', 'core/paragraph' ] );

		await page.goto( await publish( page ) );
		const body = page.locator(
			'#rich > li > .wp-block-zealblocks-container'
		);

		await expect( body.locator( 'p' ).nth( 1 ) ).toHaveText( 'Detail' );
		const gap = await body.evaluate( ( element ) => {
			const [ text, detail ] = element.children;

			return Math.round(
				detail.getBoundingClientRect().top -
					text.getBoundingClientRect().bottom
			);
		} );

		// 1em of the Container's font size.
		expect( gap ).toBe(
			Math.round( parseFloat( await computed( body, 'font-size' ) ) )
		);
	} );
} );
