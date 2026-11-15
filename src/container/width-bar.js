/**
 * Container — the column width bar, in the Layout panel of a Row (CH-07):
 * the Row's columns as a bar, with dividers to drag, presets and a reset.
 * Per device: it edits the layer being edited, and shows what applies there.
 * See widths.js for where the widths are stored.
 */

import { __, sprintf } from '@wordpress/i18n';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	Flex,
	Notice,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useRef, useState } from '@wordpress/element';

import { withDevice } from '../shared/device-label';
import {
	getStoredWidth,
	moveEdge,
	presetsFor,
	resizePair,
	resolveWidths,
	rowState,
	withChildWidth,
} from './widths';

const PRESET_LABELS = {
	equal: __( 'Equal', 'zealblocks' ),
	'third-two-thirds': '⅓ + ⅔',
	'two-thirds-third': '⅔ + ⅓',
	'quarter-three-quarters': '¼ + ¾',
	'three-quarters-quarter': '¾ + ¼',
	'wide-centre': '¼ + ½ + ¼',
	'wide-left': '½ + ¼ + ¼',
	'wide-right': '¼ + ¼ + ½',
};

/** Columns a bar is offered for; past six, a grid is the better tool. */
export const MAX_COLUMNS = 6;

/**
 * @param {Object}   props
 * @param {string}   props.clientId      The Row's client ID.
 * @param {Object}   props.attributes    The Row's attributes.
 * @param {Function} props.setAttributes The Row's attribute setter.
 * @param {?string}  props.stateKey      The edited layer.
 * @param {string}   props.device        Core device name.
 * @return {?Element} The fill, or null when the layout takes no widths.
 */
