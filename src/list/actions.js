/**
 * List — the editing operations: next item, join, indent, outdent, leave.
 *
 * Each takes the data registry and runs as one batch, so each is one undo
 * step. The keyboard (keyboard.js) and the toolbar buttons both call them.
 *
 * An item's FIRST block is its Text: that is where Enter makes the next item
 * and Backspace joins. Blocks the author added below it keep their own
 * behaviour, so an item can still hold a description, an image or buttons.
 */

import { cloneBlock, createBlock } from '@wordpress/blocks';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { create, split, toHTMLString } from '@wordpress/rich-text';

import { ITEM, LIST, TEXT } from './constants';

/**
 * A rich text attribute as an HTML string.
 *
 * @param {*} content A string or a RichTextData.
 * @return {string} HTML.
 */
const asHTML = ( content ) => ( content ? String( content ) : '' );

/**
 * Where a Text sits, if it is the first block of a list item.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId The Text's client ID.
 * @return {?Object} { item, list, index, count, parentItem }, or null.
 */
export function getItemContext( select, clientId ) {
	const { getBlockRootClientId, getBlockName, getBlockOrder, getBlockIndex } =
		select( blockEditorStore );
	const item = getBlockRootClientId( clientId );

	if ( ! item || ITEM !== getBlockName( item ) ) {
		return null;
	}

	if ( getBlockOrder( item )[ 0 ] !== clientId ) {
		return null;
	}

	const list = getBlockRootClientId( item );
	const listParent = getBlockRootClientId( list );

	return {
		item,
		list,
		index: getBlockIndex( item ),
		count: getBlockOrder( list ).length,
		parentItem:
			listParent && ITEM === getBlockName( listParent )
				? listParent
				: null,
	};
}

/**
 * The attributes a new Text takes from the one it splits from: its look, not
 * its identity or content.
 *
 * @param {Object} attributes The Text's attributes.
 * @return {Object} Attributes for its new neighbour.
 */
function inherited( attributes ) {
	const { content, anchor, metadata, ...rest } = attributes;

	return rest;
}

/**
 * The selection inside one Text, or its end when the selection is elsewhere.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId The Text's client ID.
 * @param {number}   length   Its text length.
 * @return {{start: number, end: number}} Offsets.
 */
function caret( select, clientId, length ) {
	const { getSelectionStart, getSelectionEnd } = select( blockEditorStore );
	const start = getSelectionStart();

	if ( clientId !== start.clientId || 'number' !== typeof start.offset ) {
		return { start: length, end: length };
	}

	const end = getSelectionEnd();

	return {
		start: start.offset,
		end: clientId === end.clientId ? end.offset ?? start.offset : length,
	};
}

/**
 * The Text a joined item merges into: the last one of the item above,
 * through its nested list if it ends with one.
 *
 * @param {Function} select   Registry select.
 * @param {string}   clientId An item.
 * @return {?Object} The Text block, or null.
 */
function lastText( select, clientId ) {
	const blocks = select( blockEditorStore ).getBlocks( clientId );
	const last = blocks[ blocks.length - 1 ];

	if ( last && LIST === last.name && last.innerBlocks.length ) {
		return lastText(
			select,
			last.innerBlocks[ last.innerBlocks.length - 1 ].clientId
		);
	}

	if ( last && TEXT === last.name ) {
		return last;
	}

	return blocks.find( ( block ) => TEXT === block.name ) ?? null;
}

/**
 * Moves an item out of its nested list, to just after the item that held it.
 *
 * @param {Object} registry Data registry.
 * @param {string} itemId   The item.
 * @return {boolean} Whether it moved.
 */
export function outdent( registry, itemId ) {
	const { getBlockRootClientId, getBlockName, getBlockIndex, getBlockOrder } =
		registry.select( blockEditorStore );
	const { moveBlocksToPosition, removeBlock } =
		registry.dispatch( blockEditorStore );
	const list = getBlockRootClientId( itemId );
	const parentItem = getBlockRootClientId( list );

	if ( ! parentItem || ITEM !== getBlockName( parentItem ) ) {
		return false;
	}

	const outerList = getBlockRootClientId( parentItem );

	registry.batch( () => {
		moveBlocksToPosition(
			[ itemId ],
			list,
			outerList,
			getBlockIndex( parentItem ) + 1
		);

		if ( ! getBlockOrder( list ).length ) {
			removeBlock( list, false );
		}
	} );

	return true;
}

