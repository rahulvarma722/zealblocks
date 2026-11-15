/**
 * The Container in the editor: what the canvas shows, and what the layout
 * presets write. Both must agree with render.php and Reverse_Order.
 */

import {
	focalPosition,
	getOverlayImageLayer,
	getPreviewDirection,
	getStylePreview,
} from '../../src/container/preview';
import { PRESETS, withPresetStyle } from '../../src/container/presets';
import {
	fromPercent,
	orderMode,
	setOverlayFill,
	toPercent,
} from '../../src/container/values';
import { getPositionPreview } from '../../src/shared/position/preview';

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

describe( 'overlay', () => {
	it( 'previews the fill, opacity, blend and hover per device, with its classes', () => {
		const style = {
			zealblocks: {
				overlay: '#000',
				overlayOpacity: '0.6',
				overlayBlend: 'multiply',
				overlayHoverOpacity: '0.3',
			},
			'@mobile': { zealblocks: { overlayOpacity: '0.8' } },
		};

		expect( getStylePreview( { style }, 'Mobile' ) ).toEqual( {
			style: {
				'--zealblocks-container-overlay': '#000',
				'--zealblocks-container-overlay-opacity': '0.8',
				'--zealblocks-container-overlay-blend': 'multiply',
				'--zealblocks-container-overlay-hover-opacity': '0.3',
			},
			classes: [ 'has-hover', 'has-overlay', 'has-overlay-hover' ],
		} );
	} );

	it( 'writes the image layer exactly as render.php does', () => {
		expect(
			getOverlayImageLayer( {
				overlayImage: { url: 'https://example.org/p.png' },
				overlayImageSize: 'repeat',
				overlayImagePosition: { x: 0.25, y: 0.75 },
			} )
		).toBe( 'url("https://example.org/p.png") 25% 75% / auto repeat' );
		expect(
			getOverlayImageLayer( {
				overlayImage: { url: 'https://example.org/p.png' },
				overlayImageSize: 'bogus',
			} )
		).toBe( 'url("https://example.org/p.png") 50% 50% / cover no-repeat' );
		expect( getOverlayImageLayer( {} ) ).toBe( undefined );

		// The characters render.php percent-encodes, encoded the same way.
		expect(
			getOverlayImageLayer( {
				overlayImage: { url: "https://ex.org/a b;(c)'.png" },
			} )
		).toBe(
			'url("https://ex.org/a%20b%3B%28c%29%27.png") 50% 50% / cover no-repeat'
		);

		// An image alone is an overlay.
		expect(
			getStylePreview(
				{ overlayImage: { url: 'https://example.org/p.png' } },
				'Desktop'
			).classes
		).toEqual( [ 'has-overlay' ] );
	} );

	it( 'rounds and clamps a focal point as Render::focal_point() does', () => {
		expect( focalPosition( { x: 0.33333, y: -2 } ) ).toBe( '33.33% 0%' );
		expect( focalPosition( { x: 5, y: 0.75 } ) ).toBe( '100% 75%' );
		expect( focalPosition( undefined ) ).toBe( '50% 50%' );
		expect( focalPosition( { x: 'a', y: 0.2 } ) ).toBe( '50% 50%' );
	} );

	it( 'seeds a 50% opacity on the base the first time an overlay appears, and only then', () => {
		const first = setOverlayFill( undefined, '@tablet', 'overlay', '#000' );

		expect( first ).toEqual( {
			zealblocks: { overlayOpacity: '0.5' },
			'@tablet': { zealblocks: { overlay: '#000' } },
		} );

		const second = setOverlayFill( first, null, 'overlay', '#fff' );

		expect( second.zealblocks ).toEqual( {
			overlayOpacity: '0.5',
			overlay: '#fff',
		} );

		// A hover fill alone never seeds the base opacity.
		expect(
			setOverlayFill( undefined, null, 'overlayHover', '#000' )
		).toEqual( { zealblocks: { overlayHover: '#000' } } );
	} );

	it( 'converts opacity to and from the slider percentage', () => {
		expect( toPercent( '0.35' ) ).toBe( 35 );
		expect( toPercent( undefined ) ).toBe( undefined );
		expect( fromPercent( 35 ) ).toBe( '0.35' );
		expect( fromPercent( 100 ) ).toBe( '1' );
		expect( fromPercent( 140 ) ).toBe( '1' );
		expect( fromPercent( undefined ) ).toBe( undefined );
	} );
} );

describe( 'child settings', () => {
	it( 'previews align self, order and position for the device', () => {
		const style = {
			zealblocks: {
				alignSelf: 'end',
				position: 'absolute',
				positionTop: '-10px',
			},
			'@mobile': {
				zealblocks: { order: '-9999', position: 'relative' },
			},
		};

		expect( getStylePreview( { style }, 'Mobile' ).style ).toEqual( {
			alignSelf: 'end',
			order: '-9999',
			position: 'relative',
			top: '-10px',
		} );
	} );

	it( 'leaves position out of the canvas when its preview is off', () => {
		const style = { zealblocks: { position: 'absolute' } };

		expect(
			getStylePreview( { style, positionPreview: false }, 'Desktop' )
				.style
		).toEqual( {} );
		expect( getPositionPreview( style, 'Desktop' ) ).toEqual( {
			position: 'absolute',
		} );
	} );

	it( 'reads the order choice back from what is stored', () => {
		expect( orderMode( undefined ) ).toBe( '' );
		expect( orderMode( '-9999' ) ).toBe( 'first' );
		expect( orderMode( '9999' ) ).toBe( 'last' );
		expect( orderMode( '3' ) ).toBe( 'custom' );
	} );
} );
