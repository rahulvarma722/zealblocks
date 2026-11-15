/**
 * Container — column widths in a Row (CH-07): the maths, kept pure so it is
 * unit-tested directly. The handles in the canvas and the width bar in the
 * sidebar both use it.
 *
 * Widths are core's own child layout: `style.layout.selfStretch = 'fixed'`
 * (core's "Max": a flex-basis the column may shrink from) and `flexSize` as a
 * percentage, on each child, per device in core's viewport layers. Nothing new
 * reaches the front end; core's layout support prints the flex-basis, and
 * core's own Width control shows the same value.
 *
 * The percentages always add up to 100. The Row's gap is taken from them by
 * flex-shrink, in proportion, so 50 + 50 with a gap is still two equal halves.
 */

/** The narrowest a column may be dragged to, in percent. */
export const MIN_WIDTH = 10;

/** Fractions a dragged width snaps to when it comes close. */
export const SNAP_POINTS = [
	20,
	25,
	100 / 3,
	40,
	50,
	60,
	( 100 / 3 ) * 2,
	75,
	80,
];

/** Child widths that mean "a percentage": core's Max and Fixed. */
const SIZED = [ 'fixed', 'fixedNoShrink' ];

/**
 * Rounds to two decimals, as stored.
 *
 * @param {number} value Percent.
 * @return {number} Rounded.
 */
export const round = ( value ) => Math.round( value * 100 ) / 100;

/**
 * A child's stored width for the edited layer, in percent, or null.
 *
 * A device layer that says nothing about width inherits the base, as core's
 * viewport states do.
 *
 * @param {?Object} style    The child's `style` attribute.
 * @param {?string} stateKey '@tablet', '@mobile' or null for the base.
 * @return {?number} The percentage, or null for no percentage width.
 */
export function getStoredWidth( style, stateKey ) {
	const read = ( layout ) =>
		SIZED.includes( layout?.selfStretch ) &&
		/^\d+(?:\.\d+)?%$/.test( layout?.flexSize ?? '' )
			? parseFloat( layout.flexSize )
			: null;
	const own = stateKey ? style?.[ stateKey ]?.layout : style?.layout;

	if ( stateKey && ( own?.selfStretch || own?.flexSize ) ) {
		return read( own );
	}

	return read( stateKey ? style?.layout : own );
}

/**
 * Each width as a share of their total, so the shares add up to 100.
 *
 * @param {number[]} widths Widths in any unit, e.g. pixels.
 * @return {number[]} Percentages.
 */
export function shares( widths ) {
	const total = widths.reduce( ( sum, width ) => sum + width, 0 );

	return total > 0
		? widths.map( ( width ) => round( ( width / total ) * 100 ) )
		: widths.map( () => round( 100 / widths.length ) );
}

/**
 * The widths for the edited layer: stored ones, and an even share of what
 * is left for the columns without one.
 *
 * @param {Array<?number>} stored Stored widths, null where there is none.
 * @return {number[]} Percentages adding up to 100.
 */
export function resolveWidths( stored ) {
	const set = stored.filter( ( width ) => null !== width );
	const missing = stored.length - set.length;
	const left = Math.max( 0, 100 - set.reduce( ( sum, w ) => sum + w, 0 ) );
	const filled = stored.map( ( width ) =>
		null === width ? left / ( missing || 1 ) : width
	);

	return shares( filled );
}

/**
 * Snaps a width to a near fraction.
 *
 * @param {number} value     Percent.
 * @param {number} threshold How near counts, in percent.
 * @return {number} Snapped or unchanged, rounded.
 */
export function snap( value, threshold = 1.5 ) {
	const near = SNAP_POINTS.find(
		( point ) => Math.abs( point - value ) <= threshold
	);

	return round( undefined === near ? value : near );
}

/**
 * Moves the edge between two neighbouring columns.
 *
 * Only the pair changes, so the other columns keep their widths, and the pair
 * keeps its total. The left column snaps to a near fraction of the whole
 * Row, and neither goes below MIN_WIDTH.
 *
 * @param {number[]} widths       Percentages adding up to 100.
 * @param {number}   index        The left column of the pair.
 * @param {number}   delta        How far the edge moves, in percent of the Row.
 * @param {boolean}  [shouldSnap] Whether to snap. Default true.
 * @return {number[]} New widths.
 */
