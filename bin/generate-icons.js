#!/usr/bin/env node
/**
 * Builds the icon library from a Font Awesome metadata file.
 *
 * WHAT THIS EMITS
 *
 *   assets/icons/icons.json          geometry + categories. One file.
 *   includes/class-icons-manifest.php  labels, wrapped in __() so they translate.
 *
 * WHY TWO FILES AND NOT ONE.
 *
 * Geometry is data and belongs in JSON, which decodes faster than PHP rebuilds
 * an array literal (measured: 1.68 ms vs 1.61 ms to read 10 icons, but 0.19 ms
 * when split per icon — see LAYOUT below).
 *
 * Labels are human strings and CANNOT live in JSON, because `wp i18n make-pot`
 * only extracts from PHP, block.json and theme.json — there is no hook for
 * arbitrary JSON. A label in JSON would never reach the .pot, never reach
 * translate.wordpress.org, and so could never be translated. That is also why
 * core's own icon manifest is a .php file.
 *
 * The manifest is only needed where labels are shown (the picker), so it is
 * loaded on demand rather than on every front-end request.
 *
 * LAYOUT
 *
 * `--layout=single` (default) writes every icon into one JSON file. Reading one
 * icon then costs a full decode of the file — ~1.7 ms and ~2 MB for a
 * 2000-icon library, paid on any request that renders any icon. That is what
 * Spectra does today.
 *
 * `--layout=per-icon` writes assets/icons/i/<slug>.json instead. Reading one
 * icon costs ~0.19 ms and no measurable memory, because only that icon is
 * decoded. Costs ~6 MB more on disk (4 KB filesystem block per ~1 KB file).
 *
 * The renderer reads whichever exists, so this is a flag, not a rewrite.
 *
 * USAGE
 *
 *   node bin/generate-icons.js --source=<fontawesome/metadata/icons.json> \
 *                              --categories=<fontawesome/metadata/categories.yml.json>
 *
 * Point --source at a PINNED Font Awesome release, never a moving branch. The
 * version is recorded in the output so a build can be traced back.
 */

'use strict';

const fs   = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '..' );

function arg( name, fallback ) {
	const hit = process.argv.find( ( a ) => a.startsWith( `--${ name }=` ) );
	return hit ? hit.slice( name.length + 3 ) : fallback;
}

const SOURCE      = arg( 'source' );
const CATEGORIES  = arg( 'categories' );
const LAYOUT      = arg( 'layout', 'single' );
const FA_VERSION  = arg( 'fa-version', 'unknown' );
const WITH_TERMS  = process.argv.includes( '--with-search-terms' );
const TEXT_DOMAIN = 'zealblocks';

