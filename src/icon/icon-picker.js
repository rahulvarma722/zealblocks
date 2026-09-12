/**
 * The icon library picker.
 *
 * A searchable grid rather than a dropdown, because a `<select>` of 88 icons
 * shows their LABELS and hides the one thing you are choosing by — what the
 * icon looks like. That was acceptable while the block was being built; it is
 * not a picker.
 */

import { __, sprintf, _n } from '@wordpress/i18n';
import {
	SearchControl,
	Button,
	Spinner,
	ToggleGroupControl as StableToggleGroupControl,
	ToggleGroupControlOption as StableToggleGroupControlOption,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { useState, useMemo } from '@wordpress/element';

import { useIcons, useCollections, filterIcons } from './use-icons';

/*
 * ToggleGroupControl graduated from experimental. Prefer the stable export and
 * fall back, so this keeps working on either side of that change rather than
 * breaking on one.
 */
const ToggleGroup = StableToggleGroupControl || ToggleGroupControl;
const ToggleGroupOption =
	StableToggleGroupControlOption || ToggleGroupControlOption;

/**
 * One selectable icon.
 *
 * A real <button>, not a clickable div: it must be reachable by keyboard, be
 * announced as a button, and respond to Enter and Space — all of which come
 * free from the element and none of which come free from a div with onClick.
 *
 * @param {Object}   props
 * @param {Object}   props.icon       Icon record from the REST API.
 * @param {boolean}  props.isSelected Whether this is the current icon.
 * @param {Function} props.onSelect   Called with the icon name.
 * @return {Element} The button.
 */
function IconButton( { icon, isSelected, onSelect } ) {
	const label = icon.label || icon.name;

	return (
		<button
			type="button"
			className={ `zealblocks-icon-picker__item${
				isSelected ? ' is-selected' : ''
			}` }
			// aria-pressed rather than aria-selected: this is a toggle button,
			// not an option inside a listbox, and screen readers announce the
			// two differently.
			aria-pressed={ isSelected }
			aria-label={ label }
			title={ label }
			onClick={ () => onSelect( icon.name ) }
		>
			{ /*
			 * The registry stores SVG MARKUP, not React components, so there
			 * is no element to render instead. The markup comes from core's
			 * own registry over an authenticated endpoint (`edit_posts`), and
			 * is the same markup wp_get_icon() prints on the front end.
			 */ }
			<span
				className="zealblocks-icon-picker__glyph"
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={ { __html: icon.content } }
			/>
		</button>
	);
}

/**
 * Search, collection filter and grid.
 *
 * @param {Object}   props
 * @param {?string}  props.value    Currently selected icon name.
 * @param {Function} props.onSelect Called with the chosen icon name.
 * @return {Element} The picker.
 */
export default function IconPicker( { value, onSelect } ) {
	const { icons, isLoading } = useIcons();
	const collections = useCollections();

	const [ search, setSearch ] = useState( '' );
	const [ collection, setCollection ] = useState( '' );

	/*
	 * Filtering is memoised on its inputs. Without this every keystroke
	 * re-filters AND re-renders every glyph in the grid, which is felt at 88
	 * icons and would be unusable if a plugin registered a thousand.
	 */
	const results = useMemo(
		() => filterIcons( icons, search, collection ),
		[ icons, search, collection ]
	);

	if ( isLoading ) {
		return (
			<div className="zealblocks-icon-picker is-loading">
				<Spinner />
				<p>{ __( 'Loading the icon library…', 'zealblocks' ) }</p>
			</div>
		);
	}

	if ( ! icons.length ) {
		return (
			<div className="zealblocks-icon-picker">
				<p>
					{ __(
						'No icons are registered. The icon library needs WordPress 7.1 or later.',
						'zealblocks'
					) }
				</p>
			</div>
		);
	}

	return (
		<div className="zealblocks-icon-picker">
			<SearchControl
				__nextHasNoMarginBottom
				value={ search }
				onChange={ setSearch }
				label={ __( 'Search icons', 'zealblocks' ) }
				placeholder={ __( 'Search icons', 'zealblocks' ) }
			/>

			{ /*
			 * The collection filter appears only when there is something to
			 * filter. With one collection registered it would be a control
			 * with a single option, which is noise.
			 */ }
			{ collections.length > 1 && (
				<ToggleGroup
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					label={ __( 'Collection', 'zealblocks' ) }
					value={ collection }
					onChange={ ( next ) => setCollection( next ?? '' ) }
				>
					<ToggleGroupOption
						value=""
						label={ __( 'All', 'zealblocks' ) }
					/>
					{ collections.map( ( item ) => (
						<ToggleGroupOption
							key={ item.slug }
							value={ item.slug }
							label={ item.label || item.slug }
						/>
					) ) }
				</ToggleGroup>
			) }

			<p
				className="zealblocks-icon-picker__count"
				// Announced politely so a screen-reader user learns the result
				// count changed without the grid stealing focus mid-typing.
				aria-live="polite"
			>
				{ sprintf(
					/* translators: %d: number of matching icons. */
					_n( '%d icon', '%d icons', results.length, 'zealblocks' ),
					results.length
				) }
			</p>

			{ results.length > 0 ? (
				<div className="zealblocks-icon-picker__grid">
					{ results.map( ( icon ) => (
						<IconButton
							key={ icon.name }
							icon={ icon }
							isSelected={ icon.name === value }
							onSelect={ onSelect }
						/>
					) ) }
				</div>
			) : (
				<p className="zealblocks-icon-picker__empty">
					{ sprintf(
						/* translators: %s: the search term. */
						__( 'No icons match “%s”.', 'zealblocks' ),
						search
					) }
				</p>
			) }

			{ !! value && (
				<Button
					__next40pxDefaultSize
					variant="tertiary"
					isDestructive
					onClick={ () => onSelect( '' ) }
				>
					{ __( 'Clear icon', 'zealblocks' ) }
				</Button>
			) }
		</div>
	);
}
