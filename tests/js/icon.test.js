/**
 * The Icon's SVG in the canvas, as render.php builds it, and the shared link
 * rel handling the Icon and Button both use.
 */

import { getSvgProps } from '../../src/icon/svg-props';
import { ROTATION_VAR } from '../../src/icon/constants';
import { withNewTabRel } from '../../src/shared/link/rel';

describe( 'getSvgProps', () => {
	it( 'is the plain class without flips or rotation', () => {
		expect( getSvgProps( {} ) ).toEqual( {
			className: 'wp-block-zealblocks-icon__svg',
			style: undefined,
		} );
	} );

	it( 'adds the flips and the rotation variable', () => {
		expect(
			getSvgProps( {
				flipHorizontal: true,
				flipVertical: true,
				rotation: -90,
			} )
		).toEqual( {
			className:
				'wp-block-zealblocks-icon__svg is-flip-horizontal is-flip-vertical has-rotation',
			style: { [ ROTATION_VAR ]: '270deg' },
		} );
	} );

	it( 'treats a full turn as no rotation', () => {
		expect( getSvgProps( { rotation: 720 } ).style ).toBeUndefined();
	} );
} );

describe( 'withNewTabRel', () => {
	it( 'adds the opener guard and keeps the author’s tokens', () => {
		expect( withNewTabRel( 'nofollow', true ) ).toBe(
			'nofollow noreferrer noopener'
		);
	} );

	it( 'removes only the guard when the new tab is turned off', () => {
		expect( withNewTabRel( 'sponsored noreferrer noopener', false ) ).toBe(
			'sponsored'
		);
		expect( withNewTabRel( undefined, false ) ).toBe( '' );
	} );
} );
