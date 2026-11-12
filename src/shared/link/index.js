/**
 * A block's link: the toolbar button and the link popover, shared by the
 * Button and the Icon.
 *
 * Writes `url`, `linkTarget` and `rel`. The front end validates the same three
 * through Block_Render::link(), so both blocks treat a link identically.
 */

import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	__experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import { Popover, ToolbarButton } from '@wordpress/components';
import { useState } from '@wordpress/element';

import { NEW_TAB_TARGET, withNewTabRel } from './rel';

export { NEW_TAB_TARGET, NEW_TAB_REL, withNewTabRel } from './rel';

/**
 * Link and Unlink in the block toolbar, and the link popover.
 *
 * @param {Object}   props
 * @param {string}   props.url           Current URL.
 * @param {string}   props.linkTarget    Current target.
 * @param {string}   props.rel           Current rel.
 * @param {Function} props.setAttributes Attribute setter.
 * @param {boolean}  props.isSelected    Whether the block is selected.
 * @param {?Element} [props.anchor]      Element to place the popover by.
 *                                       Without one it sits by the block's
 *                                       parent, as the Button's always has.
 * @return {Element} The toolbar fill and the popover.
 */
export function LinkToolbar( {
	url,
	linkTarget,
	rel,
	setAttributes,
	isSelected,
	anchor,
} ) {
	const [ isEditingLink, setIsEditingLink ] = useState( false );

	const unlink = () => {
		setAttributes( { url: '', linkTarget: '', rel: '' } );
		setIsEditingLink( false );
	};

	return (
		<>
			<BlockControls group="block">
				{ ! url && (
					<ToolbarButton
						name="link"
						icon="admin-links"
						title={ __( 'Link', 'zealblocks' ) }
						onClick={ () => setIsEditingLink( true ) }
					/>
				) }
				{ !! url && (
					<ToolbarButton
						name="unlink"
						icon="editor-unlink"
						title={ __( 'Unlink', 'zealblocks' ) }
						onClick={ unlink }
						isActive
					/>
				) }
			</BlockControls>

			{ isSelected && isEditingLink && (
				<Popover
					placement="bottom"
					onClose={ () => setIsEditingLink( false ) }
					focusOnMount="firstElement"
					{ ...( anchor ? { anchor } : {} ) }
				>
					<LinkControl
						value={ {
							url,
							opensInNewTab: linkTarget === NEW_TAB_TARGET,
						} }
						onChange={ ( {
							url: newUrl = '',
							opensInNewTab: newOpensInNewTab,
						} ) => {
							setAttributes( {
								url: newUrl,
								linkTarget: newOpensInNewTab
									? NEW_TAB_TARGET
									: '',
								rel: withNewTabRel( rel, newOpensInNewTab ),
							} );
						} }
						onRemove={ unlink }
						forceIsEditingLink={ ! url }
					/>
				</Popover>
			) }
		</>
	);
}
