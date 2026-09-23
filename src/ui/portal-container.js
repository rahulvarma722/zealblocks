/**
 * Where Radix overlays are rendered.
 *
 * THE PROBLEM THIS SOLVES.
 *
 * Radix renders Dialog, Popover and Dropdown content through a portal attached
 * to `document.body`, which is OUTSIDE whatever element our styles are scoped
 * to. Our stylesheet is scoped (`.zb-ui`) precisely so Tailwind cannot leak
 * into WordPress admin chrome — so by default every overlay lands somewhere the
 * scope does not reach and renders completely unstyled.
 *
 * Every Radix portal accepts a `container`. Pointing them all at one element
 * that itself carries the scope class fixes it once, everywhere, rather than
 * each component remembering.
 *
 * Created lazily so nothing is appended to the DOM on screens that never open
 * an overlay.
 */

let container = null;

export function getPortalContainer() {
	if ( container && container.isConnected ) {
		return container;
	}

	container = document.createElement( 'div' );
	container.className = 'zb-ui';
	container.setAttribute( 'data-zb-portal', '' );
	document.body.appendChild( container );

	return container;
}
