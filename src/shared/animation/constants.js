/**
 * Entrance animation — values shared by every block that opts in.
 */

import { __ } from '@wordpress/i18n';

/**
 * Animation types, grouped for the picker. Values MUST match
 * Animation::TYPES and the keys of $starts in _animation.scss;
 * BlockContractTest compares all three.
 */
export const ANIMATION_GROUPS = [
	{
		label: __( 'Fade', 'zealblocks' ),
		options: [
			{ value: 'fade', label: __( 'Fade', 'zealblocks' ) },
			{ value: 'fade-up', label: __( 'Fade up', 'zealblocks' ) },
			{ value: 'fade-down', label: __( 'Fade down', 'zealblocks' ) },
			{ value: 'fade-left', label: __( 'Fade left', 'zealblocks' ) },
			{ value: 'fade-right', label: __( 'Fade right', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Flip', 'zealblocks' ),
		options: [
			{ value: 'flip-up', label: __( 'Flip up', 'zealblocks' ) },
			{ value: 'flip-down', label: __( 'Flip down', 'zealblocks' ) },
			{ value: 'flip-left', label: __( 'Flip left', 'zealblocks' ) },
			{ value: 'flip-right', label: __( 'Flip right', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Slide', 'zealblocks' ),
		options: [
			{ value: 'slide-up', label: __( 'Slide up', 'zealblocks' ) },
			{ value: 'slide-down', label: __( 'Slide down', 'zealblocks' ) },
			{ value: 'slide-left', label: __( 'Slide left', 'zealblocks' ) },
			{ value: 'slide-right', label: __( 'Slide right', 'zealblocks' ) },
		],
	},
	{
		label: __( 'Zoom in', 'zealblocks' ),
		options: [
			{ value: 'zoom-in', label: __( 'Zoom in', 'zealblocks' ) },
			{ value: 'zoom-in-up', label: __( 'Zoom in up', 'zealblocks' ) },
			{
				value: 'zoom-in-down',
				label: __( 'Zoom in down', 'zealblocks' ),
			},
			{
				value: 'zoom-in-left',
				label: __( 'Zoom in left', 'zealblocks' ),
			},
			{
				value: 'zoom-in-right',
				label: __( 'Zoom in right', 'zealblocks' ),
			},
		],
	},
	{
		label: __( 'Zoom out', 'zealblocks' ),
		options: [
			{ value: 'zoom-out', label: __( 'Zoom out', 'zealblocks' ) },
			{ value: 'zoom-out-up', label: __( 'Zoom out up', 'zealblocks' ) },
			{
				value: 'zoom-out-down',
				label: __( 'Zoom out down', 'zealblocks' ),
			},
			{
				value: 'zoom-out-left',
				label: __( 'Zoom out left', 'zealblocks' ),
			},
			{
				value: 'zoom-out-right',
				label: __( 'Zoom out right', 'zealblocks' ),
			},
		],
	},
];

/**
 * Values MUST match Animation::EASINGS.
 */
export const EASING_OPTIONS = [
	{ value: 'ease', label: __( 'Ease', 'zealblocks' ) },
	{ value: 'ease-in', label: __( 'Ease in', 'zealblocks' ) },
	{ value: 'ease-out', label: __( 'Ease out', 'zealblocks' ) },
	{ value: 'ease-in-out', label: __( 'Ease in-out', 'zealblocks' ) },
	{ value: 'linear', label: __( 'Linear', 'zealblocks' ) },
];

/**
 * The block.json defaults, which MUST match Animation::ATTRIBUTES. Reset All
 * and each item's reset restore these.
 */
export const ANIMATION_DEFAULTS = {
	animationType: '',
	animationDuration: 400,
	animationDelay: 0,
	animationEasing: 'ease',
	animationRepeat: false,
};
