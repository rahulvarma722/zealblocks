/**
 * Text — editor.
 */

import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';

import { STYLE_PRESETS } from './constants';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	mergeBlocks,
	onReplace,
	style,
} ) {
	const { content, styleAs, placeholder } = attributes;

	/*
	 * `styleAs` is a class, not an inline style.
	 *
	 * A class lets style.scss resolve the preset against the theme's own
	 * font-size presets with a fallback, and lets a theme override the whole
	 * scale in one place. An inline font-size would win against the theme
	 * forever and could not be themed at all.
	 */
	const blockProps = useBlockProps( {
		className: styleAs ? `has-style-${ styleAs }` : undefined,
		style,
	} );

	return (
		<>
			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Style', 'zealblocks' ) }
					resetAll={ () => setAttributes( { styleAs: '' } ) }
					panelId={ clientId }
				>
					<ToolsPanelItem
						hasValue={ () => !! styleAs }
						label={ __( 'Style as', 'zealblocks' ) }
						onDeselect={ () => setAttributes( { styleAs: '' } ) }
						isShownByDefault
						panelId={ clientId }
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Style as', 'zealblocks' ) }
							value={ styleAs }
							options={ STYLE_PRESETS }
							onChange={ ( value ) =>
								setAttributes( { styleAs: value } )
							}
							help={ __(
								'Sizing and weight, independent of the theme’s default for a paragraph.',
								'zealblocks'
							) }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{ /*
			 * The editable IS the block root, and it is always a paragraph —
			 * a configurable HTML tag is out of scope for now. Rendering the
			 * same element the front end produces keeps the canvas honest.
			 */ }
			<RichText
				{ ...blockProps }
				identifier="content"
				tagName="p"
				value={ content }
				onChange={ ( value ) => setAttributes( { content: value } ) }
				onMerge={ mergeBlocks }
				onReplace={ onReplace }
				placeholder={ placeholder || __( 'Text…', 'zealblocks' ) }
			/>
		</>
	);
}
