/**
 * List item — editor component: the `<li>`, holding an Icon block on the
 * left and a Container block on the right, as render.php prints them.
 *
 * Both are locked in place (src/list/constants.js), so the item always has
 * its icon and its content. The icon is changed on the Icon block itself;
 * the content goes in the Container, which starts with a Text. Enter in that
 * Text makes the next item (src/list/keyboard.js).
 */

import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';

import { indent, outdent } from '../list/actions';
import { BODY, ICON, ITEM, itemTemplate } from '../list/constants';
import { indentIcon, outdentIcon } from '../list/icons';

const ALLOWED = [ ICON, BODY ];

export default function Edit( { clientId, context } ) {
	const registry = useRegistry();
	const listIcon = context[ 'zealblocks/list/icon' ];

	const { canIndent, canOutdent } = useSelect(
		( select ) => {
			const { getBlockIndex, getBlockRootClientId, getBlockName } =
				select( blockEditorStore );
			const list = getBlockRootClientId( clientId );
			const body = getBlockRootClientId( list );

			return {
				canIndent: getBlockIndex( clientId ) > 0,
				canOutdent:
					BODY === getBlockName( body ) &&
					ITEM === getBlockName( getBlockRootClientId( body ) ),
			};
		},
		[ clientId ]
	);

	/*
	 * The template only fills an EMPTY item: one added from the inserter or
	 * List View. Items made by Enter, and the list's first, arrive complete
	 * (src/list/actions.js, createItem()).
	 */
	const innerBlocksProps = useInnerBlocksProps( useBlockProps(), {
		allowedBlocks: ALLOWED,
		template: itemTemplate( listIcon ),
		templateInsertUpdatesSelection: false,
		renderAppender: false,
	} );

	return (
		<>
			<BlockControls group="block">
				<ToolbarGroup>
					<ToolbarButton
						icon={ outdentIcon }
						label={ __( 'Outdent', 'zealblocks' ) }
						shortcut="Shift+Tab"
						disabled={ ! canOutdent }
						onClick={ () => outdent( registry, clientId ) }
					/>
					<ToolbarButton
						icon={ indentIcon }
						label={ __( 'Indent', 'zealblocks' ) }
						shortcut="Tab"
						disabled={ ! canIndent }
						onClick={ () => indent( registry, clientId ) }
					/>
				</ToolbarGroup>
			</BlockControls>

			<li { ...innerBlocksProps } />
		</>
	);
}
