/**
 * List: what the canvas shows for the previewed device.
 */

import { getListPreview } from '../../src/list/preview';
import { CSS_VARS, KEYS } from '../../src/list/constants';

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

	it( 'resolves only the keys asked for, as an item does for its icon colour', () => {
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
