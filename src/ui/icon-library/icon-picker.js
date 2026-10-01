/**
 * The icon picker — a dialog with search and category filtering.
 *
 * Basic on purpose; the shape is what matters for now.
 *
 * WHERE ITS DATA COMES FROM, AND WHY IT IS TWO PLACES.
 *
 * Geometry — 1.3 MB of SVG paths — is a dynamically imported chunk. A static
 * import would fold it into the editor bundle for everyone, including sessions
 * that never open the picker, and because wp-scripts disables webpack's chunk
 * sharing every block that imported it would carry its OWN copy.
 *
 * Text — labels and category titles — comes from REST, resolved by PHP.
 *
 * That split is not an optimisation, it is the only arrangement in which the
 * picker can be translated. A chunk is loaded by the webpack runtime, not
 * enqueued, so it is not a registered script handle; WordPress looks up JS
 * translations by md5 of a handle's src, finds nothing, and every label stays
 * English with no error. PHP has no such problem.
 *
 * Both are fetched in parallel on first open, so the round trip costs nothing
 * against a 1.3 MB download.
 */

import { __ } from '@wordpress/i18n';
import { useState, useEffect, useMemo, useRef } from '@wordpress/element';
import { SearchControl, Spinner } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/ui/components/dialog';
import { useVirtualizer } from '@tanstack/react-virtual';

import { primeIcon } from './use-icon';
import '@/ui/tailwind.css';

/*
 * Geometry copied from core's own icon picker
 * (wp-includes/blocks/icon/editor.css), so this reads as part of the editor
 * rather than as a plugin's idea of one:
 *
 *   sidebar   280px          grid       auto-fill, min 150px per cell
 *   icon      24px + 12px    label      12px, 4px/8px padding beneath
 *
 * Cell states come from there too. Core renders each cell as a `Button` with
 * `variant={ selected ? 'primary' : undefined }`, which is: hover tints the
 * TEXT with the admin accent and leaves the background alone, and selection is
 * a solid accent fill with white on top.
 *
 * Columns are RESPONSIVE there, which a virtualiser cannot assume — it needs
 * a row height and a row count up front. So the column count is measured from
 * the container instead of hard-coded, and recomputed when it resizes.
 */
const MIN_CELL = 150;
const ROW_HEIGHT = 84;
const SIDEBAR_WIDTH = 280;
const GRID_HEIGHT = 560;

/*
 * Core's header band: 72px from the top of the modal, with the title centred in
 * it and the rule along its bottom edge. Content then starts at 72px with 4px
 * of padding above it.
 */
const HEADER_HEIGHT = 72;

/** `--wpds-color-stroke-surface-neutral`, the colour core gives that rule. */
const HEADER_RULE_COLOR = '#dbdbdb';

/** Resolved once per session, shared by every picker instance. */
let dataPromise = null;

/**
 * Fetches geometry and text together, and merges them into one map.
 *
 * @return {Promise<Object>} { CATEGORIES, ICONS }.
 */
function loadIconData() {
	if ( ! dataPromise ) {
		dataPromise = Promise.all( [
			/*
			 * The chunk is NAMED, and that name is load-bearing. Left to
			 * webpack it is `898.js`, an id that moves whenever the module
			 * graph does — which would change this file's path, and with it
			 * anything keyed to that path, silently.
			 */
			import(
				/* webpackChunkName: "icons-data" */ '@/ui/icon-library/icons-data'
			),
			apiFetch( { path: '/zealblocks/v1/icon-catalog' } ),
		] )
			.then( ( [ geometry, catalog ] ) => {
				const ICONS = {};

				/*
				 * Driven by the catalog, not the geometry: an icon with no
				 * label cannot be searched for or shown, so it has no business
				 * in the grid. This also means a slug present in one and not
				 * the other is dropped rather than rendered half-formed.
				 */
				Object.entries( catalog?.icons ?? {} ).forEach(
					( [ slug, text ] ) => {
						const art = geometry.ICONS[ slug ];

						if ( art ) {
							ICONS[ slug ] = { ...art, ...text };
						}
					}
				);

				return {
					CATEGORIES: catalog?.categories ?? {},
					ICONS,
				};
			} )
			.catch( () => {
				// Never cache a failure, or the picker stays empty for the session.
				dataPromise = null;
				return { CATEGORIES: {}, ICONS: {} };
			} );
	}

	return dataPromise;
}

/**
 * The grid, once the data has arrived.
 *
 * @param {Object}   props                  Props.
 * @param {Object}   props.data             { CATEGORIES, ICONS }.
 * @param {?string}  props.value            Currently selected slug.
 * @param {Function} props.onSelect         Called with the chosen slug.
 * @param {Function} props.onScrolledChange Called with whether the grid is scrolled.
 * @return {Element} The browser.
 */
