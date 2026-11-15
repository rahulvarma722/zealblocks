/**
 * List — the keys inside an item's Text: Enter for the next item, Backspace
 * to join, Tab and Shift+Tab to nest. For the Text block, which uses it only
 * when it is the first block of a list item.
 *
 * A capture listener on the editable, so it runs before RichText's own
 * handlers, which skip an event that was already handled
 * (`event.defaultPrevented`). Shift+Enter is left to RichText: a line break.
 */

import { useRegistry } from '@wordpress/data';
import { useRefEffect } from '@wordpress/compose';
import { create } from '@wordpress/rich-text';

import {
	enter,
	getItemContext,
	indent,
	joinPrevious,
	outdent,
} from './actions';

/**
 * The editable's value and caret, read from the page.
 *
 * The store's selection is updated on `selectionchange`, an event after a key
 * like Home or End moved the caret: read there, Enter could split at the old
 * position. RichText reads the page the same way.
 *
 * @param {Element} element The editable.
 * @return {?Object} A rich-text value with start and end, or null.
 */
function liveValue( element ) {
	const selection = element.ownerDocument.defaultView.getSelection();

	if ( ! selection || ! selection.rangeCount ) {
		return null;
	}

	const range = selection.getRangeAt( 0 );

	if ( ! element.contains( range.startContainer ) ) {
		return null;
	}

	try {
		return create( { element, range, __unstableIsEditableTree: true } );
	} catch ( error ) {
		return null;
	}
}

/**
 * @param {string} clientId The Text's client ID.
 * @return {Function} A ref for the Text's editable element.
 */
export function useListKeys( clientId ) {
	const registry = useRegistry();

	return useRefEffect(
		( element ) => {
			const onKeyDown = ( event ) => {
				if (
					event.defaultPrevented ||
					event.isComposing ||
					event.altKey ||
					event.metaKey ||
					event.ctrlKey
				) {
					return;
				}

				const context = getItemContext( registry.select, clientId );

				if ( ! context ) {
					return;
				}

				let handled = false;

				if ( 'Enter' === event.key && ! event.shiftKey ) {
					handled = enter( registry, clientId, liveValue( element ) );
				} else if ( 'Backspace' === event.key && ! event.shiftKey ) {
					const value = liveValue( element );

					if ( value && 0 === value.start && 0 === value.end ) {
						handled = joinPrevious( registry, clientId );
					}
				} else if ( 'Tab' === event.key ) {
					handled = event.shiftKey
						? outdent( registry, context.item )
						: indent( registry, context.item );
				}

				if ( handled ) {
					event.preventDefault();
				}
			};

			element.addEventListener( 'keydown', onKeyDown, true );

			return () =>
				element.removeEventListener( 'keydown', onKeyDown, true );
		},
		[ clientId, registry ]
	);
}