/**
 * Moves an item into a list nested in the item above it: that item's own
 * nested list when it ends with one, otherwise a new one, made like this list.
 *
 * @param {Object} registry Data registry.
 * @param {string} itemId   The item.
 * @return {boolean} Whether it moved.
 */
export function indent( registry, itemId ) {
	const {
		getBlockRootClientId,
		getBlockIndex,
		getBlockOrder,
		getBlocks,
		getBlockAttributes,
	} = registry.select( blockEditorStore );
	const index = getBlockIndex( itemId );

	if ( index < 1 ) {
		return false;
	}

	const { moveBlocksToPosition, insertBlock } =
		registry.dispatch( blockEditorStore );
	const list = getBlockRootClientId( itemId );
	const previous = getBlockOrder( list )[ index - 1 ];
	const blocks = getBlocks( previous );
	const last = blocks[ blocks.length - 1 ];

	if ( last && LIST === last.name ) {
		moveBlocksToPosition(
			[ itemId ],
			list,
			last.clientId,
			getBlockOrder( last.clientId ).length
		);

		return true;
	}

	/*
	 * A new nested list, built with the item already in it. Moving the item
	 * into a list inserted a moment before does nothing: core only allows
	 * blocks into a list once the list has rendered and registered what it
	 * accepts. So the item is copied in, the original removed, and the caret
	 * put back where it was, in the copy.
	 */
	const { getSelectionStart, getSelectionEnd, getBlock } =
		registry.select( blockEditorStore );
	const { removeBlock, selectionChange, selectBlock } =
		registry.dispatch( blockEditorStore );
	const { ordered, type, icon, iconAlign } = getBlockAttributes( list );
	const copy = cloneBlock( getBlock( itemId ) );
	const nested = createBlock( LIST, { ordered, type, icon, iconAlign }, [
		copy,
	] );
	const selectionStart = getSelectionStart();
	const selectionEnd = getSelectionEnd();
	const path = indexPath( registry.select, itemId, selectionStart.clientId );

	registry.batch( () => {
		insertBlock( nested, blocks.length, previous, false );
		removeBlock( itemId, false );

		const target = path ? blockAt( copy, path ) : null;

		if ( target && 'number' === typeof selectionStart.offset ) {
			// A caret in the item's text: put it back, in the copy.
			selectionChange(
				target.clientId,
				selectionStart.attributeKey,
				selectionStart.offset,
				selectionEnd.clientId === selectionStart.clientId
					? selectionEnd.offset
					: selectionStart.offset
			);
		} else if ( target ) {
			// A selected block (the toolbar): keep that block selected.
			selectBlock( target.clientId );
		}
	} );

	return true;
}

/**
 * The path of child indexes from a block down to one of its descendants.
 *
 * @param {Function} select     Registry select.
 * @param {string}   rootId     The block.
 * @param {string}   descendant The descendant.
 * @return {?number[]} Indexes, or null when it is not inside.
 */
function indexPath( select, rootId, descendant ) {
	const { getBlockRootClientId, getBlockIndex } = select( blockEditorStore );
	const path = [];
	let current = descendant;

	while ( current && current !== rootId ) {
		path.unshift( getBlockIndex( current ) );
		current = getBlockRootClientId( current );
	}

	return current === rootId ? path : null;
}

/**
 * The block at a path of child indexes.
 *
 * @param {Object}   block A block object.
 * @param {number[]} path  Indexes.
 * @return {?Object} The block, or null.
 */
function blockAt( block, path ) {
	return path.reduce(
		( current, index ) => current?.innerBlocks?.[ index ] ?? null,
		block
	);
}

/**
 * The Text's value and caret: from the editable itself when the keyboard
 * passes it, since the store's selection lags a key like Home or End by an
 * event; from the store otherwise (the toolbar).
 *
 * @param {Function} select Registry select.
 * @param {Object}   text   The Text block.
 * @param {?Object}  live   A rich-text value with start and end, or null.
 * @return {Object} A rich-text value with start and end.
 */
