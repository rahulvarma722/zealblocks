/**
 * Merges class names.
 *
 * clsx resolves conditionals; tailwind-merge then drops earlier utilities that
 * a later one overrides, so cn( 'p-2', 'p-4' ) is 'p-4' rather than both. That
 * second part is what lets a caller override a component's own classes via
 * className without !important — every shadcn component routes through it.
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn( ...inputs ) {
	return twMerge( clsx( inputs ) );
}