function Browser( { data, value, onSelect, onScrolledChange } ) {
	const { CATEGORIES, ICONS } = data;
	const [ search, setSearch ] = useState( '' );
	const [ category, setCategory ] = useState( '' );
	const [ columns, setColumns ] = useState( 6 );
	const scrollRef = useRef( null );

	const results = useMemo( () => {
		const term = search.trim().toLowerCase();

		return Object.entries( ICONS ).filter( ( [ slug, icon ] ) => {
			if ( category && ! ( icon.cats || [] ).includes( category ) ) {
				return false;
			}

			if ( ! term ) {
				return true;
			}

			// Match the slug as well as the label: someone typing "chevron"
			// should find it even where the label reads differently.
			return (
				slug.includes( term ) ||
				icon.label.toLowerCase().includes( term )
			);
		} );
	}, [ ICONS, search, category ] );

	/*
	 * Core sizes its grid with `auto-fill, minmax(150px, 1fr)`, so the column
	 * count follows the container. A virtualiser needs that as a number, so it
	 * is measured rather than hard-coded.
	 */
	useEffect( () => {
		const node = scrollRef.current;

		if ( ! node || typeof window.ResizeObserver === 'undefined' ) {
			return undefined;
		}

		const measure = () =>
			setColumns(
				Math.max( 1, Math.floor( node.clientWidth / MIN_CELL ) )
			);

		measure();

		const observer = new window.ResizeObserver( measure );
		observer.observe( node );

		return () => observer.disconnect();
	}, [] );

	// Chunk the flat results into rows the virtualiser can index.
	const rows = useMemo( () => {
		const out = [];

		for ( let i = 0; i < results.length; i += columns ) {
			out.push( results.slice( i, i + columns ) );
		}

		return out;
	}, [ results, columns ] );

	const virtualizer = useVirtualizer( {
		count: rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 3,
	} );

	return (
		<div className="flex gap-6" style={ { height: GRID_HEIGHT } }>
			{ /*
			 * The search box is pinned and only the category list scrolls, so
			 * the field stays reachable however far down the list you are.
			 * `min-h-0` is what lets the list actually shrink: a flex child
			 * defaults to min-height:auto, which would size it to its content
			 * and push the overflow onto the column instead.
			 */ }
			<div
				className="flex shrink-0 flex-col"
				style={ { width: SIDEBAR_WIDTH } }
			>
				<div className="shrink-0">
					<SearchControl
						__nextHasNoMarginBottom
						value={ search }
						onChange={ setSearch }
						label={ __( 'Search icons', 'zealblocks' ) }
						placeholder={ __( 'Search', 'zealblocks' ) }
					/>
				</div>

				<div className="mt-4 min-h-0 flex-1 overflow-y-auto">
					<button
						type="button"
						onClick={ () => setCategory( '' ) }
						className={ `flex w-full cursor-pointer items-center justify-between border-none px-3 py-2 text-left text-sm ${
							! category
								? 'bg-muted font-medium'
								: 'bg-transparent hover:bg-muted'
						}` }
					>
						{ __( 'All', 'zealblocks' ) }
					</button>

					{ Object.entries( CATEGORIES ).map( ( [ slug, title ] ) => (
						<button
							key={ slug }
							type="button"
							onClick={ () => setCategory( slug ) }
							className={ `flex w-full cursor-pointer items-center justify-between border-none px-3 py-2 text-left text-sm ${
								category === slug
									? 'bg-muted font-medium'
									: 'bg-transparent hover:bg-muted'
							}` }
						>
							<span>{ title }</span>
							<span aria-hidden="true">›</span>
						</button>
					) ) }
				</div>
			</div>

			{ /*
			 * Core's own test, verbatim: the header rule appears the moment
			 * scrollTop leaves 0 and goes again when it returns. React bails
			 * out when the boolean is unchanged, so this runs on every scroll
			 * frame without re-rendering.
			 */ }
			<div
				ref={ scrollRef }
				onScroll={ ( event ) =>
					onScrolledChange( event.currentTarget.scrollTop > 0 )
				}
				className="flex-1 overflow-y-auto pt-1"
			>
				<div
					style={ {
						height: virtualizer.getTotalSize(),
						position: 'relative',
					} }
				>
					{ virtualizer.getVirtualItems().map( ( row ) => (
						<div
							key={ row.key }
							className="grid"
							style={ {
								gridTemplateColumns: `repeat(${ columns }, minmax(0, 1fr))`,
								position: 'absolute',
								top: 0,
								left: 0,
								width: '100%',
								height: row.size,
								transform: `translateY(${ row.start }px)`,
							} }
						>
							{ rows[ row.index ].map( ( [ slug, icon ] ) => {
								const isSelected = value === slug;

								return (
									<button
										key={ slug }
										type="button"
										onClick={ () => onSelect( slug ) }
										aria-pressed={ isSelected }
										className={ `flex cursor-pointer flex-col items-center justify-start rounded border-none p-0 ${
											isSelected
												? 'bg-[var(--wp-admin-theme-color,#3858e9)] text-white'
												: 'bg-transparent hover:text-[var(--wp-admin-theme-color,#3858e9)]'
										}` }
									>
										<span className="block p-3">
											<svg
												width="24"
												height="24"
												viewBox={ `0 0 ${ icon.width } ${ icon.height }` }
												fill="currentColor"
												aria-hidden="true"
												focusable="false"
											>
												<path d={ icon.path } />
											</svg>
										</span>
										<span className="w-full px-1 pb-2 pt-1 text-center text-xs leading-tight">
											{ icon.label }
										</span>
									</button>
								);
							} ) }
						</div>
					) ) }
				</div>
			</div>
		</div>
	);
}

