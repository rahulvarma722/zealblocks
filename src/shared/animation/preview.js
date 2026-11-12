/**
 * Entrance animation — the editor preview, for every block that opts in.
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/**
 * Plays the animation on the canvas, once, on demand.
 *
 * A class runs the same keyframes the front end uses (`is-animation-preview`,
 * styled by the preview() mixin). It is removed and re-added on the next tick
 * to replay: re-adding within the same frame would not restart the animation.
 *
 * Plays when the type changes, not on load: opening a post must not set every
 * animated block moving.
 *
 * @param {Object} attributes Block attributes.
 * @return {{isPreviewing: boolean, playPreview: Function}} State and trigger.
 */
export function useAnimationPreview( attributes ) {
	const { animationType, animationDuration, animationDelay } = attributes;

	const [ isPreviewing, setIsPreviewing ] = useState( false );
	const playPreview = useCallback( () => {
		setIsPreviewing( false );
		window.setTimeout( () => setIsPreviewing( true ), 30 );
	}, [] );

	const previousType = useRef( animationType );
	useEffect( () => {
		if ( animationType && animationType !== previousType.current ) {
			playPreview();
		}
		previousType.current = animationType;
	}, [ animationType, playPreview ] );

	useEffect( () => {
		if ( ! isPreviewing ) {
			return;
		}
		const timer = window.setTimeout(
			() => setIsPreviewing( false ),
			( animationDuration || 0 ) + ( animationDelay || 0 ) + 50
		);
		return () => window.clearTimeout( timer );
	}, [ isPreviewing, animationDuration, animationDelay ] );

	return { isPreviewing, playPreview };
}

/**
 * What an animated block adds to its block props in the editor.
 *
 * The type selects the start state in the stylesheet, and timing travels as
 * the same custom properties Animation::wrapper() writes on the front end, so
 * a preview plays exactly what a visitor will see.
 *
 * @param {Object}  attributes   Block attributes.
 * @param {boolean} isPreviewing Whether a preview is playing.
 * @return {{className: string, style: Object, data: Object}} Empty for a block that is not animated.
 */
export function getAnimationProps( attributes, isPreviewing ) {
	const {
		animationType,
		animationDuration,
		animationDelay,
		animationEasing,
	} = attributes;

	if ( ! animationType ) {
		return { className: '', style: {}, data: {} };
	}

	return {
		className: isPreviewing ? 'is-animation-preview' : '',
		style: {
			'--zealblocks-animation-duration': `${ animationDuration }ms`,
			'--zealblocks-animation-delay': `${ animationDelay }ms`,
			'--zealblocks-animation-easing': animationEasing,
		},
		data: { 'data-zealblocks-animation': animationType },
	};
}
