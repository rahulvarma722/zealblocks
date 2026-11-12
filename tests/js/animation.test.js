/**
 * The editor half of the shared entrance animation: what an animated block
 * adds to its block props in the canvas.
 */

import { getAnimationProps } from '../../src/shared/animation/preview';

describe( 'getAnimationProps', () => {
	const animated = {
		animationType: 'fade-up',
		animationDuration: 1200,
		animationDelay: 300,
		animationEasing: 'ease-in-out',
	};

	it( 'adds nothing to a block that is not animated', () => {
		expect( getAnimationProps( { animationType: '' }, true ) ).toEqual( {
			className: '',
			style: {},
			data: {},
		} );
	} );

	it( 'carries the type as the same data attribute the front end uses', () => {
		expect( getAnimationProps( animated, false ).data ).toEqual( {
			'data-zealblocks-animation': 'fade-up',
		} );
	} );

	it( 'carries timing as the custom properties Animation::wrapper() writes', () => {
		expect( getAnimationProps( animated, false ).style ).toEqual( {
			'--zealblocks-animation-duration': '1200ms',
			'--zealblocks-animation-delay': '300ms',
			'--zealblocks-animation-easing': 'ease-in-out',
		} );
	} );

	it( 'adds the preview class only while a preview plays', () => {
		expect( getAnimationProps( animated, true ).className ).toBe(
			'is-animation-preview'
		);
		expect( getAnimationProps( animated, false ).className ).toBe( '' );
	} );
} );
