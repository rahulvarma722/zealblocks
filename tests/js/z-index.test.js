/**
 * The editor half of the shared z-index, for blocks without a Position panel:
 * what the canvas shows at each device. It must agree with
 * Z_Index::classes() on the server.
 */

import { getZIndexPreview } from '../../src/shared/z-index/preview';

describe( 'getZIndexPreview', () => {
	it( 'adds nothing when no layer has a z-index', () => {
		expect( getZIndexPreview( undefined, 'Desktop' ) ).toEqual( {
			style: {},
			classes: [],
		} );
		expect(
			getZIndexPreview( { zealblocks: { width: '10px' } }, 'Desktop' )
		).toEqual( { style: {}, classes: [] } );
	} );

	it( 'previews the value and the class at the base layer', () => {
		expect(
			getZIndexPreview( { zealblocks: { zIndex: '5' } }, 'Desktop' )
		).toEqual( {
			style: { zIndex: '5' },
			classes: [ 'has-zealblocks-z-index' ],
		} );
	} );

	it( 'uses the device layer, and Mobile falls back to the BASE, not Tablet', () => {
		const style = {
			zealblocks: { zIndex: '2' },
			'@tablet': { zealblocks: { zIndex: '7' } },
		};

		expect( getZIndexPreview( style, 'Tablet' ).style ).toEqual( {
			zIndex: '7',
		} );
		expect( getZIndexPreview( style, 'Mobile' ).style ).toEqual( {
			zIndex: '2',
		} );
	} );

	it( 'keeps the class at every device once any layer has a value', () => {
		const style = { '@mobile': { zealblocks: { zIndex: '9' } } };

		expect( getZIndexPreview( style, 'Desktop' ) ).toEqual( {
			style: {},
			classes: [ 'has-zealblocks-z-index' ],
		} );
		expect( getZIndexPreview( style, 'Mobile' ).style ).toEqual( {
			zIndex: '9',
		} );
	} );
} );
