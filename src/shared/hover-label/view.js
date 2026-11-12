/**
 * A second aria-label while an element is hovered or has keyboard focus.
 *
 * Loaded only on pages that need it (Zealblocks\Block\Hover_Label enqueues
 * it). The Button uses it for an icon-only button whose hover icon carries a
 * label of its own. The label in the data attribute applies while the element
 * is hovered or focused, and the original comes back once it is neither: a
 * pointer leaving a focused button does not take the label away from a
 * keyboard user, and the reverse.
 */

export const ATTRIBUTE = 'data-zealblocks-hover-label';

/**
 * Wires one element.
 *
 * @param {Element} element An element carrying the data attribute.
 * @return {void}
 */
export function bind( element ) {
	const hoverLabel = element.getAttribute( ATTRIBUTE );

	if ( ! hoverLabel ) {
		return;
	}

	const original = element.getAttribute( 'aria-label' );
	let hovered = false;
	let focused = false;

	const sync = () => {
		if ( hovered || focused ) {
			element.setAttribute( 'aria-label', hoverLabel );
		} else if ( null === original ) {
			element.removeAttribute( 'aria-label' );
		} else {
			element.setAttribute( 'aria-label', original );
		}
	};

	const on = ( type, apply ) =>
		element.addEventListener( type, () => {
			apply();
			sync();
		} );

	on( 'mouseenter', () => ( hovered = true ) );
	on( 'mouseleave', () => ( hovered = false ) );
	on( 'focus', () => ( focused = true ) );
	on( 'blur', () => ( focused = false ) );
}

function init() {
	document.querySelectorAll( `[${ ATTRIBUTE }]` ).forEach( bind );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
