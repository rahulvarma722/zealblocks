/**
 * Dialog, on Radix primitives.
 *
 * WHY RADIX AND NOT A HAND-ROLLED MODAL.
 *
 * A correct dialog has to trap focus, restore focus to the trigger on close,
 * handle Escape, lock background scroll, mark itself `aria-modal`, label itself
 * from its own title, and make the rest of the page inert. Each is easy to get
 * subtly wrong and none of them are visible until someone navigates by
 * keyboard or screen reader. Radix has solved and tested all of it.
 *
 * `@wordpress/components` also has a Modal, and inside the block editor that is
 * usually the better choice because it matches core's chrome. This exists for
 * admin screens, where there is no core chrome to match.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { forwardRef } from '@wordpress/element';
import { cn } from '../cn';
import { getPortalContainer } from '../portal-container';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef( ( { className, ...props }, ref ) => (
	<DialogPrimitive.Overlay
		ref={ ref }
		className={ cn(
			'zb-fixed zb-inset-0 zb-z-[100000] zb-bg-black/50 data-[state=open]:zb-animate-zb-in',
			className
		) }
		{ ...props }
	/>
) );
DialogOverlay.displayName = 'DialogOverlay';

const DialogContent = forwardRef(
	( { className, children, container, ...props }, ref ) => (
		/*
		 * z-index 100000 clears WordPress admin: #adminmenuwrap sits at 9990 and
		 * the editor's own popovers occupy the 1000000 range, so this lands above
		 * admin chrome without competing with core's editor surfaces.
		 */
		<DialogPrimitive.Portal container={ container ?? getPortalContainer() }>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ ref }
				className={ cn(
					'zb-fixed zb-left-1/2 zb-top-1/2 zb-z-[100001] zb-w-full zb-max-w-lg zb--translate-x-1/2 zb--translate-y-1/2',
					'zb-rounded-lg zb-border zb-border-border zb-bg-background zb-p-5 zb-shadow-lg',
					'data-[state=open]:zb-animate-zb-in',
					className
				) }
				{ ...props }
			>
				{ children }
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	)
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = ( { className, ...props } ) => (
	<div
		className={ cn( 'zb-mb-4 zb-flex zb-flex-col zb-gap-1', className ) }
		{ ...props }
	/>
);

const DialogFooter = ( { className, ...props } ) => (
	<div
		className={ cn( 'zb-mt-5 zb-flex zb-justify-end zb-gap-2', className ) }
		{ ...props }
	/>
);

const DialogTitle = forwardRef( ( { className, ...props }, ref ) => (
	<DialogPrimitive.Title
		ref={ ref }
		className={ cn(
			'zb-m-0 zb-text-base zb-font-semibold zb-text-foreground',
			className
		) }
		{ ...props }
	/>
) );
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = forwardRef( ( { className, ...props }, ref ) => (
	<DialogPrimitive.Description
		ref={ ref }
		className={ cn(
			'zb-m-0 zb-text-sm zb-text-muted-foreground',
			className
		) }
		{ ...props }
	/>
) );
DialogDescription.displayName = 'DialogDescription';

export {
	Dialog,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
};
