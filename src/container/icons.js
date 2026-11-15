/**
 * Container — icons for the variations and the layout presets.
 *
 * Drawn here rather than imported: @wordpress/icons is not a script handle
 * WordPress ships, so importing it would bundle the whole library.
 */

/**
 * An icon of rectangles on a 24×24 grid.
 *
 * @param {Array<number[]>} rects Each `[ x, y, width, height ]`.
 * @return {Element} The SVG.
 */
const boxes = ( rects ) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		aria-hidden="true"
		focusable="false"
	>
		{ rects.map( ( [ x, y, width, height ] ) => (
			<rect
				key={ `${ x }-${ y }` }
				x={ x }
				y={ y }
				width={ width }
				height={ height }
				rx="1"
				fill="currentColor"
			/>
		) ) }
	</svg>
);

export const containerIcon = (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		aria-hidden="true"
		focusable="false"
	>
		<path
			fill="currentColor"
			d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm.5 1.5v13h13v-13h-13ZM8 8h8v3H8V8Zm0 5h8v3H8v-3Z"
		/>
	</svg>
);

export const rowIcon = boxes( [
	[ 3, 7, 5, 10 ],
	[ 9.5, 7, 5, 10 ],
	[ 16, 7, 5, 10 ],
] );

export const stackIcon = boxes( [
	[ 6, 3, 12, 5 ],
	[ 6, 9.5, 12, 5 ],
	[ 6, 16, 12, 5 ],
] );

export const gridIcon = boxes( [
	[ 4, 4, 7, 7 ],
	[ 13, 4, 7, 7 ],
	[ 4, 13, 7, 7 ],
	[ 13, 13, 7, 7 ],
] );

/**
 * A preset's picture: its columns as they sit on desktop.
 *
 * @param {number[]} spans   Column spans, in a grid of `columns` tracks.
 * @param {number}   columns Track count.
 * @param {number}   [rows]  Rows, for the 2×2 grid.
 * @return {Element} The SVG.
 */
export function presetIcon( spans, columns, rows = 1 ) {
	const gap = 1.5;
	const track = ( 20 - gap * ( columns - 1 ) ) / columns;
	const height = ( 14 - gap * ( rows - 1 ) ) / rows;
	const rects = [];
	let column = 0;
	let row = 0;

	spans.forEach( ( span ) => {
		if ( column + span > columns ) {
			column = 0;
			row += 1;
		}

		rects.push( [
			2 + column * ( track + gap ),
			5 + row * ( height + gap ),
			track * span + gap * ( span - 1 ),
			height,
		] );
		column += span;
	} );

	return boxes( rects );
}
