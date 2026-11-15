/**
 * Container — drag handles between the columns of a Row, in the canvas
 * (CH-07). See widths.js for where the widths are stored.
 *
 * While a handle is dragged, the columns are previewed by setting their
 * flex-basis on the canvas elements directly; letting go writes every width
 * in one update, so a drag is one undo step and the block list does not
 * re-render on each pixel. Each handle is a focusable separator, the WAI-ARIA
 * window splitter: arrow keys move it by 1%, with Shift by 5%.
 */

import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { useLayoutEffect, useRef, useState } from '@wordpress/element';

import {
	getStoredWidth,
	moveEdge,
	resizePair,
	resolveWidths,
	shares,
	withChildWidth,
} from './widths';

/**
 * The canvas elements of a block's children, in order.
 *
 * @param {?Element} parent The block's element.
 * @param {string[]} ids    Child client IDs, in order.
 * @return {Element[]} Elements found, in the same order.
 */
function childElements( parent, ids ) {
	if ( ! parent ) {
		return [];
	}

	return ids
		.map( ( id ) =>
			parent.querySelector( `:scope > [data-block="${ id }"]` )
		)
		.filter( Boolean );
}

/**
 * @param {Object}  props
 * @param {string}  props.clientId The Row's client ID.
 * @param {?string} props.stateKey The edited layer.
 * @return {Element} The handles.
 */