if ( ! SOURCE ) {
	console.error( 'error: --source=<path to Font Awesome icons.json> is required' );
	process.exit( 1 );
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const raw = JSON.parse( fs.readFileSync( SOURCE, 'utf8' ) );
const cats = CATEGORIES ? JSON.parse( fs.readFileSync( CATEGORIES, 'utf8' ) ) : {};

// slug -> [ category slugs ]. Font Awesome's categories are MANY-TO-MANY: 40% of
// icons sit in more than one, so this cannot be flattened to a single value.
const categoryOf = {};
for ( const [ slug, data ] of Object.entries( cats ) ) {
	for ( const icon of data.icons || [] ) {
		( categoryOf[ icon ] = categoryOf[ icon ] || [] ).push( slug );
	}
}

// ---------------------------------------------------------------------------
// Transform
// ---------------------------------------------------------------------------

const viewBoxes = [];
const catSlugs  = Object.keys( cats );
const icons     = {};
const labels    = {};
let skipped     = 0;

for ( const [ slug, data ] of Object.entries( raw ) ) {
	/*
	 * Brands before solid, which is the order both Spectra's PHP and its JS
	 * resolve in — so content authored against either renders the same glyph.
	 * `regular` is deliberately not emitted: nothing selects it, and it would
	 * add ~112 KB to a file that is decoded in full on every request.
	 */
	const art = data.svg?.brands || data.svg?.solid;

	if ( ! art?.path || ! art.width || ! art.height ) {
		skipped++;
		continue;
	}

	const viewBox = `0 0 ${ art.width } ${ art.height }`;
	let vb = viewBoxes.indexOf( viewBox );
	if ( -1 === vb ) {
		vb = viewBoxes.push( viewBox ) - 1;
	}

	const entry = { v: vb, p: art.path };

	const mine = categoryOf[ slug ];
	if ( mine?.length ) {
		entry.c = mine.map( ( c ) => catSlugs.indexOf( c ) ).filter( ( i ) => i > -1 );
	}

	// Font Awesome's own synonyms. Spectra ships these and never reads them;
	// ours are opt-in because they cost ~132 KB and only help search.
	if ( WITH_TERMS && data.search?.terms?.length ) {
		entry.t = data.search.terms;
	}

	icons[ slug ]  = entry;
	labels[ slug ] = data.label || slug;
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

const outDir = path.join( ROOT, 'assets/icons' );
fs.mkdirSync( outDir, { recursive: true } );

const meta = {
	source:    'Font Awesome Free',
	version:   FA_VERSION,
	license:   'CC BY 4.0 — https://fontawesome.com/license/free',
	generated: new Date().toISOString().slice( 0, 10 ),
	viewBoxes,
	categories: Object.fromEntries( catSlugs.map( ( s ) => [ s, cats[ s ].label || s ] ) ),
};

if ( 'per-icon' === LAYOUT ) {
	const iDir = path.join( outDir, 'i' );
	fs.mkdirSync( iDir, { recursive: true } );
	for ( const [ slug, entry ] of Object.entries( icons ) ) {
		fs.writeFileSync( path.join( iDir, `${ slug }.json` ), JSON.stringify( entry ) );
	}
	fs.writeFileSync( path.join( outDir, 'icons.json' ), JSON.stringify( { ...meta, layout: 'per-icon', slugs: Object.keys( icons ) } ) );
} else {
	fs.writeFileSync( path.join( outDir, 'icons.json' ), JSON.stringify( { ...meta, layout: 'single', icons } ) );
}

// The labels manifest. Generated, never hand-edited — which is what makes ~2000
// __() calls acceptable: no human maintains them.
const phpEscape = ( s ) => String( s ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" );

const php = [
	'<?php',
	'/**',
	' * Icon labels, generated by bin/generate-icons.js — do not edit.',
	' *',
	` * Source: Font Awesome Free ${ FA_VERSION }, CC BY 4.0.`,
	' *',
	' * These are wrapped in __() because `wp i18n make-pot` extracts only from',
	' * PHP, block.json and theme.json — a label kept in JSON could never be',
	' * translated. Loaded only where labels are shown, never on the front end.',
	' *',
	' * @package Zealblocks',
	' */',
	'',
	"defined( 'ABSPATH' ) || exit;",
	'',
	'// phpcs:disable WordPress.Arrays.MultipleStatementAlignment -- generated; aligning ~2000 rows would add ~35 KB of whitespace.',
	'return array(',
	...Object.entries( labels ).map(
		( [ slug, label ] ) => `\t'${ phpEscape( slug ) }' => __( '${ phpEscape( label ) }', '${ TEXT_DOMAIN }' ),`
	),
	');',
	'// phpcs:enable',
	'',
].join( '\n' );

fs.writeFileSync( path.join( ROOT, 'includes/icons-labels.php' ), php );

// ---------------------------------------------------------------------------

const size = ( p ) => ( fs.statSync( p ).size / 1024 ).toFixed( 0 ) + ' KB';
console.log( `layout            ${ LAYOUT }` );
console.log( `icons             ${ Object.keys( icons ).length }${ skipped ? ` (${ skipped } skipped, no usable path)` : '' }` );
console.log( `categories        ${ catSlugs.length }` );
console.log( `distinct viewBox  ${ viewBoxes.length }` );
console.log( `search terms      ${ WITH_TERMS ? 'included' : 'omitted (--with-search-terms to include)' }` );
console.log( `assets/icons/icons.json    ${ size( path.join( outDir, 'icons.json' ) ) }` );
console.log( `includes/icons-labels.php  ${ size( path.join( ROOT, 'includes/icons-labels.php' ) ) }` );
