/**
 * The new-tab rel tokens. Pure, so the tests can load it without the editor.
 */

export const NEW_TAB_TARGET = '_blank';

/*
 * Renamed from NOFOLLOW_REL, which was simply wrong: these are the
 * reverse-tabnabbing guards, and neither is `nofollow`. Core calls the same
 * pair NEW_TAB_REL.
 */
export const NEW_TAB_REL = [ 'noreferrer', 'noopener' ];

/**
 * Adds or removes the new-tab rel tokens, leaving every other token alone.
 *
 * The old code ASSIGNED rel wholesale on each LinkControl change, so an author
 * who had typed `sponsored` into "Link rel" lost it the next time they edited
 * the URL — and unchecking "open in new tab" cleared the field entirely.
 * Managing only the two tokens this control owns keeps the author's intent.
 *
 * @param {string}  rel           Current rel attribute.
 * @param {boolean} opensInNewTab Whether the link opens in a new tab.
 * @return {string} The updated rel attribute.
 */
export function withNewTabRel( rel, opensInNewTab ) {
	const kept = ( rel || '' )
		.split( /\s+/ )
		.filter( ( token ) => token && ! NEW_TAB_REL.includes( token ) );

	return ( opensInNewTab ? [ ...kept, ...NEW_TAB_REL ] : kept ).join( ' ' );
}
