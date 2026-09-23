#!/usr/bin/env node
/**
 * Builds the icon library from Font Awesome Free.
 *
 * Downloads Font Awesome's own metadata at a PINNED TAG, converts it, and
 * writes a single PHP file to icon-handler/.
 *
 *   npm run update-icons
 *   node bin/generate-icons-json.js --version=7.3.1
 *   node bin/generate-icons-json.js --icons=./icons.json --categories=./categories.yml
 *
 * WHY A PINNED TAG AND NOT A BRANCH.
 *
 * Font Awesome's `7.x` branch moves. Reading from it means two builds a week
 * apart silently produce different libraries, with nothing in the output saying
 * so. The tag plus the recorded sha256 make a build reproducible, and a
 * mismatch fails loudly instead of shipping.
 *
 * WHY BOTH FILES COME FROM THE SAME TAG.
 *
 * Icons and categories are versioned together upstream. Refreshing one without
 * the other means new icons land in no category at all, which is invisible
 * until someone opens the picker and finds an empty tab.
 *
 * WHY PHP AND NOT JSON.
 *
 * Labels. `wp i18n make-pot` extracts from PHP, block.json and theme.json and
 * nothing else — there is no hook for arbitrary JSON. A label kept in JSON
 * could never reach a .pot, never reach translate.wordpress.org, and so could
 * never be translated. Core's own icon manifest is a .php file for the same
 * reason.
 *
 * ONE FILE, AND WHAT THAT COSTS.
 *
 * Reading one icon means decoding the whole file: there is no partial include.
 * Measured on 1992 icons, ~1.6 ms and ~2 MB per request that renders ANY icon,
 * against 0.19 ms and no measurable memory if the same data is split per icon.
 * The cost tracks the size of the library, not how many icons a page uses.
 * That is a deliberate trade for now — one file is easier to read and change
 * while the shape is still moving.
 *
 * THE LOADING RULE THAT MUST NOT BE BROKEN.
 *
 * The output calls __() about 2000 times. WordPress emits _doing_it_wrong if a
 * text domain is used before `after_setup_theme` (wp-includes/l10n.php:1444),
 * so this file must be required LAZILY — on first icon lookup, never at plugin
 * bootstrap.
 */

'use strict';

const fs      = require( 'fs' );
const path    = require( 'path' );
const https   = require( 'https' );
const crypto  = require( 'crypto' );
const yaml    = require( 'js-yaml' );

const ROOT        = path.resolve( __dirname, '..' );
const OUT_DIR     = path.join( ROOT, 'icon-handler' );
const TEXT_DOMAIN = 'zealblocks';
const REPO        = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome';

const arg = ( name, fallback ) => {
	const hit = process.argv.find( ( a ) => a.startsWith( `--${ name }=` ) );
	return hit ? hit.slice( name.length + 3 ) : fallback;
};

const FA_VERSION = arg( 'version', '7.3.1' );
const ICONS_SRC  = arg( 'icons' );
const CATS_SRC   = arg( 'categories' );

function download( url ) {
	return new Promise( ( resolve, reject ) => {
		https
			.get( url, ( res ) => {
				// A 404 on a raw URL still returns a body ("404: Not Found"), which
				// would parse as garbage rather than fail. Check the status.
				if ( 200 !== res.statusCode ) {
					res.resume();
					reject( new Error( `${ res.statusCode } for ${ url }` ) );
					return;
				}
				let data = '';
				res.setEncoding( 'utf8' );
				res.on( 'data', ( c ) => ( data += c ) );
				res.on( 'end', () => resolve( data ) );
			} )
			.on( 'error', reject );
	} );
}

const read = async ( local, remote ) =>
	local ? fs.readFileSync( path.resolve( local ), 'utf8' ) : download( remote );

const sha256 = ( s ) => crypto.createHash( 'sha256' ).update( s, 'utf8' ).digest( 'hex' );

// Byte length, not string length. A JS string counts characters, so a file with
// multi-byte characters reports short — icons.json is 4,853,474 bytes but 4,853,455
// characters. Provenance has to match what the server served.
const byteLength = ( s ) => Buffer.byteLength( s, 'utf8' );

