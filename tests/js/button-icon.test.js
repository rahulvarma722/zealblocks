/**
 * The Button's icon, hover icon and icon-only mode in the canvas. Each case
 * mirrors a branch of render.php, which the integration suite checks.
 */

import {
	getIconClasses,
	getIconProps,
	hidesText,
	normalizeAngle,
	toPlainText,
	toRichText,
	ROTATION_VAR,
} from '../../src/button/icon-options';

describe( 'hidesText', () => {
	it( 'hides the text only when Show text is off and there is an icon', () => {
		expect( hidesText( { icon: 'heart', showText: false } ) ).toBe( true );
		expect( hidesText( { icon: '', showText: false } ) ).toBe( false );
		expect( hidesText( { icon: 'heart', showText: true } ) ).toBe( false );
		expect( hidesText( { icon: 'heart' } ) ).toBe( false );
	} );
} );

describe( 'getIconClasses', () => {
	it( 'adds nothing for a plain button', () => {
		expect( getIconClasses( {} ) ).toEqual( [] );
	} );

	it( 'keeps the icon side and RTL flip classes, only with an icon', () => {
		expect(
			getIconClasses( {
				icon: 'heart',
				iconPosition: 'left',
				flipForRTL: true,
			} )
		).toEqual( [ 'has-icon-left', 'has-rtl-flip' ] );
		expect(
			getIconClasses( { iconPosition: 'left', flipForRTL: true } )
		).toEqual( [] );
	} );

	it( 'marks a hover icon only when it is on and chosen', () => {
		expect( getIconClasses( { hoverIcon: 'arrow-right' } ) ).toEqual( [] );
		expect( getIconClasses( { showIconOnHover: true } ) ).toEqual( [] );
		expect(
			getIconClasses( {
				showIconOnHover: true,
				hoverIcon: 'arrow-right',
				hoverIconPosition: 'left',
				hoverIconFlipForRTL: true,
			} )
		).toEqual( [
			'has-hover-icon',
			'has-hover-icon-left',
			'has-hover-icon-rtl-flip',
		] );
	} );

	it( 'drops the hover icon side on an icon-only button', () => {
		expect(
			getIconClasses( {
				icon: 'heart',
				showText: false,
				showIconOnHover: true,
				hoverIcon: 'arrow-right',
				hoverIconPosition: 'left',
			} )
		).toEqual( [ 'has-hover-icon' ] );
	} );
} );

describe( 'normalizeAngle', () => {
	it( 'reads whole degrees in one turn, as Render::angle() does', () => {
		expect( normalizeAngle( 45 ) ).toBe( 45 );
		expect( normalizeAngle( '45' ) ).toBe( 45 );
		expect( normalizeAngle( 360 ) ).toBe( 0 );
		expect( normalizeAngle( -90 ) ).toBe( 270 );
		expect( normalizeAngle( undefined ) ).toBe( 0 );
		expect( normalizeAngle( 'x' ) ).toBe( 0 );
	} );
} );

describe( 'getIconProps', () => {
	it( 'adds the class and variable only for a rotation', () => {
		expect( getIconProps( 'icon', 0 ) ).toEqual( {
			className: 'icon',
			style: undefined,
		} );
		expect( getIconProps( 'icon', 450 ) ).toEqual( {
			className: 'icon has-rotation',
			style: { [ ROTATION_VAR ]: '90deg' },
		} );
	} );
} );

describe( 'aria label text', () => {
	it( 'shows the stored text as plain text', () => {
		expect( toPlainText( 'Tom &amp; <em>Jerry</em> ' ) ).toBe(
			'Tom & Jerry'
		);
		expect( toPlainText( '' ) ).toBe( '' );
		expect( toPlainText( undefined ) ).toBe( '' );
	} );

	it( 'stores typed text so it stays text', () => {
		expect( toRichText( 'a < b & c' ) ).toBe( 'a &lt; b &amp; c' );
		expect( toPlainText( toRichText( '<img src=x>' ) ) ).toBe(
			'<img src=x>'
		);
	} );
} );
