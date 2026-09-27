/**
 * Where Radix overlays render.
 *
 * Radix portals Dialog, Popover and Dropdown content to document.body, which
 * is OUTSIDE `.zb-ui`. Since every utility is emitted as `.zb-ui .foo`, an
 * unconfigured Radix overlay renders completely unstyled in wp-admin.
 *
 * One container, carrying the scope class, fixes it for every overlay rather
 * than each component remembering. It also carries the z-index: shadcn ships
 * `z-50`, which sits far below the editor's own popovers.
 *
 * Created lazily, so nothing is appended on screens that never open an overlay.
 */

let container = null;

export function getPortalContainer() {
	if ( container && container.isConnected ) {
		return container;
	}

	container = document.createElement( 'div' );
	container.className = 'zb-ui';
	container.setAttribute( 'data-zb-portal', '' );
	container.style.position = 'relative';
	container.style.zIndex = '200000';
	document.body.appendChild( container );

	return container;
}
