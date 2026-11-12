/**
 * The editor half of the shared hover colours: what the canvas shows at each
 * device. It must agree with Hover::classes() on the server.
 */

import { getHoverPreview } from '../../src/shared/hover/preview';

const PREFIX = '--zb-test-hover-';

describe( 'getHoverPreview', () => {
	it( 'adds nothing without hover values', () => {
		expect( getHoverPreview( undefined, 'Desktop', PREFIX ) ).toEqual( {
			style: {},
			classes: [],
		} );
	} );

	it( 'carries each colour as a variable named from the block prefix', () => {
		const preview = getHoverPreview(
			{
				zealblocks: {
					textHover: '#f00',
					backgroundHover: 'linear-gradient(90deg,#000 0%,#fff 100%)',
					hoverDuration: '300ms',
				},
			},
			'Desktop',
			PREFIX
		);

		expect( preview.style ).toEqual( {
			'--zb-test-hover-duration': '300ms',
			'--zb-test-hover-color': '#f00',
			'--zb-test-hover-background':
				'linear-gradient(90deg,#000 0%,#fff 100%)',
		} );
		expect( preview.classes ).toEqual( [
			'has-hover',
			'has-hover-color',
			'has-hover-background',
		] );
	} );

	it( 'adds a colour class ONLY for the device that resolves one, but keeps has-hover everywhere', () => {
		const style = { '@mobile': { zealblocks: { textHover: '#f00' } } };

		expect( getHoverPreview( style, 'Desktop', PREFIX ) ).toEqual( {
			style: {},
			classes: [ 'has-hover' ],
		} );
		expect( getHoverPreview( style, 'Mobile', PREFIX ).classes ).toEqual( [
			'has-hover',
			'has-hover-color',
		] );
	} );

	it( 'a duration alone switches nothing on', () => {
		expect(
			getHoverPreview(
				{ zealblocks: { hoverDuration: '300ms' } },
				'Desktop',
				PREFIX
			).classes
		).toEqual( [] );
	} );
} );