const phpEscape = ( s ) => String( s ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" );

async function main() {
	console.log( `Font Awesome Free ${ FA_VERSION }` );

	const iconsRaw = await read( ICONS_SRC, `${ REPO }/${ FA_VERSION }/metadata/icons.json` );
	const catsRaw  = await read( CATS_SRC,  `${ REPO }/${ FA_VERSION }/metadata/categories.yml` );

	console.log( `  icons.json      ${ ( byteLength( iconsRaw ) / 1048576 ).toFixed( 2 ) } MB  sha256 ${ sha256( iconsRaw ).slice( 0, 16 ) }…` );
	console.log( `  categories.yml  ${ ( byteLength( catsRaw ) / 1024 ).toFixed( 0 ) } KB  sha256 ${ sha256( catsRaw ).slice( 0, 16 ) }…` );

	const raw  = JSON.parse( iconsRaw );
	const cats = yaml.load( catsRaw );

	/*
	 * slug -> [ category slugs ]. Font Awesome's categories are MANY-TO-MANY:
	 * 40% of icons sit in more than one, so this cannot collapse to a single
	 * value per icon.
	 */
	const categoryOf = {};
	for ( const [ slug, data ] of Object.entries( cats ) ) {
		for ( const icon of data.icons || [] ) {
			( categoryOf[ icon ] = categoryOf[ icon ] || [] ).push( slug );
		}
	}

	const rows = [];
	let skipped = 0;

	for ( const [ slug, data ] of Object.entries( raw ) ) {
		/*
		 * Brands before solid — the order Font Awesome's own tooling resolves
		 * in. `regular` is not emitted: nothing selects it today and it would
		 * add ~112 KB to a file that is decoded in full on every request.
		 */
		const art = data.svg?.brands || data.svg?.solid;

		if ( ! art?.path || ! art.width || ! art.height ) {
			skipped++;
			continue;
		}

		const parts = [
			`'label' => __( '${ phpEscape( data.label || slug ) }', '${ TEXT_DOMAIN }' )`,
			`'width' => ${ art.width }`,
			`'height' => ${ art.height }`,
			`'path' => '${ phpEscape( art.path ) }'`,
		];

		const mine = categoryOf[ slug ];
		if ( mine?.length ) {
			parts.push( `'categories' => array( ${ mine.map( ( c ) => `'${ phpEscape( c ) }'` ).join( ', ' ) } )` );
		}

		rows.push( `\t'${ phpEscape( slug ) }' => array( ${ parts.join( ', ' ) } ),` );
	}

	const php = [
		'<?php',
		'/**',
		` * Font Awesome Free ${ FA_VERSION } icon data.`,
		' *',
		' * Generated by bin/generate-icons-json.js — do not edit by hand.',
		' * Run: npm run update-icons',
		' *',
		' * Icons are licensed CC BY 4.0 (https://fontawesome.com/license/free).',
		" * Font Awesome's own attribution comments do not survive this extraction,",
		' * so the credit in readme.txt and CREDITS.md is required, not optional.',
		' *',
		' * REQUIRE THIS LAZILY. It calls __() about 2000 times, and WordPress',
		' * emits _doing_it_wrong for a text domain used before `after_setup_theme`',
		' * (wp-includes/l10n.php:1444). Load it on first icon lookup, never at',
		' * plugin bootstrap.',
		' *',
		' * @package Zealblocks',
		' */',
		'',
		"defined( 'ABSPATH' ) || exit;",
		'',
		'// phpcs:disable WordPress.Arrays.MultipleStatementAlignment -- generated; aligning ~2000 rows would add tens of KB of whitespace.',
		'return array(',
		...rows,
		');',
		'// phpcs:enable',
		'',
	].join( '\n' );

	fs.mkdirSync( OUT_DIR, { recursive: true } );
	const outFile = path.join( OUT_DIR, 'icons.php' );
	fs.writeFileSync( outFile, php );

	// Provenance, so a build can be traced back to exact upstream bytes.
	fs.writeFileSync(
		path.join( OUT_DIR, 'source.json' ),
		JSON.stringify(
			{
				source:   'Font Awesome Free',
				version:  FA_VERSION,
				license:  'CC BY 4.0 — https://fontawesome.com/license/free',
				icons:    { sha256: sha256( iconsRaw ), bytes: byteLength( iconsRaw ) },
				categories: { sha256: sha256( catsRaw ), bytes: byteLength( catsRaw ) },
				generated: new Date().toISOString().slice( 0, 10 ),
			},
			null,
			'\t'
		) + '\n'
	);

	console.log( `\n  icons written   ${ rows.length }${ skipped ? ` (${ skipped } skipped, no usable path)` : '' }` );
	console.log( `  categories      ${ Object.keys( cats ).length }` );
	console.log( `  icon-handler/icons.php    ${ ( fs.statSync( outFile ).size / 1048576 ).toFixed( 2 ) } MB` );
	console.log( `  icon-handler/source.json  provenance recorded` );
}

main().catch( ( err ) => {
	console.error( `error: ${ err.message }` );
	process.exit( 1 );
} );
