/**
 * List: what the canvas shows for the previewed device, and what an item is
 * made of.
 */

import { getListPreview } from '../../src/list/preview';
import {
	BODY,
	CSS_VARS,
	DEFAULT_ICON,
	ICON,
	KEYS,
	LOCKED,
	TEXT,
	itemTemplate,
} from '../../src/list/constants';

describe( 'getListPreview', () => {
	it( 'resolves each value for the device, as the custom properties render.php writes', () => {
		const style = {
			zealblocks: {
				itemGap: '12px',
				iconColor: '#2e7d32',
				iconSize: '20px',
			},
			'@mobile': { zealblocks: { itemGap: '6px' } },
		};

		expect( getListPreview( style, 'Mobile' ) ).toEqual( {
			[ CSS_VARS[ KEYS.itemGap ] ]: '6px',
			[ CSS_VARS[ KEYS.iconColor ] ]: '#2e7d32',
			[ CSS_VARS[ KEYS.iconSize ] ]: '20px',
		} );
	} );

	it( 'resolves only the keys asked for', () => {
		expect(
			getListPreview(
				{ zealblocks: { iconColor: '#f00', itemGap: '1em' } },
				'Desktop',
				[ KEYS.iconColor ]
			)
		).toEqual( { '--zealblocks-list-icon-color': '#f00' } );
		expect( getListPreview( undefined, 'Desktop' ) ).toEqual( {} );
	} );
} );

describe( 'itemTemplate', () => {
	it( 'is an Icon and a Container holding a Text, the two locked in place', () => {
		const [ icon, body ] = itemTemplate( 'star' );

		expect( icon ).toEqual( [ ICON, { icon: 'star', lock: LOCKED } ] );
		expect( body[ 0 ] ).toBe( BODY );
		expect( body[ 1 ] ).toMatchObject( {
			layout: { type: 'default' },
			lock: LOCKED,
		} );
		expect( body[ 2 ] ).toHaveLength( 1 );
		expect( body[ 2 ][ 0 ][ 0 ] ).toBe( TEXT );
		expect( LOCKED ).toEqual( { move: true, remove: true } );
	} );

	it( 'falls back to the default icon when the list has none', () => {
		expect( itemTemplate( '' )[ 0 ][ 1 ].icon ).toBe( DEFAULT_ICON );
		expect( itemTemplate( undefined )[ 0 ][ 1 ].icon ).toBe( DEFAULT_ICON );
	} );
} );
