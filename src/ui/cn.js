/**
 * Class-name merge helper.
 *
 * `clsx` resolves conditionals; `tailwind-merge` then drops earlier utilities
 * that a later one overrides, so `cn( 'zb-p-2', 'zb-p-4' )` yields `zb-p-4`
 * instead of both. Without it a caller could never override a component's own
 * padding without !important.
 */

import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * tailwind-merge has to be told about our prefix, or it treats `zb-p-2` as an
 * unknown class and silently stops de-duplicating.
 */
const twMerge = extendTailwindMerge( { prefix: 'zb-' } );

export function cn( ...inputs ) {
	return twMerge( clsx( inputs ) );
}
