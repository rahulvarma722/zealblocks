/**
 * A SelectControl with <optgroup>s, which core's SelectControl `options` prop
 * cannot express.
 */

import { SelectControl } from '@wordpress/components';

/**
 * A SelectControl whose options are grouped.
 *
 * @param {Object}   props
 * @param {Object[]} props.groups `{ label, options }` groups.
 * @param {string}   [props.none] Label of an ungrouped empty option.
 * @param {Object}   props.rest   Remaining SelectControl props.
 * @return {Element} The control.
 */
export function GroupedSelect( { groups, none, ...rest } ) {
	return (
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			{ ...rest }
		>
			{ none && <option value="">{ none }</option> }
			{ groups.map( ( group ) => (
				<optgroup key={ group.label } label={ group.label }>
					{ group.options.map( ( option ) => (
						<option key={ option.value } value={ option.value }>
							{ option.label }
						</option>
					) ) }
				</optgroup>
			) ) }
		</SelectControl>
	);
}