function valueOf( select, text, live ) {
	if ( live && 'number' === typeof live.start ) {
		return live;
	}

	const value = create( { html: asHTML( text.attributes.content ) } );

	return { ...value, ...caret( select, text.clientId, value.text.length ) };
}

/**
 * Enter in an item's Text: the next item, from the caret on.
 *
 * On an empty item with nothing else in it, Enter leaves instead, as in a
 * word processor: a nested item moves out one level, the last item of a
 * top-level list becomes a Text after the list.
 *
 * @param {Object}  registry Data registry.
 * @param {string}  textId   The item's first Text.
 * @param {?Object} live     The value and caret from the editable, if any.
 * @return {boolean} Whether it was handled.
 */
export function enter( registry, textId, live = null ) {
	const select = registry.select;
	const context = getItemContext( select, textId );

	if ( ! context ) {
		return false;
	}

	const { getBlock, getBlockOrder, getBlockRootClientId, getBlockIndex } =
		select( blockEditorStore );
	const {
		updateBlockAttributes,
		insertBlock,
		removeBlock,
		replaceBlock,
		selectionChange,
	} = registry.dispatch( blockEditorStore );
	const text = getBlock( textId );
	const value = valueOf( select, text, live );
	const isEmpty =
		! value.text.length && 1 === getBlockOrder( context.item ).length;

	if ( isEmpty && context.parentItem ) {
		return outdent( registry, context.item );
	}

	if ( isEmpty && context.index === context.count - 1 ) {
		const after = createBlock( TEXT, inherited( text.attributes ) );
		const listRoot = getBlockRootClientId( context.list );

		registry.batch( () => {
			if ( 1 === context.count ) {
				replaceBlock( context.list, after );
			} else {
				removeBlock( context.item, false );
				insertBlock(
					after,
					getBlockIndex( context.list ) + 1,
					listRoot,
					false
				);
			}

			selectionChange( after.clientId, 'content', 0, 0 );
		} );

		return true;
	}

	const [ before, rest ] = split( value );
	const next = createBlock( TEXT, {
		...inherited( text.attributes ),
		content: toHTMLString( { value: rest } ),
	} );

	registry.batch( () => {
		updateBlockAttributes( textId, {
			content: toHTMLString( { value: before } ),
		} );
		insertBlock(
			createBlock( ITEM, {}, [ next ] ),
			context.index + 1,
			context.list,
			false
		);
		selectionChange( next.clientId, 'content', 0, 0 );
	} );

	return true;
}

/**
 * Backspace at the very start of an item's Text: the item joins the one
 * above, its text appended to that item's last Text and its other blocks
 * moved after that item's. The first item of a nested list moves out instead.
 *
 * @param {Object} registry Data registry.
 * @param {string} textId   The item's first Text.
 * @return {boolean} Whether it was handled.
 */
export function joinPrevious( registry, textId ) {
	const select = registry.select;
	const context = getItemContext( select, textId );

	if ( ! context ) {
		return false;
	}

	if ( 0 === context.index ) {
		return context.parentItem ? outdent( registry, context.item ) : false;
	}

	const { getBlock, getBlockOrder } = select( blockEditorStore );
	const {
		updateBlockAttributes,
		moveBlocksToPosition,
		removeBlock,
		selectionChange,
	} = registry.dispatch( blockEditorStore );
	const previous = getBlockOrder( context.list )[ context.index - 1 ];
	const target = lastText( select, previous );

	if ( ! target ) {
		return false;
	}

	const text = getBlock( textId );
	const offset = create( { html: asHTML( target.attributes.content ) } ).text
		.length;
	const others = getBlockOrder( context.item ).filter(
		( id ) => id !== textId
	);

	registry.batch( () => {
		updateBlockAttributes( target.clientId, {
			content:
				asHTML( target.attributes.content ) +
				asHTML( text.attributes.content ),
		} );

		if ( others.length ) {
			moveBlocksToPosition(
				others,
				context.item,
				previous,
				getBlockOrder( previous ).length
			);
		}

		removeBlock( context.item, false );
		selectionChange( target.clientId, 'content', offset, offset );
	} );

	return true;
}
