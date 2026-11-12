/**
 * A control label that names the device being edited.
 */

import { __, sprintf } from '@wordpress/i18n';

/**
 * "Z-index (Tablet)" while a per-device layer is being edited, plain "Z-index"
 * on the base layer. Per-device controls read the same in every block.
 *
 * @param {string}  label    Base label.
 * @param {?string} stateKey Layer being edited, null for the base.
 * @param {string}  device   Core device name.
 * @return {string} The label.
 */
export function withDevice( label, stateKey, device ) {
	return stateKey
		? sprintf(
				/* translators: 1: control label, 2: device name, e.g. Tablet. */
				__( '%1$s (%2$s)', 'zealblocks' ),
				label,
				device
		  )
		: label;
}
