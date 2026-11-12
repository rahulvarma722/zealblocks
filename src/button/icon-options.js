/**
 * Button — the icon, the hover icon and icon-only buttons in the canvas.
 *
 * Pure functions, so the canvas and the tests share them. Each mirrors a
 * branch of render.php; a class added on one side and not the other shows up
 * as the block moving when the page is published.
 */

/** The custom property each rotated SVG carries; style.scss spends it. */
export const ROTATION_VAR = '--zealblocks-button-icon-rotation';

/**
 * Whether the text is hidden: "Show text" off, with an icon to show instead.
 *
 * @param {Object}   attributes          Block attributes.
 * @param {string}   attributes.icon     Icon slug.
 * @param {?boolean} attributes.showText The "Show text" toggle.
 * @return {boolean} True for an icon-only button.
 */
export function hidesText( attributes ) {
	return !! attributes.icon && false === attributes.showText;
}

/**
 * The root's icon classes, as render.php adds them.
 *
 * @param {Object} attributes Block attributes.
 * @return {string[]} Class names.
 */
export function getIconClasses( attributes ) {
	const {
		icon,
		iconPosition,
		flipForRTL,
		showIconOnHover,
		hoverIcon,
		hoverIconPosition,
		hoverIconFlipForRTL,
	} = attributes;
	const hasHoverIcon = !! showIconOnHover && !! hoverIcon;

	return [
		icon && 'left' === iconPosition ? 'has-icon-left' : '',
		icon && flipForRTL ? 'has-rtl-flip' : '',
		hasHoverIcon ? 'has-hover-icon' : '',
		hasHoverIcon &&
		! hidesText( attributes ) &&
		'left' === hoverIconPosition
			? 'has-hover-icon-left'
			: '',
		hasHoverIcon && hoverIconFlipForRTL ? 'has-hover-icon-rtl-flip' : '',
	].filter( Boolean );
}

/**
 * Whole degrees, 0 to 359, as Render::angle() reads them.
 *
 * @param {*} value Stored angle.
 * @return {number} The angle.
 */
export function normalizeAngle( value ) {
	const number = parseInt( value, 10 );

	if ( ! Number.isFinite( number ) ) {
		return 0;
	}

	return ( ( number % 360 ) + 360 ) % 360;
}

/**
 * Class and style for one icon, as render.php's $icon_args builds them.
 *
 * @param {string} className The icon's own class.
 * @param {*}      angle     Stored rotation.
 * @return {{className: string, style: (Object|undefined)}} Icon props.
 */
export function getIconProps( className, angle ) {
	const degrees = normalizeAngle( angle );

	return degrees
		? {
				className: `${ className } has-rotation`,
				style: { [ ROTATION_VAR ]: `${ degrees }deg` },
		  }
		: { className, style: undefined };
}

/**
 * The text a screen reader would hear: tags gone, entities decoded.
 *
 * The text attribute is RichText HTML (`Tom &amp; Jerry`), but the aria label
 * field shows and edits plain text. DOMParser builds an inert document, so
 * nothing in the markup loads or runs.
 *
 * @param {?string} html Stored text.
 * @return {string} Plain text.
 */
export function toPlainText( html ) {
	if ( ! html ) {
		return '';
	}

	const doc = new window.DOMParser().parseFromString( html, 'text/html' );

	return ( doc.body.textContent || '' ).trim();
}

/**
 * Plain text as RichText stores it, so `<` typed into the aria label field
 * stays a character and does not become markup.
 *
 * @param {string} text Plain text.
 * @return {string} Escaped text.
 */
export function toRichText( text ) {
	return ( text || '' )
		.replace( /&/g, '&amp;' )
		.replace( /</g, '&lt;' )
		.replace( />/g, '&gt;' );
}
