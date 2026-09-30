/**
 * CollapsibleToolsPanel — a ToolsPanel you can collapse.
 *
 * WHY THIS EXISTS.
 *
 * Core's Styles-tab panels (Typography, Color, Dimensions, Border) are
 * `ToolsPanel`s, and a ToolsPanel does not collapse. It has `resetAll`,
 * `panelId` and `dropdownMenuProps`, but no `initialOpen`/`opened`/`onToggle`.
 * Its answer to panel length is OPTIONALITY instead: every control starts
 * hidden and the reader adds the ones they want from the ⋯ menu.
 *
 * `PanelBody` is the component that collapses — it renders a real <button> with
 * aria-expanded and ships stable class hooks (`components-panel__body-toggle`).
 * But it has no optional-controls menu and no "Reset all".
 *
 * This composes the two: PanelBody supplies the collapse, ToolsPanel supplies
 * the ⋯ menu. Which is the only way to get both, because:
 *
 *   - There is no filter for this. The whole block editor exposes five
 *     applyFilters hooks and none touches inspector panel rendering.
 *   - Core's own panels cannot be made collapsible at all: InspectorControlsSlot
 *     passes a hard-coded `label` for typography/color/dimensions/border, and a
 *     labelled slot is forced through BlockSupportToolsPanel.
 *   - Styling around it is not an option either: @wordpress/components renders
 *     ToolsPanel through emotion with build-time hashed class names
 *     (`d40032517bff9e12__dropdown-menu`), which change between releases.
 *
 * THE DUPLICATE HEADING.
 *
 * ToolsPanelHeader opens with `if ( ! labelText ) return null`, so dropping the
 * label to avoid a second title would take the ⋯ menu and "Reset all" with it.
 * The label is therefore passed — it also supplies the menu button's accessible
 * name, "%s options" — and the heading it renders is hidden in CSS instead.
 * PanelBody's own title already names the panel, so nothing is lost to a screen
 * reader; see editor.scss for why that selector is safe.
 *
 * USAGE
 *
 *     <InspectorControls group="styles">
 *         <CollapsibleToolsPanel
 *             label={ __( 'Responsive', 'zealblocks' ) }
 *             initialOpen={ false }
 *             panelId={ clientId }
 *             resetAll={ () => setAttributes( { … } ) }
 *         >
 *             <ToolsPanelItem … />
 *         </CollapsibleToolsPanel>
 *     </InspectorControls>
 *
 * `group="styles"` matters: core renders that slot with no `label`, so a fill
 * brings its own wrapper. A labelled group (dimensions, typography…) would wrap
 * this in core's ToolsPanel and produce a panel inside a panel.
 *
 */

import {
	PanelBody,
	__experimentalToolsPanel as ToolsPanel,
} from '@wordpress/components';

import './editor.scss';

/**
 * A ToolsPanel wrapped in a collapsible PanelBody.
 *
 * @param {Object}      props
 * @param {string}      props.label               Panel name. Shown by PanelBody, and used
 *                                                for the ⋯ button's accessible name.
 * @param {boolean}     [props.initialOpen=true]  Whether the panel starts expanded.
 * @param {string}      [props.panelId]           Passed through to ToolsPanel so it can
 *                                                scope its items to one block.
 * @param {Function}    [props.resetAll]          "Reset all" handler.
 * @param {string}      [props.className]         Extra class on the PanelBody.
 * @param {Object}      [props.dropdownMenuProps] Forwarded to ToolsPanel.
 * @param {JSX.Element} props.children            ToolsPanelItem children.
 * @return {JSX.Element} The panel.
 */
export default function CollapsibleToolsPanel( {
	label,
	initialOpen = true,
	panelId,
	resetAll,
	className,
	dropdownMenuProps,
	children,
} ) {
	return (
		<PanelBody
			className={ [ 'zealblocks-collapsible-panel', className ]
				.filter( Boolean )
				.join( ' ' ) }
			title={ label }
			initialOpen={ initialOpen }
		>
			<ToolsPanel
				className="zealblocks-collapsible-panel__tools"
				label={ label }
				panelId={ panelId }
				resetAll={ resetAll }
				dropdownMenuProps={ dropdownMenuProps }
			>
				{ children }
			</ToolsPanel>
		</PanelBody>
	);
}
