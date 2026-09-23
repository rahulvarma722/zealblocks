/**
 * Button.
 *
 * Deliberately NOT a replacement for `@wordpress/components`' Button. Use this
 * on surfaces that are entirely ours — admin screens, the inside of a modal.
 * Controls that sit among core's inspector controls should stay on core's
 * components so they inherit its spacing and theming.
 */

import { forwardRef } from '@wordpress/element';
import { cva } from 'class-variance-authority';
import { cn } from '../cn';

const buttonVariants = cva(
	'zb-inline-flex zb-items-center zb-justify-center zb-gap-2 zb-whitespace-nowrap zb-rounded-md zb-text-sm zb-font-medium zb-transition-colors focus-visible:zb-outline-none focus-visible:zb-ring-2 focus-visible:zb-ring-ring focus-visible:zb-ring-offset-1 disabled:zb-pointer-events-none disabled:zb-opacity-50',
	{
		variants: {
			variant: {
				default:
					'zb-bg-primary zb-text-primary-foreground hover:zb-opacity-90',
				destructive:
					'zb-bg-destructive zb-text-destructive-foreground hover:zb-opacity-90',
				outline:
					'zb-border zb-border-input zb-bg-background hover:zb-bg-muted',
				ghost: 'hover:zb-bg-muted',
				link: 'zb-text-primary zb-underline-offset-4 hover:zb-underline',
			},
			size: {
				default: 'zb-h-8 zb-px-3 zb-py-1',
				sm: 'zb-h-7 zb-px-2 zb-text-xs',
				lg: 'zb-h-10 zb-px-6',
				icon: 'zb-h-8 zb-w-8',
			},
		},
		defaultVariants: { variant: 'default', size: 'default' },
	}
);

const Button = forwardRef( ( { className, variant, size, ...props }, ref ) => (
	<button
		ref={ ref }
		className={ cn( buttonVariants( { variant, size } ), className ) }
		{ ...props }
	/>
) );

Button.displayName = 'Button';

export { Button, buttonVariants };
