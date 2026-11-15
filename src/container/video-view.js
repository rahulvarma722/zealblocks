/**
 * Container background video on the front end.
 *
 * Loaded only on a page with a background video
 * (Zealblocks\Block\Background_Video::render() enqueues it). The markup has
 * no `src` and no `autoplay`, so without this script nothing plays and nothing
 * but the poster downloads; see includes/block/class-background-video.php.
 *
 * Per video:
 *   - In core's mobile band, when the author turned the video off on mobile,
 *     do nothing: CSS hides it, and the file is never requested.
 *   - Load it when the container nears the viewport.
 *   - Play it while visible, unless the visitor paused it or prefers reduced
 *     motion. Pause it off screen.
 *   - Show the pause button, which plays and pauses and says which it does.
 */

const VIDEO = '.wp-block-zealblocks-container__video';
const TOGGLE = '.wp-block-zealblocks-container__video-toggle';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Wire one video.
 *
 * @param {HTMLVideoElement} video The video.
 */
function setUp( video ) {
	const skip = video.dataset.zealblocksVideoSkip;

	if ( skip && window.matchMedia( skip ).matches ) {
		return;
	}

	const toggle = video.parentElement.querySelector( `:scope > ${ TOGGLE }` );

	// Reduced motion: the poster stays, and the button offers to play.
	let paused = window.matchMedia( REDUCED_MOTION ).matches;
	let visible = false;

	const load = () => {
		if ( ! video.getAttribute( 'src' ) && video.dataset.src ) {
			video.src = video.dataset.src;
		}
	};

	const label = () => {
		if ( ! toggle ) {
			return;
		}

		toggle.setAttribute(
			'aria-label',
			paused ? toggle.dataset.labelPlay : toggle.dataset.labelPause
		);
		toggle.classList.toggle( 'is-paused', paused );
	};

	const sync = () => {
		if ( paused || ! visible ) {
			video.pause();
		} else {
			load();
			const playing = video.play();

			// A browser that refuses to play muted video: show it as paused.
			if ( playing && playing.catch ) {
				playing.catch( () => {
					paused = true;
					label();
				} );
			}
		}

		label();
	};

	if ( toggle ) {
		toggle.hidden = false;
		toggle.addEventListener( 'click', () => {
			paused = ! paused;
			sync();
		} );
	}

	if ( ! ( 'IntersectionObserver' in window ) ) {
		visible = true;
		sync();
		return;
	}

	new window.IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				visible = entry.isIntersecting;
				sync();
			} );
		},
		{ rootMargin: '200px 0px' }
	).observe( video.parentElement );

	label();
}

function init() {
	document.querySelectorAll( VIDEO ).forEach( setUp );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