export function resizePair( widths, index, delta, shouldSnap = true ) {
	const pair = widths[ index ] + widths[ index + 1 ];
	const wanted = widths[ index ] + delta;
	const left = Math.min(
		pair - MIN_WIDTH,
		Math.max( MIN_WIDTH, shouldSnap ? snap( wanted ) : round( wanted ) )
	);
	const next = [ ...widths ];

	next[ index ] = round( left );
	next[ index + 1 ] = round( pair - left );

	return next;
}

/**
 * Puts the edge between two columns where the pointer is.
 *
 * `edge` is the pointer's position across the whole Row, in percent. The
 * left column becomes what lies between the columns before it and the
 * pointer, so the edge follows the pointer whatever the widths were when the
 * drag began, including columns that were sized by their content.
 *
 * @param {number[]} widths     Percentages adding up to 100.
 * @param {number}   index      The left column of the pair.
 * @param {number}   edge       Pointer position across the Row, in percent.
 * @param {boolean}  shouldSnap Whether to snap.
 * @return {number[]} New widths.
 */
export function moveEdge( widths, index, edge, shouldSnap = true ) {
	const before = widths
		.slice( 0, index )
		.reduce( ( sum, width ) => sum + width, 0 );

	return resizePair(
		widths,
		index,
		edge - before - widths[ index ],
		shouldSnap
	);
}

/**
 * Preset splits, by column count.
 *
 * @param {number} count Columns.
 * @return {Array<{name: string, widths: number[]}>} Presets that fit.
 */
export function presetsFor( count ) {
	const third = round( 100 / 3 );
	const twoThirds = round( 100 - third );
	const list = [
		{
			name: 'equal',
			widths: Array( count ).fill( round( 100 / count ) ),
		},
	];

	if ( 2 === count ) {
		list.push(
			{ name: 'third-two-thirds', widths: [ third, twoThirds ] },
			{ name: 'two-thirds-third', widths: [ twoThirds, third ] },
			{ name: 'quarter-three-quarters', widths: [ 25, 75 ] },
			{ name: 'three-quarters-quarter', widths: [ 75, 25 ] }
		);
	}

	if ( 3 === count ) {
		list.push(
			{ name: 'wide-centre', widths: [ 25, 50, 25 ] },
			{ name: 'wide-left', widths: [ 50, 25, 25 ] },
			{ name: 'wide-right', widths: [ 25, 25, 50 ] }
		);
	}

	return list;
}

/**
 * A child's `style` with its width set, or removed, on one layer.
 *
 * @param {?Object} style    The child's `style` attribute.
 * @param {?string} stateKey '@tablet', '@mobile' or null for the base.
 * @param {?number} percent  The width, or null to remove it.
 * @return {Object|undefined} The new `style`.
 */
export function withChildWidth( style, stateKey, percent ) {
	const layer = ( stateKey ? style?.[ stateKey ] : style ) || {};
	const { selfStretch, flexSize, ...rest } = layer.layout || {};
	const layout =
		null === percent
			? rest
			: {
					...rest,
					selfStretch: 'fixed',
					flexSize: `${ round( percent ) }%`,
			  };
	const nextLayer = { ...layer };

	if ( Object.keys( layout ).length ) {
		nextLayer.layout = layout;
	} else {
		delete nextLayer.layout;
	}

	if ( ! stateKey ) {
		return Object.keys( nextLayer ).length ? nextLayer : undefined;
	}

	const next = { ...( style || {} ) };

	if ( Object.keys( nextLayer ).length ) {
		next[ stateKey ] = nextLayer;
	} else {
		delete next[ stateKey ];
	}

	return Object.keys( next ).length ? next : undefined;
}

/**
 * Whether a Container's layout takes column widths on a device: a
 * horizontal flex layout on one line.
 *
 * @param {?Object} layout   The Container's `layout` attribute.
 * @param {?Object} style    Its `style` attribute.
 * @param {?string} stateKey The edited layer.
 * @return {{row: boolean, oneLine: boolean}} Whether it is a row, and on one line.
 */
export function rowState( layout, style, stateKey ) {
	const orientation =
		( stateKey && style?.[ stateKey ]?.layout?.orientation ) ||
		layout?.orientation ||
		'horizontal';

	return {
		row: 'flex' === layout?.type && 'horizontal' === orientation,
		oneLine: 'nowrap' === layout?.flexWrap,
	};
}
