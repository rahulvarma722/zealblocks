/**
 * Admin screen.
 *
 * Exists to prove the UI layer works end to end inside WordPress admin:
 * Tailwind compiles through wp-scripts, the tokens resolve to admin colours,
 * and a Radix overlay renders INSIDE our style scope rather than escaping to
 * an unstyled document.body.
 */

import { createRoot, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { Button } from '../ui/components/button';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from '../ui/components/dialog';

import './admin.css';

function App() {
	const [ open, setOpen ] = useState( false );

	return (
		<div className="zb-ui zb-p-1">
			<h1 className="zb-mb-1 zb-text-xl zb-font-semibold">
				{ __( 'Zealblocks', 'zealblocks' ) }
			</h1>
			<p className="zb-mb-4 zb-text-muted-foreground">
				{ __(
					'Interface check — Tailwind, tokens and a Radix overlay.',
					'zealblocks'
				) }
			</p>

			<div className="zb-flex zb-flex-wrap zb-items-center zb-gap-2">
				<Dialog open={ open } onOpenChange={ setOpen }>
					<DialogTrigger asChild>
						<Button>{ __( 'Open dialog', 'zealblocks' ) }</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{ __( 'It renders in scope', 'zealblocks' ) }
							</DialogTitle>
							<DialogDescription>
								{ __(
									'Radix portals to document.body. This is styled because the portal container carries the zb-ui class. Tab is trapped here and Escape closes.',
									'zealblocks'
								) }
							</DialogDescription>
						</DialogHeader>
						<DialogFooter>
							<DialogClose asChild>
								<Button variant="outline">
									{ __( 'Close', 'zealblocks' ) }
								</Button>
							</DialogClose>
							<Button onClick={ () => setOpen( false ) }>
								{ __( 'Done', 'zealblocks' ) }
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<Button variant="outline">
					{ __( 'Outline', 'zealblocks' ) }
				</Button>
				<Button variant="ghost">{ __( 'Ghost', 'zealblocks' ) }</Button>
				<Button variant="destructive">
					{ __( 'Destructive', 'zealblocks' ) }
				</Button>
				<Button variant="link">{ __( 'Link', 'zealblocks' ) }</Button>
			</div>
		</div>
	);
}

const mount = document.getElementById( 'zealblocks-admin' );

if ( mount ) {
	createRoot( mount ).render( <App /> );
}
