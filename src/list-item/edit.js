/**
 * List item — editor component: the `<li>`, its icon on the left and its
 * blocks on the right, as render.php prints them.
 *
 * The item starts with a Text, ready to type in; Enter in that Text makes the
 * next item (src/list/keyboard.js). Other blocks go in through the "+" shown
 * while the item is being edited.
 */

import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
	store as blockEditorStore,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	Button,
	PanelBody,
	ToggleControl,
	ToolbarButton,
	ToolbarGroup,
} from '@wordpress/components';
import { useRegistry, useSelect } from '@wordpress/data';

import IconControl, { useIcon, Icon } from '@/ui/icon-library';
import { useStyleState } from '../button/responsive-width/use-style-state';
import {
	getStateValue,
	setStateValue,
} from '../button/responsive-width/style-value';
import { clearKeys } from '../button/style-values';
import { withDevice } from '../shared/device-label';
import { indent, outdent } from '../list/actions';
import {
	ICON_NONE,
	ITEM,
	ITEM_BLOCKS,
	ITEM_TEMPLATE,
	KEYS,
} from '../list/constants';
import { getListPreview } from '../list/preview';
import { indentIcon, outdentIcon } from '../list/icons';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	context,
	isSelected,
} ) {
	const { icon: own, style } = attributes;
	const ordered = !! context[ 'zealblocks/list/ordered' ];
	const listIcon = context[ 'zealblocks/list/icon' ] || '';
	const slug = ordered ? '' : own || listIcon;
	const iconData = useIcon( slug && ICON_NONE !== slug ? slug : '' );
	const registry = useRegistry();
	const colorSettings = useMultipleOriginColorsAndGradients();
	const { device, stateKey } = useStyleState();

	const { isEditing, canIndent, canOutdent } = useSelect(
		( select ) => {
			const {
				hasSelectedInnerBlock,
				getBlockIndex,
				getBlockRootClientId,
				getBlockName,
			} = select( blockEditorStore );
			const list = getBlockRootClientId( clientId );

			return {
				isEditing:
					isSelected || hasSelectedInnerBlock( clientId, true ),
				canIndent: getBlockIndex( clientId ) > 0,
				canOutdent:
					ITEM === getBlockName( getBlockRootClientId( list ) ),
			};
		},
		[ clientId, isSelected ]
	);

	const blockProps = useBlockProps( {
		style: getListPreview( style, device, [ KEYS.iconColor ] ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-zealblocks-list-item__content' },
		{
			allowedBlocks: ITEM_BLOCKS,
			template: ITEM_TEMPLATE,
			templateInsertUpdatesSelection: true,
			renderAppender: isEditing ? InnerBlocks.ButtonBlockAppender : false,
		}
	);

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

			{ ! ordered && (
				<InspectorControls>
					<PanelBody title={ __( 'Item icon', 'zealblocks' ) }>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Show an icon', 'zealblocks' ) }
							checked={ ICON_NONE !== own }
							onChange={ ( next ) =>
								setAttributes( { icon: next ? '' : ICON_NONE } )
							}
						/>
						{ ICON_NONE !== own && (
							<>
								<IconControl
									label={ __(
										'Icon for this item',
										'zealblocks'
									) }
									help={ __(
										'Leave empty to use the list’s icon.',
										'zealblocks'
									) }
									value={ own }
									onChange={ ( next ) =>
										setAttributes( { icon: next || '' } )
									}
								/>
								{ !! own && (
									<Button
										variant="link"
										onClick={ () =>
											setAttributes( { icon: '' } )
										}
									>
										{ __(
											'Use the list’s icon',
											'zealblocks'
										) }
									</Button>
								) }
							</>
						) }
					</PanelBody>
				</InspectorControls>
			) }

			{ !! slug && ICON_NONE !== slug && (
				<InspectorControls
					group="color"
					resetAllFilter={ ( attrs ) => ( {
						style: clearKeys( attrs?.style, stateKey, [
							KEYS.iconColor,
						] ),
					} ) }
				>
					<ColorGradientSettingsDropdown
						__experimentalIsRenderedInSidebar
						panelId={ clientId }
						{ ...colorSettings }
						settings={ [
							{
								label: withDevice(
									__( 'Icon', 'zealblocks' ),
									stateKey,
									device
								),
								colorValue: getStateValue(
									style,
									stateKey,
									KEYS.iconColor
								),
								onColorChange: ( next ) =>
									setAttributes( {
										style: setStateValue(
											style,
											stateKey,
											next || undefined,
											KEYS.iconColor
										),
									} ),
								enableAlpha: true,
								clearable: true,
							},
						] }
					/>
				</InspectorControls>
			) }

			<li { ...blockProps }>
				{ iconData && (
					<span
						className="wp-block-zealblocks-list-item__icon"
						aria-hidden="true"
					>
						<Icon
							icon={ iconData }
							className="wp-block-zealblocks-list-item__svg"
						/>
					</span>
				) }
				<div { ...innerBlocksProps } />
			</li>
		</>
	);
}
