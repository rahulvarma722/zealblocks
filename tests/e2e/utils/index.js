/**
 * Helpers shared by every spec.
 *
 * THE SUITE RUNS AGAINST A REAL SITE, so it never calls RequestUtils'
 * deleteAllPosts(), deleteAllPages(), activateTheme() or anything else that
 * touches content it did not create. Posts come from the `posts` fixture,
 * which deletes exactly the ones it made when the test ends, and editor tests
 * register the post they edited with `posts.track()`.
 */

const {
	test: base,
	expect,
} = require( '@wordpress/e2e-test-utils-playwright' );

/**
 * Block attributes as core serialises them into a comment delimiter.
 *
 * Same escaping as core's serializeAttributes(): `--` would end the comment,
 * and `<`, `>` and `&` are escaped so the markup survives kses and HTML
 * parsing untouched.
 *
 * @param {Object} attributes Block attributes.
 * @return {string} The JSON, escaped for a block comment.
 */
function serializeAttributes( attributes ) {
	return JSON.stringify( attributes )
		.replace( /--/g, '\\u002d\\u002d' )
		.replace( /</g, '\\u003c' )
		.replace( />/g, '\\u003e' )
		.replace( /&/g, '\\u0026' )
		.replace( /\\"/g, '\\u0022' );
}

/**
 * Block markup for post content.
 *
 * @param {string}   name       Block name, e.g. 'zealblocks/button'.
 * @param {Object}   attributes Attributes.
 * @param {string[]} inner      Inner block markup; a container gets its
 *                              wrapper from render.php, so none is written.
 * @return {string} The markup.
 */
function block( name, attributes = {}, inner = null ) {
	const json = Object.keys( attributes ).length
		? ` ${ serializeAttributes( attributes ) }`
		: '';
	const comment = name.replace( /^core\//, '' );

	return null === inner
		? `<!-- wp:${ comment }${ json } /-->`
		: `<!-- wp:${ comment }${ json } -->${ inner.join(
				''
		  ) }<!-- /wp:${ comment } -->`;
}

/**
 * Computed style of an element, or of one of its pseudo-elements.
 *
 * @param {import('@playwright/test').Locator} locator  Element.
 * @param {string}                             property CSS property.
 * @param {?string}                            pseudo   Pseudo-element.
 * @return {Promise<string>} The computed value.
 */
function computed( locator, property, pseudo = null ) {
	return locator.evaluate(
		( element, [ prop, pseudoElement ] ) =>
			window
				.getComputedStyle( element, pseudoElement )
				.getPropertyValue( prop ),
		[ property, pseudo ]
	);
}

/**
 * Moves keyboard focus to an element with Tab, so `:focus-visible` matches.
 * `locator.focus()` does not trigger it.
 *
 * @param {import('@playwright/test').Page}    page    Page.
 * @param {import('@playwright/test').Locator} locator Element to reach.
 * @param {number}                             limit   Most presses to try.
 * @return {Promise<void>}
 */
async function tabTo( page, locator, limit = 60 ) {
	const handle = await locator.elementHandle();

	// Start just before the element, so the walk is short and predictable.
	await locator.evaluate( ( element ) => {
		const marker = document.createElement( 'span' );
		marker.tabIndex = -1;
		marker.id = 'zb-e2e-tab-start';
		element.parentNode.insertBefore( marker, element );
		marker.focus();
		marker.remove();
	} );

	for ( let i = 0; i < limit; i++ ) {
		await page.keyboard.press( 'Tab' );

		if (
			await page.evaluate(
				( element ) => element.ownerDocument.activeElement === element,
				handle
			)
		) {
			return;
		}
	}

	throw new Error( 'Tab never reached the element.' );
}

const test = base.extend( {
	// Posts this test made, deleted when it ends.
	posts: async ( { requestUtils }, use ) => {
		const created = [];

		await use( {
			/**
			 * Publishes a post holding the given markup.
			 *
			 * @param {string} content       Block markup.
			 * @param {Object} options       Options.
			 * @param {string} options.title Title, after the `[e2e]` prefix.
			 * @param {string} options.type  'posts' or 'pages'.
			 * @return {Promise<{id: number, link: string}>} The post.
			 */
			async create(
				content,
				{ title = 'Zealblocks', type = 'posts' } = {}
			) {
				const post = await requestUtils.rest( {
					method: 'POST',
					path: `/wp/v2/${ type }`,
					data: {
						title: `[e2e] ${ title }`,
						content,
						status: 'publish',
					},
				} );

				created.push( { id: post.id, type } );

				return { id: post.id, link: post.link };
			},

			/**
			 * Registers a post made another way (the editor) for deletion.
			 *
			 * @param {number} id   Post ID.
			 * @param {string} type 'posts' or 'pages'.
			 */
			track( id, type = 'posts' ) {
				if ( id ) {
					created.push( { id, type } );
				}
			},
		} );

		for ( const { id, type } of created ) {
			await requestUtils
				.rest( {
					method: 'DELETE',
					path: `/wp/v2/${ type }/${ id }`,
					params: { force: true },
				} )
				.catch( () => {} );
		}
	},

	// A page with no login, for what a visitor sees.
	visitorPage: async ( { browser }, use ) => {
		const context = await browser.newContext( {
			storageState: { cookies: [], origins: [] },
		} );
		const page = await context.newPage();

		await use( page );
		await context.close();
	},
} );

module.exports = { test, expect, block, computed, tabTo };