export function WidthHandles( { clientId, stateKey } ) {
	const overlay = useRef();
	const [ edges, setEdges ] = useState( [] );
	const [ live, setLive ] = useState( null );
	const children = useSelect(
		( select ) =>
			select( blockEditorStore )
				.getBlocks( clientId )
				.map( ( { clientId: id, attributes } ) => ( {
					id,
					style: attributes.style,
				} ) ),
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const ids = children.map( ( child ) => child.id );
	const idsKey = ids.join( ',' );

	// Where the edges are: midway across each gap, from the canvas layout.
	useLayoutEffect( () => {
		const parent = overlay.current?.parentElement;

		if ( ! parent ) {
			return undefined;
		}

		const measure = () => {
			const box = parent.getBoundingClientRect();
			const elements = childElements( parent, ids );

			setEdges(
				elements.slice( 0, -1 ).map( ( element, index ) => {
					const left = element.getBoundingClientRect();
					const right = elements[ index + 1 ].getBoundingClientRect();

					return {
						x:
							( left.right + right.left ) / 2 -
							box.left -
							parent.clientLeft,
						top: Math.min( left.top, right.top ) - box.top,
						height:
							Math.max( left.bottom, right.bottom ) -
							Math.min( left.top, right.top ),
					};
				} )
			);
		};

		const view = parent.ownerDocument.defaultView;
		const observer = new view.ResizeObserver( measure );

		observer.observe( parent );
		childElements( parent, ids ).forEach( ( element ) =>
			observer.observe( element )
		);
		measure();

		return () => observer.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey stands for ids.
	}, [ idsKey ] );

	const stored = children.map( ( child ) =>
		getStoredWidth( child.style, stateKey )
	);

	/**
	 * The widths to start from: the stored ones when every column has one,
	 * exactly; otherwise shares of the measured widths, since a column sized
	 * by its content has no number to start from. Measured shares drift, as a
	 * narrow column cannot shrink below its content.
	 *
	 * @return {{elements: Element[], widths: number[]}} Them.
	 */
	const measureWidths = () => {
		const elements = childElements( overlay.current?.parentElement, ids );
		const pixels = elements.map(
			( element ) => element.getBoundingClientRect().width
		);

		return {
			elements,
			widths: stored.every( ( width ) => null !== width )
				? resolveWidths( stored )
				: shares( pixels ),
		};
	};

	/**
	 * Writes every column's width to the edited layer, in one update.
	 *
	 * @param {number[]} widths Percentages, in child order.
	 */
	const write = ( widths ) =>
		updateBlockAttributes(
			ids,
			Object.fromEntries(
				children.map( ( child, index ) => [
					child.id,
					{
						style: withChildWidth(
							child.style,
							stateKey,
							widths[ index ]
						),
					},
				] )
			),
			{ uniqueByBlock: true }
		);

	const startDrag = ( index ) => ( event ) => {
		if ( 0 !== event.button ) {
			return;
		}

		event.preventDefault();

		const handle = event.currentTarget;
		const { elements, widths } = measureWidths();
		const parent = overlay.current.parentElement;
		const view = parent.ownerDocument.defaultView;
		const computedStyle = view.getComputedStyle( parent );
		const paddingLeft = parseFloat( computedStyle.paddingLeft ) || 0;
		const contentLeft =
			parent.getBoundingClientRect().left +
			parent.clientLeft +
			paddingLeft;
		const contentWidth =
			parent.clientWidth -
			paddingLeft -
			( parseFloat( computedStyle.paddingRight ) || 0 );
		let next = widths;

		handle.setPointerCapture( event.pointerId );

		// The edge follows the pointer across the Row's content box.
		const move = ( moveEvent ) => {
			next = moveEdge(
				widths,
				index,
				( ( moveEvent.clientX - contentLeft ) / contentWidth ) * 100,
				! moveEvent.altKey
			);
			// Preview only: the canvas, not the block list.
			elements.forEach( ( element, position ) => {
				element.style.flexBasis = `${ next[ position ] }%`;
				element.style.flexGrow = '0';
				element.style.flexShrink = '1';
			} );
			setLive( { index, widths: next } );
		};

		const end = () => {
			handle.removeEventListener( 'pointermove', move );
			handle.removeEventListener( 'pointerup', end );
			handle.removeEventListener( 'pointercancel', end );
			elements.forEach( ( element ) => {
				element.style.removeProperty( 'flex-basis' );
				element.style.removeProperty( 'flex-grow' );
				element.style.removeProperty( 'flex-shrink' );
			} );
			setLive( null );

			if ( next !== widths ) {
				write( next );
			}
		};

		handle.addEventListener( 'pointermove', move );
		handle.addEventListener( 'pointerup', end );
		handle.addEventListener( 'pointercancel', end );
	};

	const onKeyDown = ( index ) => ( event ) => {
		const step = { ArrowLeft: -1, ArrowRight: 1 }[ event.key ];

		if ( ! step ) {
			return;
		}

		event.preventDefault();
		write(
			resizePair(
				measureWidths().widths,
				index,
				step * ( event.shiftKey ? 5 : 1 ),
				false
			)
		);
	};

	return (
		<div
			ref={ overlay }
			className="wp-block-zealblocks-container__width-handles"
			contentEditable={ false }
		>
			{ edges.map( ( edge, index ) => {
				const shown = live?.widths;
				const left = shown ? shown[ index ] : stored[ index ];
				const right = shown ? shown[ index + 1 ] : stored[ index + 1 ];

				return (
					// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- A focusable separator with a value is the WAI-ARIA window splitter, an interactive widget; the rule treats every separator as static.
					<div
						key={ ids[ index ] }
						role="separator"
						aria-orientation="vertical"
						aria-label={ sprintf(
							/* translators: 1: column number, 2: the next column's number. */
							__( 'Resize columns %1$d and %2$d', 'zealblocks' ),
							index + 1,
							index + 2
						) }
						aria-valuenow={ null === left ? undefined : left }
						aria-valuemin={ 0 }
						aria-valuemax={ 100 }
						tabIndex={ 0 }
						className={
							'wp-block-zealblocks-container__width-handle' +
							( live?.index === index ? ' is-dragging' : '' )
						}
						style={ {
							left: `${ edge.x }px`,
							top: `${ edge.top }px`,
							height: `${ edge.height }px`,
						} }
						onPointerDown={ startDrag( index ) }
						onKeyDown={ onKeyDown( index ) }
					>
						{ ( live?.index === index ||
							( null !== left && null !== right ) ) && (
							<span className="wp-block-zealblocks-container__width-label">
								{ null === left
									? ''
									: `${ Math.round( left ) }%` }
								{ ' | ' }
								{ null === right
									? ''
									: `${ Math.round( right ) }%` }
							</span>
						) }
					</div>
				);
			} ) }
		</div>
	);
}
