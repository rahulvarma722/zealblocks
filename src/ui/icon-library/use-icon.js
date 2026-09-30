/**
 * Resolving a saved icon slug in the editor.
 *
 * WHY THIS IS NOT THE PICKER'S DATA.
 *
 * Drawing an icon a block ALREADY has needs one slug and about 700 bytes.
 * Browsing the picker needs all 1992 icons and their categories. Serving both
 * from the same source would mean every editor session downloads the whole
 * library to render one glyph, so they are deliberately separate:
 *
 *   this file          one slug at a time, from PHP's inlined data or REST
 *   ui/icons-data.js   the full set, dynamically imported when the picker opens
 *
 * WHY MOST ICONS NEVER REACH THE NETWORK.
 *
 * PHP parses the post during page render and prints every icon it already
 * uses to `window.zealblocksData.icons`, so the cache below is warm before the
 * first component mounts. A post with 100 icons costs ZERO requests.
 *
 * That key is one slot in a shared global — Editor_Settings parses the post
 * once and lets any feature contribute, so icons are not a special case.
 *
 * The fetch below therefore only runs for an icon chosen AFTER load.
 */

import apiFetch from '@wordpress/api-fetch';
import { useState, useEffect } from '@wordpress/element';

/**
 * Slug => icon, shared by every block on the page.
 *
 * Module scope on purpose: twenty blocks using the same icon should resolve it
 * once, not twenty times.
 *
 * @type {Map<string, Object|null>}
 */
const cache = new Map();

/*
 * Seed from what PHP printed.
 *
 * This runs at module scope and that is safe, because the inline script is
 * printed BEFORE the bundle — the global is already there when this evaluates.
 *
 * Editor settings cannot carry this: core/block-editor drops unknown keys.
 */
Object.entries( window.zealblocksData?.icons ?? {} ).forEach(
	( [ slug, icon ] ) => cache.set( slug, icon )
);

/** In-flight requests, so simultaneous mounts do not each fire one. */
const pending = new Map();

/**
 * Fetches one icon, reusing the cache and any in-flight request.
 *
 * @param {string} slug Icon slug.
 * @return {Promise<Object|null>} The icon, or null if unknown.
 */
function fetchIcon( slug ) {
	if ( cache.has( slug ) ) {
		return Promise.resolve( cache.get( slug ) );
	}

	if ( ! pending.has( slug ) ) {
		pending.set(
			slug,
			apiFetch( {
				path: `/zealblocks/v1/icons?slugs=${ encodeURIComponent(
					slug
				) }`,
			} )
				.then( ( icons ) => {
					const icon = icons?.[ slug ] ?? null;
					cache.set( slug, icon );
					pending.delete( slug );
					return icon;
				} )
				.catch( () => {
					/*
					 * Do not cache a failure. A network blip would otherwise
					 * leave the icon permanently blank for the whole session
					 * with no way to retry.
					 */
					pending.delete( slug );
					return null;
				} )
		);
	}

	return pending.get( slug );
}

/**
 * Puts an icon into the cache without a request.
 *
 * The picker already holds every icon's geometry once its data chunk has
 * loaded, so a slug chosen there needs no round trip — handing it over
 * directly is both faster and one less thing that can fail.
 *
 * This is why fetchIcon() is a fallback rather than the main path: between
 * this and the icons PHP inlines, the only slugs left are ones that reached
 * the editor some other way — a block pasted from another post, or an icon
 * past the inline cap.
 *
 * @param {string} slug Icon slug.
 * @param {Object} icon { label, width, height, path }.
 * @return {void}
 */
export function primeIcon( slug, icon ) {
	if ( slug && icon ) {
		cache.set( slug, icon );
	}
}

/**
 * Resolves a slug to icon data.
 *
 * @param {?string} slug Icon slug, or empty.
 * @return {?Object} { label, width, height, path }, or null.
 */
export function useIcon( slug ) {
	// Already in state on the first render for anything PHP printed, so an
	// icon the post already used never flashes in.
	const [ icon, setIcon ] = useState( () =>
		slug ? cache.get( slug ) ?? null : null
	);

	useEffect( () => {
		if ( ! slug ) {
			setIcon( null );
			return undefined;
		}

		let cancelled = false;

		fetchIcon( slug ).then( ( result ) => {
			if ( ! cancelled ) {
				setIcon( result );
			}
		} );

		// The block may be removed while the request is in flight.
		return () => {
			cancelled = true;
		};
	}, [ slug ] );

	return icon;
}

/**
 * Renders icon data as an SVG.
 *
 * Mirrors Icon_Library::render() in PHP. The two have to agree, because the
 * same slug is drawn here in the editor and there on the front end — a
 * difference in viewBox or fill shows up as the block visibly changing when
 * the page is published.
 *
 * @param {Object}  props           Props.
 * @param {?Object} props.icon      Icon data from useIcon().
 * @param {string=} props.className Extra classes.
 * @param {string=} props.label     Accessible label. Empty hides the icon from
 *                                  assistive technology, which is right for an
 *                                  icon sitting beside its own text.
 * @param {Object=} props.style     Inline style, for values a class cannot
 *                                  carry — the icon block's free rotation.
 *                                  render.php sets the same attribute.
 * @return {?Element} The SVG, or null.
 */
export function Icon( { icon, className = '', label = '', style } ) {
	if ( ! icon ) {
		return null;
	}

	/*
	 * Same branch as the PHP. An icon with a label is content and announces
	 * itself; one without is decoration and must not, or a screen reader reads
	 * the button's text twice.
	 */
	const accessibility = label
		? { role: 'img', 'aria-label': label }
		: { 'aria-hidden': 'true', focusable: 'false' };

	return (
		<svg
			className={ `zealblocks-icon ${ className }`.trim() }
			xmlns="http://www.w3.org/2000/svg"
			viewBox={ `0 0 ${ icon.width } ${ icon.height }` }
			fill="currentColor"
			style={ style }
			{ ...accessibility }
		>
			<path d={ icon.path } />
		</svg>
	);
}
