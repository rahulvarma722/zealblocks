/**
 * Shared fill: one stored value holding a colour or a gradient, edited with
 * core's tabbed colour/gradient control. That control calls the handler of
 * the tab used, then the other handler with no value; this pins that the
 * second call never undoes the first.
 */

import { isGradient, nextFill } from '../../src/shared/fill/values';

describe( 'isGradient', () => {
	it( 'knows gradient functions and preset gradients from colours', () => {
		expect( isGradient( 'linear-gradient(90deg,#000 0%,#fff 100%)' ) ).toBe(
			true
		);
		expect( isGradient( 'repeating-radial-gradient(#000,#fff)' ) ).toBe(
			true
		);
		expect( isGradient( 'var(--wp--preset--gradient--vivid)' ) ).toBe(
			true
		);
		expect( isGradient( '#ff0000' ) ).toBe( false );
		expect( isGradient( 'var(--wp--preset--color--gradient-start)' ) ).toBe(
			false
		);
		expect( isGradient( undefined ) ).toBe( false );
	} );
} );

describe( 'nextFill', () => {
	const GRADIENT = 'linear-gradient(90deg,#000 0%,#fff 100%)';

	it( 'a picked value always writes', () => {
		expect( nextFill( undefined, 'color', '#f00' ) ).toEqual( {
			change: true,
			value: '#f00',
		} );
		expect( nextFill( '#f00', 'gradient', GRADIENT ) ).toEqual( {
			change: true,
			value: GRADIENT,
		} );
	} );

	it( 'the follow-up call of a colour pick leaves the colour alone', () => {
		// onColorChange( '#f00' ), then onGradientChange().
		expect( nextFill( '#f00', 'gradient', undefined ) ).toEqual( {
			change: false,
			value: '#f00',
		} );
	} );

	it( 'the follow-up call of a gradient pick leaves the gradient alone', () => {
		// onGradientChange( gradient ), then onColorChange().
		expect( nextFill( GRADIENT, 'color', undefined ) ).toEqual( {
			change: false,
			value: GRADIENT,
		} );
	} );

	it( 'clearing clears a value of its own type', () => {
		expect( nextFill( '#f00', 'color', undefined ) ).toEqual( {
			change: true,
			value: undefined,
		} );
		expect( nextFill( GRADIENT, 'gradient', '' ) ).toEqual( {
			change: true,
			value: undefined,
		} );
		expect( nextFill( undefined, 'color', undefined ).change ).toBe(
			false
		);
	} );
} );