export function WidthBar( {
	clientId,
	attributes,
	setAttributes,
	stateKey,
	device,
} ) {
	const bar = useRef();
	const [ dragging, setDragging ] = useState( null );
	const children = useSelect(
		( select ) =>
			select( blockEditorStore )
				.getBlocks( clientId )
				.map( ( { clientId: id, attributes: childAttributes } ) => ( {
					id,
					style: childAttributes.style,
				} ) ),
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const { layout, style } = attributes;
	const { row, oneLine } = rowState( layout, style, stateKey );

	if ( ! row || children.length < 2 || children.length > MAX_COLUMNS ) {
		return null;
	}

	const stored = children.map( ( child ) =>
		getStoredWidth( child.style, stateKey )
	);
	const hasWidths = stored.some( ( width ) => null !== width );
	const widths = dragging?.widths ?? resolveWidths( stored );
	const label = withDevice(
		__( 'Column widths', 'zealblocks' ),
		stateKey,
		device
	);

	const write = ( next ) =>
		updateBlockAttributes(
			children.map( ( child ) => child.id ),
			Object.fromEntries(
				children.map( ( child, index ) => [
					child.id,
					{
						style: withChildWidth(
							child.style,
							stateKey,
							null === next ? null : next[ index ]
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
		const box = bar.current.getBoundingClientRect();
		const start = widths;
		let next = start;

		handle.setPointerCapture( event.pointerId );

		// The divider follows the pointer across the bar.
		const move = ( moveEvent ) => {
			next = moveEdge(
				start,
				index,
				( ( moveEvent.clientX - box.left ) / box.width ) * 100,
				! moveEvent.altKey
			);
			setDragging( { widths: next } );
		};
		const end = () => {
			handle.removeEventListener( 'pointermove', move );
			handle.removeEventListener( 'pointerup', end );
			handle.removeEventListener( 'pointercancel', end );
			setDragging( null );

			if ( next !== start ) {
				write( next );
			}
		};

		handle.addEventListener( 'pointermove', move );
		handle.addEventListener( 'pointerup', end );
		handle.addEventListener( 'pointercancel', end );
	};

	const onKeyDown = ( index ) => ( event ) => {
		const step = { ArrowLeft: -1, ArrowRight: 1 }[ event.key ];

		if ( step ) {
			event.preventDefault();
			write(
				resizePair(
					widths,
					index,
					step * ( event.shiftKey ? 5 : 1 ),
					false
				)
			);
		}
	};

	return (
		<InspectorControls group="layout">
			<ToolsPanelItem
				hasValue={ () => hasWidths }
				label={ label }
				onDeselect={ () => write( null ) }
				isShownByDefault
				panelId={ clientId }
			>
				<BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel>

				{ ! oneLine && (
					<Notice status="info" isDismissible={ false }>
						{ __(
							'Widths need the columns on one line, so a wider one never wraps.',
							'zealblocks'
						) }{ ' ' }
						<Button
							variant="link"
							onClick={ () =>
								setAttributes( {
									layout: { ...layout, flexWrap: 'nowrap' },
								} )
							}
						>
							{ __( 'Keep on one line', 'zealblocks' ) }
						</Button>
					</Notice>
				) }

				{ oneLine && (
					<Flex direction="column" gap={ 3 } align="stretch">
						<div
							ref={ bar }
							className="zealblocks-width-bar"
							// Inline: the inspector lives outside the canvas
							// iframe, where editor.scss is not loaded.
							style={ {
								position: 'relative',
								display: 'flex',
								height: '36px',
								borderRadius: '2px',
								overflow: 'hidden',
								outline: '1px solid #949494',
								userSelect: 'none',
							} }
						>
							{ widths.map( ( width, index ) => (
								<div
									key={ children[ index ].id }
									style={ {
										flex: `0 0 ${ width }%`,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: '12px',
										background:
											index % 2 ? '#f0f0f0' : '#e0e0e0',
										color: '#1e1e1e',
									} }
								>
									{ `${ Math.round( width ) }%` }
								</div>
							) ) }
							{ widths.slice( 0, -1 ).map( ( width, index ) => {
								const at = widths
									.slice( 0, index + 1 )
									.reduce( ( sum, w ) => sum + w, 0 );

								return (
									// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- A focusable separator with a value is the WAI-ARIA window splitter, an interactive widget; the rule treats every separator as static.
									<div
										key={ `edge-${ children[ index ].id }` }
										role="separator"
										aria-orientation="vertical"
										aria-label={ sprintf(
											/* translators: 1: column number, 2: the next column's number. */
											__(
												'Resize columns %1$d and %2$d',
												'zealblocks'
											),
											index + 1,
											index + 2
										) }
										aria-valuenow={ Math.round( width ) }
										aria-valuemin={ 0 }
										aria-valuemax={ 100 }
										tabIndex={ 0 }
										onPointerDown={ startDrag( index ) }
										onKeyDown={ onKeyDown( index ) }
										style={ {
											position: 'absolute',
											top: 0,
											bottom: 0,
											left: `calc(${ at }% - 6px)`,
											width: '12px',
											cursor: 'col-resize',
											touchAction: 'none',
											display: 'flex',
											justifyContent: 'center',
										} }
									>
										<span
											style={ {
												width: '2px',
												height: '100%',
												background: '#1e1e1e',
											} }
										/>
									</div>
								);
							} ) }
						</div>

						<Flex wrap gap={ 2 } justify="flex-start">
							{ presetsFor( children.length ).map( ( preset ) => (
								<Button
									key={ preset.name }
									size="small"
									variant="secondary"
									onClick={ () => write( preset.widths ) }
								>
									{ PRESET_LABELS[ preset.name ] }
								</Button>
							) ) }
							{ hasWidths && (
								<Button
									size="small"
									variant="tertiary"
									onClick={ () => write( null ) }
								>
									{ __( 'Reset', 'zealblocks' ) }
								</Button>
							) }
						</Flex>

						<p
							style={ {
								margin: 0,
								fontSize: '12px',
								color: '#757575',
							} }
						>
							{ __(
								'Drag a divider here or between the columns in the canvas. Arrow keys move a focused divider. Reset lets each column size to its content again.',
								'zealblocks'
							) }
						</p>
					</Flex>
				) }
			</ToolsPanelItem>
		</InspectorControls>
	);
}
