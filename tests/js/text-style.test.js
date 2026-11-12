/**
 * Unit tests for the Text block's per-viewport style values and canvas preview.
 *
 * The preview is the editor's half of render.php: if the two disagree, the
 * canvas shows a shadow or hover the front end does not have. These pin the
 * rules most likely to drift — any-band classes, per-key fallback, and hover
 * classes existing only for the device that has a value.
 *
 * Run with `npm run test:js`.
 */

import { getPreview, hasAnyLayerValue } from '../../src/text/preview';
import {
	clearKeys,
	setShadowValue,
	setCondition,
} from '../../src/text/style-values';
import {
	KEYS,
	SHADOW_KEYS,
	SHADOW_DEFAULTS,
	CSS_VARS,
} from '../../src/text/constants';

const NS = 'zealblocks';

describe( 'getPreview', () => {
	it( 'returns nothing for an empty style', () => {
		expect( getPreview( undefined, 'Desktop' ) ).toEqual( {
			style: {},
			classes: [],
		} );
	} );

	it( 'resolves column gap per device, mobile falling back to the BASE', () => {
		const style = {
			[ NS ]: { columnGap: '40px' },
			'@tablet': { [ NS ]: { columnGap: '20px' } },
		};

		expect( getPreview( style, 'Desktop' ).style.columnGap ).toBe( '40px' );
		expect( getPreview( style, 'Tablet' ).style.columnGap ).toBe( '20px' );
		expect( getPreview( style, 'Mobile' ).style.columnGap ).toBe( '40px' );
	} );

	it( 'switches the shadow on in every band once any band has one', () => {
		const style = {
			'@mobile': { [ NS ]: { textShadowColor: 'red' } },
		};

		// Desktop carries the class but no variables, so the stylesheet's
		// fallbacks draw nothing there.
		const desktop = getPreview( style, 'Desktop' );
		expect( desktop.classes ).toContain( 'has-text-shadow' );
		expect( desktop.style[ CSS_VARS[ KEYS.shadowColor ] ] ).toBeUndefined();

		expect(
			getPreview( style, 'Mobile' ).style[ CSS_VARS[ KEYS.shadowColor ] ]
		).toBe( 'red' );
	} );

	it( 'resolves each shadow part on its own, as the cascade does', () => {
		const style = {
			[ NS ]: { textShadowX: '2px', textShadowColor: 'black' },
			'@tablet': { [ NS ]: { textShadowColor: 'blue' } },
		};

		const tablet = getPreview( style, 'Tablet' ).style;

		expect( tablet[ CSS_VARS[ KEYS.shadowColor ] ] ).toBe( 'blue' );
		expect( tablet[ CSS_VARS[ KEYS.shadowX ] ] ).toBe( '2px' );
	} );

	it( 'adds a hover colour class ONLY for the device that resolves one', () => {
		const style = {
			'@mobile': { [ NS ]: { textHover: '#f00' } },
		};

		const desktop = getPreview( style, 'Desktop' );
		const mobile = getPreview( style, 'Mobile' );

		// The transition class follows any band, the colour class does not —
		// an unresolved variable would reset the colour on hover.
		expect( desktop.classes ).toContain( 'has-hover' );
		expect( desktop.classes ).not.toContain( 'has-hover-color' );
		expect( mobile.classes ).toContain( 'has-hover-color' );
		expect( mobile.style[ CSS_VARS[ KEYS.textHover ] ] ).toBe( '#f00' );
	} );

	it( 'carries a gradient background hover through unchanged', () => {
		const gradient = 'linear-gradient(135deg,#000 0%,#fff 100%)';
		const preview = getPreview(
			{ [ NS ]: { backgroundHover: gradient } },
			'Desktop'
		);

		expect( preview.classes ).toContain( 'has-hover-background' );
		expect( preview.style[ CSS_VARS[ KEYS.backgroundHover ] ] ).toBe(
			gradient
		);
	} );
} );

describe( 'hasAnyLayerValue', () => {
	it( 'looks at every layer', () => {
		expect(
			hasAnyLayerValue(
				{ '@tablet': { [ NS ]: { textShadowBlur: '1px' } } },
				SHADOW_KEYS
			)
		).toBe( true );
		expect( hasAnyLayerValue( { [ NS ]: {} }, SHADOW_KEYS ) ).toBe( false );
	} );
} );

describe( 'setShadowValue', () => {
	it( 'seeds the other parts the first time a shadow is added', () => {
		const next = setShadowValue( undefined, null, KEYS.shadowColor, 'red' );

		expect( next[ NS ] ).toEqual( {
			...SHADOW_DEFAULTS,
			[ KEYS.shadowColor ]: 'red',
		} );
	} );

	it( 'does not seed a tablet layer when the base already has a shadow', () => {
		const base = { [ NS ]: { textShadowX: '3px' } };
		const next = setShadowValue(
			base,
			'@tablet',
			KEYS.shadowColor,
			'blue'
		);

		// The tablet colour inherits the desktop offsets through the cascade;
		// seeding would silently override them.
		expect( next[ '@tablet' ][ NS ] ).toEqual( {
			textShadowColor: 'blue',
		} );
		expect( next[ NS ] ).toEqual( { textShadowX: '3px' } );
	} );

	it( 'does not seed on a clear', () => {
		expect(
			setShadowValue( undefined, null, KEYS.shadowColor, undefined )
		).toBeUndefined();
	} );
} );

describe( 'clearKeys', () => {
	it( 'clears one layer and leaves the others — reset Tablet reveals Desktop', () => {
		const style = {
			[ NS ]: { textHover: 'red', columnGap: '1em' },
			'@tablet': { [ NS ]: { textHover: 'blue' } },
		};

		const next = clearKeys( style, '@tablet', [ KEYS.textHover ] );

		expect( next[ '@tablet' ] ).toBeUndefined();
		expect( next[ NS ] ).toEqual( { textHover: 'red', columnGap: '1em' } );
	} );
} );

describe( 'getPreview — position', () => {
	const style = {
		[ NS ]: { position: 'absolute', positionTop: '10px', zIndex: '3' },
		'@mobile': { [ NS ]: { position: 'relative' } },
	};

	it( 'previews position, offsets and z-index per device', () => {
		const desktop = getPreview( style, 'Desktop' );
		const mobile = getPreview( style, 'Mobile' );

		expect( desktop.style ).toMatchObject( {
			position: 'absolute',
			top: '10px',
			zIndex: '3',
		} );
		expect( desktop.classes ).toContain( 'has-zealblocks-z-index' );
		// Mobile overrides the type and inherits the base offset.
		expect( mobile.style ).toMatchObject( {
			position: 'relative',
			top: '10px',
		} );
	} );

	it( 'leaves position out when the editor preview is off', () => {
		const preview = getPreview( style, 'Desktop', {
			previewPosition: false,
		} );

		expect( preview.style.position ).toBeUndefined();
		expect( preview.style.zIndex ).toBeUndefined();
		expect( preview.classes ).not.toContain( 'has-zealblocks-z-index' );
	} );
} );

describe( 'setCondition', () => {
	it( 'stores active conditions and drops inactive ones', () => {
		let next = setCondition( {}, 'hideWhenLoggedIn', true );
		next = setCondition( next, 'hideOnDays', [ 'monday' ] );

		expect( next ).toEqual( {
			hideWhenLoggedIn: true,
			hideOnDays: [ 'monday' ],
		} );

		next = setCondition( next, 'hideWhenLoggedIn', false );
		next = setCondition( next, 'hideOnDays', [] );
		next = setCondition( next, 'hideForRole', '' );

		expect( next ).toEqual( {} );
	} );
} );
