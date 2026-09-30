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
 */

import { __, sprintf } from '@wordpress/i18n';
import {
	BaseControl,
	Button,
	useBaseControlProps,
} from '@wordpress/components';

import IconPicker from './icon-picker';
import { useIcon, Icon } from './use-icon';

/**
 * An icon field: preview, picker trigger and a way to clear it.
 *
 * @param {Object}   props          Props.
 * @param {?string}  props.value    Saved icon slug, or empty.
 * @param {Function} props.onChange Called with the new slug, or '' when cleared.
 * @param {string=}  props.label    Field label.
 * @param {string=}  props.help     Help text.
 * @return {Element} The control.
 */
export default function IconControl( {
	value,
	onChange,
	label = __( 'Icon', 'zealblocks' ),
	help,
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

	return (
		<BaseControl { ...baseControlProps } __nextHasNoMarginBottom>
			<div { ...controlProps } className="zealblocks-icon-control">
				<IconPicker value={ value } onChange={ onChange }>
					<Button
						variant="secondary"
						__next40pxDefaultSize
						aria-label={
							icon
								? sprintf(
										/* translators: %s: the selected icon's name. */
										__( 'Change icon: %s', 'zealblocks' ),
										icon.label
								  )
								: __( 'Choose an icon', 'zealblocks' )
						}
					>
						{ icon ? (
							<>
								<Icon icon={ icon } />
								<span>{ icon.label }</span>
							</>
						) : (
							__( 'Choose icon', 'zealblocks' )
						) }
					</Button>
				</IconPicker>

				{ !! value && (
					<Button
						variant="tertiary"
						isDestructive
						__next40pxDefaultSize
						onClick={ () => onChange( '' ) }
					>
						{ __( 'Remove', 'zealblocks' ) }
					</Button>
				) }
			</div>
		</BaseControl>
	);
}
