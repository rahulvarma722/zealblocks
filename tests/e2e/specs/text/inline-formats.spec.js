/**
 * Text keeps its inline formats on the front end (BUG-01): TC-T-60 to
 * TC-T-66. The integration suite checks the markup; this checks what a
 * visitor gets from it.
 */

const { test, expect, block, computed } = require( '../../utils' );

test( 'links, highlights, kbd and language spans survive; scripts do not', async ( {
	page,
	posts,
} ) => {
	const { link } = await posts.create(
		block( 'zealblocks/text', {
			anchor: 'formats',
			content:
				'A <a href="https://example.org/" target="_blank" rel="noreferrer noopener">link</a>, ' +
				'a <mark style="background-color:#ffff00" class="has-inline-color">highlight</mark>, ' +
				'<kbd>Ctrl</kbd>, <span lang="fr">bonjour</span>' +
				'<script>window.zbInjected = true;</script>.',
		} ),
		{ title: 'Inline formats' }
	);

	await page.goto( link );
	const text = page.locator( '#formats' );

	await expect( text.getByRole( 'link', { name: 'link' } ) ).toHaveAttribute(
		'href',
		'https://example.org/'
	);
	expect( await computed( text.locator( 'mark' ), 'background-color' ) ).toBe(
		'rgb(255, 255, 0)'
	);
	await expect( text.locator( 'kbd' ) ).toHaveText( 'Ctrl' );
	await expect( text.locator( 'span[lang="fr"]' ) ).toHaveText( 'bonjour' );
	expect( await page.evaluate( () => window.zbInjected ) ).toBeUndefined();
} );
