/**
 * The Button's hover, icon and shadow styling in the editor: what the canvas
 * shows, and how the hover shadow is written. Both must agree with render.php.
 */

import { getStylePreview } from '../../src/button/preview';
import { setShadowHoverValue } from '../../src/button/style-values';
import { SHADOW_HOVER_DEFAULTS } from '../../src/button/constants';

describe( 'getStylePreview', () => {
	it( 'adds nothing without styling', () => {
		expect( getStylePreview( undefined, 'Desktop' ) ).toEqual( {
			style: {},
			classes: [],
		} );
	} );

	it( 'carries text and background hover through the shared preview', () => {
		const preview = getStylePreview(
			{ zealblocks: { textHover: '#f00', backgroundHover: '#0f0' } },
			'Desktop'
		);

		expect( preview.style ).toEqual( {
			'--zealblocks-button-hover-color': '#f00',
			'--zealblocks-button-hover-background': '#0f0',
		} );
		expect( preview.classes ).toEqual( [
			'has-hover',
			'has-hover-color',
			'has-hover-background',
		] );
	} );

	it( 'carries icon colours and gap as the variables style.scss reads', () => {
		const preview = getStylePreview(
			{
				zealblocks: {
					iconColor: '#111',
					iconHover: '#222',
					iconGap: '1em',
				},
				'@mobile': { zealblocks: { iconGap: '4px' } },
			},
			'Mobile'
		);

		expect( preview.style ).toEqual( {
			'--zealblocks-button-icon-gap': '4px',
			'--zealblocks-button-icon-color': '#111',
			'--zealblocks-button-icon-hover-color': '#222',
		} );
		expect( preview.classes ).toEqual( [ 'has-hover' ] );
	} );

	it( 'marks a border hover only on the device that has one', () => {
		const style = { '@tablet': { zealblocks: { borderHover: '#00f' } } };

		expect( getStylePreview( style, 'Tablet' ).classes ).toEqual( [
			'has-hover',
			'has-hover-border',
		] );
		expect( getStylePreview( style, 'Desktop' ).classes ).toEqual( [
			'has-hover',
		] );
	} );

	it( 'keeps has-shadow-hover at every device once any layer has a part', () => {
		const style = {
			'@mobile': { zealblocks: { shadowHoverColor: '#000' } },
		};

		expect( getStylePreview( style, 'Desktop' ).classes ).toEqual( [
			'has-hover',
			'has-shadow-hover',
		] );
		expect(
			getStylePreview( style, 'Mobile' ).style[
				'--zealblocks-button-shadow-hover-color'
			]
		).toBe( '#000' );
	} );
} );

describe( 'setShadowHoverValue', () => {
	it( 'seeds the other parts the first time a shadow is added', () => {
		const next = setShadowHoverValue(
			undefined,
			null,
			'shadowHoverColor',
			'#f00'
		);

		expect( next.zealblocks ).toEqual( {
			...SHADOW_HOVER_DEFAULTS,
			shadowHoverColor: '#f00',
		} );
	} );

	it( 'does not seed a tablet layer when the base already has a shadow', () => {
		const style = { zealblocks: { ...SHADOW_HOVER_DEFAULTS } };
		const next = setShadowHoverValue(
			style,
			'@tablet',
			'shadowHoverY',
			'10px'
		);

		expect( next[ '@tablet' ].zealblocks ).toEqual( {
			shadowHoverY: '10px',
		} );
	} );

	it( 'does not seed on a clear', () => {
		expect(
			setShadowHoverValue( undefined, null, 'shadowHoverX', undefined )
		).toEqual( undefined );
	} );
} );
