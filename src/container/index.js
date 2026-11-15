/**
 * Container — block registration.
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { InnerBlocks } from '@wordpress/block-editor';

import metadata from './block.json';
import Edit from './edit';
import { containerIcon, gridIcon, rowIcon, stackIcon } from './icons';

import './style.scss';
import './editor.scss';

const SCOPE = [ 'block', 'inserter', 'transform' ];

/**
 * One block, four ways in, as core's Group: the layout is an attribute, so a
 * Row can become a Grid later without rebuilding the content.
 */
const variations = [
	{
		name: 'container',
		title: __( 'Container', 'zealblocks' ),
		description: __(
			'Groups blocks, with a layout, hover effects and an optional link.',
			'zealblocks'
		),
		icon: containerIcon,
		isDefault: true,
		scope: SCOPE,
		isActive: ( { layout } ) =>
			! layout || ! [ 'flex', 'grid' ].includes( layout.type ),
	},
	{
		name: 'row',
		title: __( 'Row', 'zealblocks' ),
		description: __( 'Arranges blocks side by side.', 'zealblocks' ),
		icon: rowIcon,
		attributes: { layout: { type: 'flex', flexWrap: 'nowrap' } },
		scope: SCOPE,
		isActive: ( { layout } ) =>
			'flex' === layout?.type && 'vertical' !== layout?.orientation,
	},
	{
		name: 'stack',
		title: __( 'Stack', 'zealblocks' ),
		description: __( 'Arranges blocks one above another.', 'zealblocks' ),
		icon: stackIcon,
		attributes: { layout: { type: 'flex', orientation: 'vertical' } },
		scope: SCOPE,
		isActive: ( { layout } ) =>
			'flex' === layout?.type && 'vertical' === layout?.orientation,
	},
	{
		name: 'grid',
		title: __( 'Grid', 'zealblocks' ),
		description: __( 'Arranges blocks in a grid.', 'zealblocks' ),
		icon: gridIcon,
		attributes: { layout: { type: 'grid' } },
		scope: SCOPE,
		isActive: ( { layout } ) => 'grid' === layout?.type,
	},
];

registerBlockType( metadata.name, {
	icon: containerIcon,
	edit: Edit,
	variations,

	/**
	 * The children are saved; the wrapper is not. render.php builds it, so
	 * the tag, the link and the hover classes can change without the block
	 * ever failing validation.
	 */
	save: () => <InnerBlocks.Content />,
} );
