/**
 * List — toolbar icons, drawn here: @wordpress/icons is not a script handle
 * WordPress ships, so importing it would bundle the whole library.
 */

const svg = ( children ) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		width="24"
		height="24"
		aria-hidden="true"
		focusable="false"
	>
		{ children }
	</svg>
);

export const bulletsIcon = svg(
	<path
		fill="currentColor"
		d="M6 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM8 6.25h13v1.5H8v-1.5Zm0 5h13v1.5H8v-1.5Zm13 5H8v1.5h13v-1.5Z"
	/>
);

export const numbersIcon = svg(
	<path
		fill="currentColor"
		d="M3.8 9.4V4.6H2.6V3.8h2.1v5.6h-.9Zm-1.3 5.8c0-1.2 2.3-1.9 2.3-2.8 0-.4-.3-.7-.8-.7-.4 0-.8.2-1.1.6l-.5-.6c.4-.5 1-.8 1.7-.8.9 0 1.6.5 1.6 1.4 0 1.3-2 1.8-2.2 2.8h2.3v.8H2.5v-.7ZM8 6.25h13v1.5H8v-1.5Zm0 5h13v1.5H8v-1.5Zm13 5H8v1.5h13v-1.5Z"
	/>
);

export const indentIcon = svg(
	<path
		fill="currentColor"
		d="M4 7.2v1.5h16V7.2H4zm8 8.6h8v-1.5h-8v1.5zm-8-3.5l3 3-3 3 1 1 4-4-4-4-1 1z"
	/>
);

export const outdentIcon = svg(
	<path
		fill="currentColor"
		d="M20 7.2H4v1.5h16V7.2zm0 7.1h-8v1.5h8v-1.5zM9 12.3l-1-1-4 4 4 4 1-1-3-3 3-3z"
	/>
);