/**
 * Icon picker dialog.
 *
 * @param {Object}    props              Props.
 * @param {?string}   props.value        Selected slug.
 * @param {Function}  props.onChange     Called with the new slug.
 * @param {Element=}  props.children     The trigger. Omit when driving `open`.
 * @param {boolean=}  props.open         Controls the dialog. Omit to self-manage.
 * @param {Function=} props.onOpenChange Called when the dialog wants to open or close.
 * @return {Element} The picker.
 */
export default function IconPicker( {
	value,
	onChange,
	children,
	open,
	onOpenChange,
} ) {
	const [ internalOpen, setInternalOpen ] = useState( false );
	const [ data, setData ] = useState( null );
	const [ isScrolled, setIsScrolled ] = useState( false );

	/*
	 * Controlled when a caller passes `open`, self-managing otherwise.
	 *
	 * The trigger covers most callers — a button that opens the picker sitting
	 * right where the picker belongs. It does not cover a toolbar button:
	 * ToolbarButton is an Ariakit composite item with its own roving tabindex,
	 * and handing that to Radix's `asChild` to clone is the kind of thing that
	 * works until it silently does not. A caller in that position drives the
	 * open state directly and passes no children.
	 */
	const isControlled = undefined !== open;
	const isOpen = isControlled ? open : internalOpen;

	const setIsOpen = ( next ) => {
		if ( ! isControlled ) {
			setInternalOpen( next );
		}

		onOpenChange?.( next );
	};

	useEffect( () => {
		if ( ! isOpen || data ) {
			return undefined;
		}

		let cancelled = false;

		loadIconData().then( ( loaded ) => {
			if ( ! cancelled ) {
				setData( loaded );
			}
		} );

		return () => {
			cancelled = true;
		};
	}, [ isOpen, data ] );

	return (
		<Dialog
			open={ isOpen }
			onOpenChange={ ( next ) => {
				setIsOpen( next );

				// The grid unmounts with the dialog and comes back at the top,
				// with no scroll event to say so. Without this the rule would
				// still be showing the next time the picker opens.
				if ( ! next ) {
					setIsScrolled( false );
				}
			} }
		>
			{ children ? (
				<DialogTrigger asChild>{ children }</DialogTrigger>
			) : null }

			{ /* gap-0 because the header band below sets its own spacing. */ }
			<DialogContent className="w-[80rem] max-w-[calc(100%-32px)] gap-0">
				{ /*
				 * Pulled out of the dialog's padding so the rule runs the full
				 * width, as core's does — its header is positioned against the
				 * modal frame rather than sitting inside the content box.
				 */ }
				<DialogHeader
					className="-mx-6 -mt-6 justify-center px-6"
					style={ {
						height: HEADER_HEIGHT,
						borderBottom: `1px solid ${
							isScrolled ? HEADER_RULE_COLOR : 'transparent'
						}`,
					} }
				>
					<DialogTitle>
						{ __( 'Choose an icon', 'zealblocks' ) }
					</DialogTitle>
				</DialogHeader>

				{ data ? (
					<Browser
						data={ data }
						value={ value }
						onScrolledChange={ setIsScrolled }
						onSelect={ ( slug ) => {
							/*
							 * Hand the geometry straight to the render cache.
							 * The picker already has it, so the block that is
							 * about to draw this icon needs no request.
							 *
							 * The category NAME goes with it, resolved here
							 * because this is the only place it exists — the
							 * PHP library carries no categories at all, since
							 * the front end never groups or searches. The
							 * inspector shows it when it has it.
							 */
							const chosen = data.ICONS[ slug ];

							primeIcon( slug, {
								...chosen,
								categoryLabel:
									data.CATEGORIES[ chosen?.cats?.[ 0 ] ],
							} );
							onChange( slug );
							setIsOpen( false );
						} }
					/>
				) : (
					<div
						className="flex items-center justify-center"
						style={ { height: GRID_HEIGHT } }
					>
						<Spinner />
					</div>
				) }
			</DialogContent>
		</Dialog>
	);
}
