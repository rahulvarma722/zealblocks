/**
 * The inspector control a block drops in to get an icon field.
 *
 * This is the whole public surface of the icon library: a block should need
 * `<IconControl value onChange />` and nothing else. Everything underneath —
 * resolving the saved slug, lazily importing 1.5 MB of picker data, drawing
 * the preview — is this module's problem, not the block's.
 *
 * Keeping the composition here rather than in each block's edit.js is the
 * point. The button block previously inlined a SelectControl over four
 * hardcoded icons; every block that wanted an icon would have rebuilt that,
 * and they would have drifted.
 *
 * WHY THE ROOT CARRIES `zb-ui`.
 *
 * Tailwind is configured with `important: '.zb-ui'`, so every utility is
 * emitted as `.zb-ui .foo`. The picker gets that from its portal container;
 * this control renders inline in the inspector, where no such ancestor exists,
 * so it has to declare the scope itself. Note the class applies to
 * DESCENDANTS — the root element cannot style itself with utilities.
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	BaseControl,
	ToggleControl,
	useBaseControlProps,
} from '@wordpress/components';

import IconPicker from './icon-picker';
import { useIcon, Icon } from './use-icon';
import '@/ui/tailwind.css';

/*
 * The three action glyphs, drawn here rather than imported.
 *
 * @wordpress/icons is not one of WordPress's script handles — it is bundled,
 * not externalised — so importing it would add a package to the editor bundle
 * for three 24px shapes. These are stroked rather than filled because that is
 * what the rest of the row looks like, and because a stroked glyph stays
 * legible at this size without hinting.
 */
const STROKE = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.5,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
};

const Glyph = ( { d } ) => (
	<svg
		className="h-[18px] w-[18px] shrink-0"
		viewBox="0 0 24 24"
		aria-hidden="true"
		focusable="false"
		{ ...STROKE }
	>
		{ d.map( ( segment ) => (
			<path key={ segment } d={ segment } />
		) ) }
	</svg>
);

const REPLACE = [ 'M4 9h13M14 6l3 3-3 3', 'M20 15H7M10 18l-3-3 3-3' ];
const TRASH = [ 'M5 7h14', 'M10 7V5h4v2', 'M7 7l1 12h8l1-12' ];

/** Shared focus ring, matching every other focusable thing in the editor. */
const FOCUS =
	'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 ' +
	'focus-visible:outline-[var(--wp-admin-theme-color,#3858e9)]';

/**
 * An icon field: preview, the actions that change it, and its details.
 *
 * `flipForRTL` is optional. The toggle only renders when a block passes a
 * setter for it, so a block with no such attribute is not forced to grow one.
 *
 * @param {Object}    props                    Props.
 * @param {?string}   props.value              Saved icon slug, or empty.
 * @param {Function}  props.onChange           Called with the new slug, or '' when cleared.
 * @param {string=}   props.label              Field label.
 * @param {string=}   props.help               Help text.
 * @param {boolean=}  props.flipForRTL         Whether the icon mirrors in RTL locales.
 * @param {Function=} props.onFlipForRTLChange Called with the new flip state.
 * @return {Element} The control.
 */
export default function IconControl( {
	value,
	onChange,
	label = __( 'Icon', 'zealblocks' ),
	help,
	flipForRTL = false,
	onFlipForRTLChange,
} ) {
	/*
	 * PHP inlines every icon the post already uses, so on editor load this is
	 * already in memory and the preview never flashes in.
	 */
	const icon = useIcon( value );
	const { baseControlProps, controlProps } = useBaseControlProps( {
		label,
		help,
	} );

	/*
	 * The source, and the category when we know it.
	 *
	 * categoryLabel is attached by the picker at selection time, because it is
	 * the only place the category NAMES exist — icons.php carries no categories
	 * at all, deliberately, since the front end never groups or searches. So an
	 * icon chosen in this session reads "Library · Commerce" and one restored
	 * from a saved post reads "Library" until the picker is opened.
	 */
	const meta = [ __( 'Library', 'zealblocks' ), icon?.categoryLabel ]
		.filter( Boolean )
		.join( ' · ' );

	return (
		<BaseControl { ...baseControlProps } __nextHasNoMarginBottom>
			<div { ...controlProps } className="zb-ui">
				{ /*
				 * The whole preview is the trigger. The bar rises out of the
				 * bottom on hover to say what clicking does, and is pinned
				 * open while there is no icon, since an empty box with a
				 * hover-only affordance tells a first-time user nothing.
				 *
				 * It is a SIBLING of the button, not a child, and
				 * pointer-events-none — a button cannot legally contain
				 * another button, and Delete has to stay independently
				 * clickable.
				 */ }
				<div className="group/preview relative h-[132px] overflow-hidden rounded border border-solid border-border bg-background">
					<IconPicker value={ value } onChange={ onChange }>
						<button
							type="button"
							aria-label={
								icon
									? sprintf(
											/* translators: %s: the selected icon's name. */
											__(
												'Replace icon: %s',
												'zealblocks'
											),
											icon.label
									  )
									: __( 'Choose an icon', 'zealblocks' )
							}
							className={ `flex h-full w-full cursor-pointer items-center justify-center border-none bg-transparent p-0 ${ FOCUS }` }
						>
							{ icon ? (
								<Icon
									icon={ icon }
									className={ `h-10 w-10 text-foreground ${
										flipForRTL ? 'zb-icon-preview--rtl' : ''
									}` }
								/>
							) : (
								<span className="px-4 pb-8 text-center text-xs text-muted-foreground">
									{ __( 'No icon selected', 'zealblocks' ) }
								</span>
							) }
						</button>
					</IconPicker>

					<span
						className={ `pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-background py-2 text-xs font-medium text-foreground transition duration-150 ${
							icon
								? 'translate-y-full opacity-0 group-hover/preview:translate-y-0 group-hover/preview:opacity-100 group-focus-within/preview:translate-y-0 group-focus-within/preview:opacity-100'
								: ''
						}` }
						style={ {
							borderTop: '1px solid var(--zb-border)',
						} }
					>
						<Glyph d={ REPLACE } />
						<span>
							{ icon
								? __( 'Replace', 'zealblocks' )
								: __( 'Choose icon', 'zealblocks' ) }
						</span>
					</span>

					{ !! value && (
						<button
							type="button"
							onClick={ () => onChange( '' ) }
							aria-label={ sprintf(
								/* translators: %s: the selected icon's name. */
								__( 'Remove icon: %s', 'zealblocks' ),
								icon?.label ?? value
							) }
							className={ `absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-muted-foreground hover:text-[#d63638] ${ FOCUS }` }
						>
							<Glyph d={ TRASH } />
						</button>
					) }
				</div>

				{ !! value && (
					<div className="mt-2 flex items-baseline justify-between gap-3">
						<span className="truncate text-sm font-medium text-foreground">
							{ icon?.label ?? value }
						</span>
						<span className="shrink-0 text-xs text-muted-foreground">
							{ meta }
						</span>
					</div>
				) }

				{ !! onFlipForRTLChange && (
					<>
						<hr
							className="mb-3 mt-4"
							style={ {
								border: 0,
								borderTop: '1px solid var(--zb-border)',
							} }
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __(
								'Flip for right-to-left',
								'zealblocks'
							) }
							help={ __(
								'Mirrors the icon in right-to-left languages.',
								'zealblocks'
							) }
							checked={ !! flipForRTL }
							onChange={ onFlipForRTLChange }
						/>
					</>
				) }
			</div>
		</BaseControl>
	);
}
