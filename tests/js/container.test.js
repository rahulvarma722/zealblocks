/**
 * The Container in the editor: what the canvas shows, and what the layout
 * presets write. Both must agree with render.php and Reverse_Order.
 */

import {
	getPreviewDirection,
	getStylePreview,
} from '../../src/container/preview';
import { PRESETS, withPresetStyle } from '../../src/container/presets';

const FLEX = { type: 'flex', flexWrap: 'nowrap' };

describe( 'getPreviewDirection', () => {
	it( 'leaves core alone when nothing is reversed, or the layout is not flex', () => {
		expect( getPreviewDirection( FLEX, undefined, 'Desktop' ) ).toBe(
			undefined
		);
		expect(
			getPreviewDirection(
				FLEX,
				{ zealblocks: { reverse: false } },
				'Desktop'
			)
		).toBe( undefined );
		expect(
			getPreviewDirection(
				{ type: 'grid' },
				{ zealblocks: { reverse: true } },
				'Desktop'
			)
		).toBe( undefined );
	} );

	it( 'follows each device: its own orientation and flag, else the base', () => {
		const style = {
			zealblocks: { reverse: true },
			'@mobile': {
				layout: { orientation: 'vertical' },
				zealblocks: { reverse: false },
			},
		};

		expect( getPreviewDirection( FLEX, style, 'Desktop' ) ).toBe(
			'row-reverse'
		);
		expect( getPreviewDirection( FLEX, style, 'Tablet' ) ).toBe(
			'row-reverse'
		);
		expect( getPreviewDirection( FLEX, style, 'Mobile' ) ).toBe( 'column' );
	} );

	it( 'falls back to the base on Mobile, never to Tablet', () => {
		const style = { '@tablet': { zealblocks: { reverse: true } } };

		expect( getPreviewDirection( FLEX, style, 'Tablet' ) ).toBe(
			'row-reverse'
		);
		expect( getPreviewDirection( FLEX, style, 'Mobile' ) ).toBe( 'row' );
		expect(
			getPreviewDirection(
				{ ...FLEX, orientation: 'vertical' },
				style,
				'Desktop'
			)
		).toBe( 'column' );
	} );
} );

describe( 'getStylePreview', () => {
	it( 'adds nothing without styling', () => {
		expect( getStylePreview( {}, 'Desktop' ) ).toEqual( {
			style: {},
			classes: [],
		} );
	} );

	it( 'resolves sizes, overflow and the lift for the previewed device', () => {
		const style = {
			zealblocks: {
				maxWidth: '600px',
				overflow: 'hidden',
				hoverLift: '4px',
			},
			'@mobile': { zealblocks: { maxWidth: '100%' } },
		};

		expect( getStylePreview( { style }, 'Mobile' ).style ).toEqual( {
			maxWidth: '100%',
			overflow: 'hidden',
			'--zealblocks-container-lift': '4px',
		} );
	} );

	it( 'switches the transition on for a shadow, a lift or a border alone', () => {
		expect(
			getStylePreview(
				{ style: { zealblocks: { hoverLift: '4px' } } },
				'Desktop'
			).classes
		).toEqual( [ 'has-hover', 'has-hover-lift' ] );
		expect(
			getStylePreview(
				{ style: { zealblocks: { shadowHoverY: '8px' } } },
				'Desktop'
			).classes
		).toEqual( [ 'has-hover', 'has-shadow-hover' ] );
		expect(
			getStylePreview(
				{ style: { zealblocks: { borderHover: '#f00' } } },
				'Desktop'
			)
		).toEqual( {
			style: { '--zealblocks-container-hover-border': '#f00' },
			classes: [ 'has-hover', 'has-hover-border' ],
		} );
	} );

	it( 'previews the reverse order inline', () => {
		expect(
			getStylePreview(
				{ layout: FLEX, style: { zealblocks: { reverse: true } } },
				'Desktop'
			).style
		).toEqual( { flexDirection: 'row-reverse' } );
	} );
} );

describe( 'presets', () => {
	it( 'are grids that drop to one column on mobile, with columns that set a layout', () => {
		expect( PRESETS.length ).toBeGreaterThan( 0 );

		PRESETS.forEach( ( preset ) => {
			expect( preset.layout.type ).toBe( 'grid' );
			expect( preset.style[ '@mobile' ].layout.columnCount ).toBe( 1 );

			preset.innerBlocks.forEach( ( [ name, attributes ] ) => {
				expect( name ).toBe( 'zealblocks/container' );
				// Without a layout, a column would show the presets itself.
				expect( attributes.layout ).toEqual( { type: 'constrained' } );

				const span = attributes.style?.layout?.columnSpan ?? 1;

				// A span wider than the grid makes the browser add a column.
				expect( span ).toBeLessThanOrEqual( preset.layout.columnCount );

				if ( span > 1 ) {
					expect(
						attributes.style[ '@mobile' ].layout.columnSpan
					).toBe( 1 );
				}
			} );
		} );
	} );

	it( 'merge into the existing style without losing other values', () => {
		const preset = PRESETS.find( ( { name } ) => 'quarters' === name );

		expect(
			withPresetStyle(
				{
					color: { background: '#eee' },
					'@mobile': {
						zealblocks: { zIndex: '2' },
						layout: { minimumColumnWidth: '10rem' },
					},
				},
				preset
			)
		).toEqual( {
			color: { background: '#eee' },
			'@tablet': { layout: { columnCount: 2 } },
			'@mobile': {
				zealblocks: { zIndex: '2' },
				layout: { minimumColumnWidth: '10rem', columnCount: 1 },
			},
		} );
	} );
} );
