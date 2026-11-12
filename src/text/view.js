/**
 * Text — entrance animations on the front end.
 *
 * Loaded only on pages with an animated Text block (render.php enqueues it;
 * see Registrar::ON_DEMAND_VIEW_SCRIPTS). Adds `is-animated` when a block
 * scrolls into view; style.scss does the rest with a keyframe animation, so
 * this file holds no animation logic of its own.
 *
 * Before it plays, a block is only transparent — never moved. The movement
 * lives in the keyframes, because the observer measures the TRANSFORMED box:
 * a block parked off to the side for a slide-in would never intersect, and
 * would stay hidden for good.
 *
 * The start state is hidden by CSS only under `@media (scripting: enabled)`,
 * so with JavaScript off the text is simply visible. Under reduced motion the
 * CSS never hides it and this script does nothing.
 */

const SELECTOR = '.wp-block-zealblocks-text[data-zealblocks-animation]';

function init() {
	const blocks = document.querySelectorAll( SELECTOR );

	if (
		! blocks.length ||
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	) {
		return;
	}

	// No observer, no scroll trigger: show everything rather than leave it
	// hidden behind a start state nothing will ever end.
	if ( ! ( 'IntersectionObserver' in window ) ) {
		blocks.forEach( ( block ) => block.classList.add( 'is-animated' ) );
		return;
	}

	const observer = new window.IntersectionObserver(
		( entries ) => {
			entries.forEach( ( { target, isIntersecting } ) => {
				const repeats =
					'true' === target.dataset.zealblocksAnimationRepeat;

				if ( isIntersecting ) {
					target.classList.add( 'is-animated' );

					if ( ! repeats ) {
						observer.unobserve( target );
					}
				} else if ( repeats ) {
					// Back to the start state, ready to play again next time.
					target.classList.remove( 'is-animated' );
				}
			} );
		},
		// A tenth of the block in view, so it plays where it is seen. A
		// shrunken viewport margin would be the other way to do it, and would
		// leave a block at the very end of a short page hidden for good.
		{ threshold: 0.1 }
	);

	blocks.forEach( ( block ) => observer.observe( block ) );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
