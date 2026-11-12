/**
 * The hover label swap: the second label applies while the element is hovered
 * or focused, and the original returns once it is neither.
 */

import { ATTRIBUTE, bind } from '../../src/shared/hover-label/view';

function makeButton( attributes ) {
	const button = document.createElement( 'a' );

	Object.entries( attributes ).forEach( ( [ name, value ] ) =>
		button.setAttribute( name, value )
	);
	document.body.appendChild( button );
	bind( button );

	return button;
}

const fire = ( element, type ) =>
	element.dispatchEvent( new window.Event( type ) );

describe( 'hover label', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'swaps on hover and restores on leave', () => {
		const button = makeButton( {
			'aria-label': 'Download',
			[ ATTRIBUTE ]: 'Learn more',
		} );

		fire( button, 'mouseenter' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Learn more' );

		fire( button, 'mouseleave' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Download' );
	} );

	it( 'keeps the hover label while focus remains', () => {
		const button = makeButton( {
			'aria-label': 'Download',
			[ ATTRIBUTE ]: 'Learn more',
		} );

		fire( button, 'focus' );
		fire( button, 'mouseenter' );
		fire( button, 'mouseleave' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Learn more' );

		fire( button, 'blur' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Download' );
	} );

	it( 'removes the label again when there was none', () => {
		const button = makeButton( { [ ATTRIBUTE ]: 'Learn more' } );

		fire( button, 'focus' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Learn more' );

		fire( button, 'blur' );
		expect( button.hasAttribute( 'aria-label' ) ).toBe( false );
	} );

	it( 'does nothing without a hover label', () => {
		const button = makeButton( {
			'aria-label': 'Download',
			[ ATTRIBUTE ]: '',
		} );

		fire( button, 'mouseenter' );
		expect( button.getAttribute( 'aria-label' ) ).toBe( 'Download' );
	} );
} );
