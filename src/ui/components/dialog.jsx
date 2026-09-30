/**
 * Dialog — shadcn/ui, new-york style.
 *
 * Source from https://ui.shadcn.com/r/styles/new-york/dialog.json with the
 * TypeScript removed.
 *
 * THREE DEVIATIONS, all so this reads as part of wp-admin rather than as a
 * plugin's idea of one. Re-apply them if the file is ever regenerated:
 *
 * 1. DialogPortal defaults to our scoped container. Upstream it is bare
 *    `DialogPrimitive.Portal`, which renders into document.body — outside
 *    `.zb-ui` — so every dialog would appear unstyled.
 *
 * 2. Centring is `inset-0 m-auto` instead of `left-1/2 top-1/2 -translate-1/2`.
 *    Upstream's centring lives in `transform`, and so does tailwindcss-animate's
 *    enter/exit animation — the animation's transform REPLACES the centring for
 *    its duration, so the panel flies in from the right and snaps into place on
 *    the last frame. Margin-auto centring leaves `transform` free.
 *
 * 3. The export list is trimmed to what this plugin renders — see the note
 *    above it.
 *
 * 4. The animation and the close button copy core's Modal
 *    (wp-includes/css/dist/components/style.css): 200ms opacity + scale(.9) on
 *    an `rgba(0,0,0,.35)` overlay, and a plain 36px icon button that turns the
 *    admin accent colour on hover.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { __ } from '@wordpress/i18n';

import { cn } from '@/ui/cn';
import { getPortalContainer } from '@/ui/portal-container';

/** Core's `closeSmall` icon, inlined so this costs no new dependency. */
const CLOSE_SMALL_PATH =
	'M12 13.06l3.712 3.713 1.061-1.06L13.061 12l3.712-3.712-1.06-1.06L12 10.939 8.288 7.227l-1.061 1.06L10.939 12l-3.712 3.712 1.06 1.061L12 13.061z';

/*
 * Core's own modal easing — `--wpds-motion-easing-expressive`.
 *
 * Written as an arbitrary PROPERTY, not `ease-[…]`, on purpose. tailwindcss-animate
 * registers a second `ease` utility alongside Tailwind's, so `ease-[cubic-bezier(…)]`
 * is ambiguous: Tailwind warns and emits NOTHING, leaving the animation on the
 * browser default. Naming the property resolves it, and says which of the two we
 * meant — the animation, not a transition.
 */
const EASE = '[animation-timing-function:cubic-bezier(0.25,0,0,1)]';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = ( { container, ...props } ) => (
	<DialogPrimitive.Portal
		container={ container ?? getPortalContainer() }
		{ ...props }
	/>
);

const DialogOverlay = React.forwardRef( ( { className, ...props }, ref ) => (
	<DialogPrimitive.Overlay
		ref={ ref }
		className={ cn(
			'fixed inset-0 z-50 bg-black/35 duration-100 [animation-timing-function:cubic-bezier(0.15,0,0.15,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			className
		) }
		{ ...props }
	/>
) );
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(
	( { className, children, ...props }, ref ) => (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ ref }
				className={ cn(
					'fixed inset-0 z-50 m-auto grid h-fit w-full max-w-lg gap-4 border bg-background p-6 shadow-lg',
					`duration-200 ${ EASE } data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-90 data-[state=open]:zoom-in-90`,
					'sm:rounded-lg',
					className
				) }
				{ ...props }
			>
				{ children }

				{ /*
				 * Core's geometry: a 36px box centred in the 72px header band
				 * and 24px in from the right edge, so (72 - 36) / 2 = 18.
				 */ }
				<DialogPrimitive.Close
					aria-label={ __( 'Close', 'zealblocks' ) }
					className="absolute right-6 top-[18px] flex h-9 w-9 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent p-0 text-foreground hover:text-[var(--wp-admin-theme-color,#3858e9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wp-admin-theme-color,#3858e9)] disabled:pointer-events-none"
				>
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="currentColor"
						aria-hidden="true"
						focusable="false"
					>
						<path d={ CLOSE_SMALL_PATH } />
					</svg>
				</DialogPrimitive.Close>
			</DialogPrimitive.Content>
		</DialogPortal>
	)
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ( { className, ...props } ) => (
	<div
		className={ cn(
			'flex flex-col space-y-1.5 text-center sm:text-left',
			className
		) }
		{ ...props }
	/>
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef( ( { className, ...props }, ref ) => (
	<DialogPrimitive.Title
		ref={ ref }
		className={ cn(
			'text-lg font-semibold leading-none tracking-tight',
			className
		) }
		{ ...props }
	/>
) );
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/*
 * Only what something actually renders. Upstream also exports Portal, Overlay,
 * Close, Footer and Description; Portal and Overlay are used here and the rest
 * were dead. Re-running the shadcn CLI brings them all back, which is the
 * point of the tool — there is nothing to lose by not carrying them.
 */
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle };
