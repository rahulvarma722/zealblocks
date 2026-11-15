/**
 * Container column widths (CH-07): the maths behind the canvas handles and
 * the sidebar bar. The widths are core's child layout, so these pin what is
 * written there, and that a drag only ever moves one edge.
 */

import {
	MIN_WIDTH,
	getStoredWidth,
	moveEdge,
	presetsFor,
	resizePair,
	resolveWidths,
	rowState,
	shares,
	snap,
	withChildWidth,
} from '../../src/container/widths';

const sized = ( flexSize, selfStretch = 'fixed' ) => ( {
	layout: { selfStretch, flexSize },
} );

describe( 'getStoredWidth', () => {
	it( "reads core's Max and Fixed percentages, nothing else", () => {
		expect( getStoredWidth( sized( '40%' ), null ) ).toBe( 40 );
		expect( getStoredWidth( sized( '25%', 'fixedNoShrink' ), null ) ).toBe(
			25
		);
		expect( getStoredWidth( sized( '300px' ), null ) ).toBe( null );
		expect(
			getStoredWidth( { layout: { selfStretch: 'fit' } }, null )
		).toBe( null );
		expect( getStoredWidth( undefined, null ) ).toBe( null );
	} );

	it( 'a device inherits the base unless it says something itself', () => {
		const style = {
			...sized( '40%' ),
			'@tablet': sized( '60%' ),
			'@mobile': { layout: { selfStretch: 'fit' } },
		};

		expect( getStoredWidth( style, '@tablet' ) ).toBe( 60 );
		// Mobile set Fit: no width there, not the base's.
		expect( getStoredWidth( style, '@mobile' ) ).toBe( null );
		expect( getStoredWidth( sized( '40%' ), '@mobile' ) ).toBe( 40 );
	} );
} );

describe( 'shares, resolveWidths and snap', () => {
	it( 'turns widths into percentages adding up to 100', () => {
		expect( shares( [ 100, 300 ] ) ).toEqual( [ 25, 75 ] );
		expect( shares( [ 0, 0 ] ) ).toEqual( [ 50, 50 ] );
	} );

	it( 'shares what is left between columns with no width', () => {
		expect( resolveWidths( [ 50, null, null ] ) ).toEqual( [ 50, 25, 25 ] );
		expect( resolveWidths( [ null, null ] ) ).toEqual( [ 50, 50 ] );
		// Stored widths that do not add up are scaled to 100.
		expect( resolveWidths( [ 30, 30 ] ) ).toEqual( [ 50, 50 ] );
	} );

	it( 'snaps only near a fraction', () => {
		expect( snap( 34 ) ).toBe( 33.33 );
		expect( snap( 49 ) ).toBe( 50 );
		expect( snap( 45 ) ).toBe( 45 );
	} );
} );

describe( 'resizePair', () => {
	it( 'moves one edge: the pair keeps its total, the others their widths', () => {
		expect( resizePair( [ 25, 25, 50 ], 0, 10, false ) ).toEqual( [
			35, 15, 50,
		] );
	} );

	it( 'snaps the left column, and never goes below the minimum', () => {
		expect( resizePair( [ 50, 50 ], 0, -16 ) ).toEqual( [ 33.33, 66.67 ] );
		expect( resizePair( [ 50, 50 ], 0, -90 ) ).toEqual( [
			MIN_WIDTH,
			100 - MIN_WIDTH,
		] );
		expect( resizePair( [ 50, 50 ], 0, 90 ) ).toEqual( [
			100 - MIN_WIDTH,
			MIN_WIDTH,
		] );
	} );
} );

describe( 'moveEdge', () => {
	it( 'puts the edge where the pointer is, across the whole Row', () => {
		expect( moveEdge( [ 50, 50 ], 0, 34 ) ).toEqual( [ 33.33, 66.67 ] );
		// The second edge of three: the first column stays as it is.
		expect( moveEdge( [ 25, 25, 50 ], 1, 62, false ) ).toEqual( [
			25, 37, 38,
		] );
	} );
} );

describe( 'presetsFor', () => {
	it( 'offers equal widths always, and named splits for two and three', () => {
		expect( presetsFor( 4 ) ).toEqual( [
			{ name: 'equal', widths: [ 25, 25, 25, 25 ] },
		] );
		expect( presetsFor( 2 ).map( ( { name } ) => name ) ).toEqual( [
			'equal',
			'third-two-thirds',
			'two-thirds-third',
			'quarter-three-quarters',
			'three-quarters-quarter',
		] );
		presetsFor( 3 ).forEach( ( { widths } ) =>
			expect(
				Math.round( widths.reduce( ( sum, width ) => sum + width, 0 ) )
			).toBe( 100 )
		);
	} );
} );

describe( 'withChildWidth', () => {
	it( "writes core's Max with a percentage, on the base or a device", () => {
		expect( withChildWidth( undefined, null, 33.333 ) ).toEqual(
			sized( '33.33%' )
		);
		expect(
			withChildWidth( { color: { text: '#000' } }, '@tablet', 50 )
		).toEqual( {
			color: { text: '#000' },
			'@tablet': sized( '50%' ),
		} );
	} );

	it( "keeps the rest of the layer's layout, and removes cleanly", () => {
		const style = {
			layout: { selfStretch: 'fixed', flexSize: '40%', columnSpan: 2 },
			'@mobile': sized( '100%' ),
		};

		expect( withChildWidth( style, null, null ) ).toEqual( {
			layout: { columnSpan: 2 },
			'@mobile': sized( '100%' ),
		} );
		expect( withChildWidth( style, '@mobile', null ) ).toEqual( {
			layout: { selfStretch: 'fixed', flexSize: '40%', columnSpan: 2 },
		} );
		expect( withChildWidth( sized( '40%' ), null, null ) ).toBe(
			undefined
		);
	} );
} );

describe( 'rowState', () => {
	it( 'a horizontal flex layout is a row; on one line only with nowrap', () => {
		expect(
			rowState( { type: 'flex', flexWrap: 'nowrap' }, undefined, null )
		).toEqual( { row: true, oneLine: true } );
		expect( rowState( { type: 'flex' }, undefined, null ) ).toEqual( {
			row: true,
			oneLine: false,
		} );
		expect(
			rowState(
				{ type: 'flex', orientation: 'vertical' },
				undefined,
				null
			).row
		).toBe( false );
		expect( rowState( { type: 'grid' }, undefined, null ).row ).toBe(
			false
		);
		// A Row that stacks on mobile is no row there.
		expect(
			rowState(
				{ type: 'flex', flexWrap: 'nowrap' },
				{ '@mobile': { layout: { orientation: 'vertical' } } },
				'@mobile'
			).row
		).toBe( false );
	} );
} );
