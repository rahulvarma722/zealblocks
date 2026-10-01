#!/usr/bin/env node
/**
 * Builds the icon library from Font Awesome Free.
 *
 * Downloads Font Awesome's own metadata at a PINNED TAG and writes two files:
 *
 *   includes/icon-handler/icons.php       label, width, height, path — PHP, front end\n *   includes/icon-handler/categories.php  titles + membership — PHP, editor only\n *   (was) includes/icon-handler/icons.php  label, width, height, path — read by PHP to
 *                             render an icon on the front end.
 *   src/ui/icon-library/icons-data.js  the same geometry plus categories — read by the
 *                             editor's icon picker.
 *
 * WHY TWO FILES AND NOT ONE.
 *
 * The two consumers want different slices. PHP resolves ONE slug per icon on
 * the page and never groups or searches, so categories would be dead weight on
 * every front-end request. The picker needs every label and category at once
 * but has no use for PHP. Splitting by consumer keeps each side minimal.
 *
 * WHY BOTH FILES CARRY __() AND NEITHER IS JSON.
 *
 * `wp i18n make-pot` extracts from PHP and JavaScript, and from nothing else —
 * a label kept in JSON could never reach a .pot, never reach
 * translate.wordpress.org, and so could never be translated. Identical strings
 * collapse to one msgid, so translating "Heart" once fixes both the front-end
 * aria-label and the picker tile.
 *
 * WHY A PINNED TAG AND NOT A BRANCH.
 *
 * Font Awesome's `7.x` branch moves. Reading from it means two builds a week
 * apart silently produce different libraries with nothing in the output saying
 * so. The tag plus the recorded sha256 make a build reproducible, and a
 * mismatch fails loudly instead of shipping.
 *
 * USAGE
 *
 *   npm run update-icons
 *   node bin/generate-icons-json.js --version=7.4.0
 *   node bin/generate-icons-json.js --icons=./icons.json --categories=./cats.yml
 */

'use strict';

/*
 * Only js-yaml is not built into Node, and it is needed because Font Awesome
 * ships categories as YAML while everything else is JSON.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const https = require( 'https' );
const crypto = require( 'crypto' );
const yaml = require( 'js-yaml' );

/*
 * Resolved from __dirname rather than process.cwd(), so the script behaves the
 * same whether it is run through npm, from the plugin root, or from bin/.
 */
const ROOT = path.resolve( __dirname, '..' );

/*
 * Base URL without a version. The tag is appended at the call site, which
 * keeps the pin visible where it is used instead of buried in this string.
 */
const REPO = 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome';

/*
 * Written into ~2000 generated __() calls. It has to match the plugin's real
 * text domain exactly — a mismatch does not error, it just means no string
 * ever resolves.
 */
const TEXT_DOMAIN = 'zealblocks';

/* -------------------------------------------------------------------------
 * Arguments
 * ---------------------------------------------------------------------- */

/**
 * Reads a `--name=value` flag from the command line.
 *
 * Deliberately not a CLI library. Three optional flags do not justify a
 * dependency in a build script, and `process.argv` is already an array of
 * strings.
 *
 * @param {string}  name     Flag name, without the leading dashes.
 * @param {string=} fallback Value to use when the flag is absent.
 * @return {string|undefined} The flag's value, or the fallback.
 */
function arg( name, fallback ) {
	const prefix = `--${ name }=`;
	const hit = process.argv.find( ( a ) => a.startsWith( prefix ) );

	return hit ? hit.slice( prefix.length ) : fallback;
}

/*
 * The Font Awesome release to build from.
 *
 * A TAG, never a branch. Bumping this is the only supported way to change the
 * icon set, and it is deliberately a one-word edit so the diff of an icon
 * update shows exactly which release it came from.
 */
const FA_VERSION = arg( 'version', '7.3.1' );

/*
 * Optional local sources, for working offline or testing a generator change
 * without re-downloading 4.7 MB. When absent the files are fetched from the
 * tag above.
 */
const ICONS_SRC = arg( 'icons' );
const CATS_SRC = arg( 'categories' );

/* -------------------------------------------------------------------------
 * Fetching
 * ---------------------------------------------------------------------- */

/**
 * Downloads a URL and resolves with its body as a string.
 *
 * THE STATUS CHECK IS THE POINT.
 *
 * raw.githubusercontent.com answers a missing file with 404 and a BODY —
 * the text "404: Not Found". Without this check that body is handed to
 * JSON.parse, which throws something about an unexpected character rather
 * than saying the URL was wrong. Worse, a YAML parser would accept it and
 * the build would continue with an empty icon set.
 *
 * @param {string} url Absolute https URL.
 * @return {Promise<string>} The response body.
 */
function download( url ) {
	return new Promise( ( resolve, reject ) => {
		https
			.get( url, ( res ) => {
				if ( 200 !== res.statusCode ) {
					// Drain the socket, or Node keeps the process alive.
					res.resume();
					reject(
						new Error( `HTTP ${ res.statusCode } for ${ url }` )
					);
					return;
				}

				let body = '';
				res.setEncoding( 'utf8' );
				res.on( 'data', ( chunk ) => ( body += chunk ) );
				res.on( 'end', () => resolve( body ) );
			} )
			.on( 'error', reject );
	} );
}

/**
 * Returns a local file when one was given, otherwise downloads.
 *
 * Keeps the --icons / --categories flags from leaking a conditional into
 * every call site.
 *
 * @param {string|undefined} local  Path from a flag, or undefined.
 * @param {string}           remote URL to fall back to.
 * @return {Promise<string>} File contents.
 */
function read( local, remote ) {
	return local
		? Promise.resolve( fs.readFileSync( path.resolve( local ), 'utf8' ) )
		: download( remote );
}

/**
 * Hex sha256 of a string, for the provenance record.
 *
 * @param {string} text Contents to hash.
 * @return {string} 64-character hex digest.
 */
function sha256( text ) {
	return crypto.createHash( 'sha256' ).update( text, 'utf8' ).digest( 'hex' );
}

/**
 * Byte length, which is NOT string length.
 *
 * icons.json is 4,853,474 bytes but 4,853,455 characters — nineteen
 * multi-byte characters. Provenance has to match what the server served, or
 * it cannot be checked against a Content-Length or a shasum on disk.
 *
 * @param {string} text Contents to measure.
 * @return {number} Length in bytes.
 */
function byteLength( text ) {
	return Buffer.byteLength( text, 'utf8' );
}

/* -------------------------------------------------------------------------
 * Transform
 * ---------------------------------------------------------------------- */

/**
 * Inverts Font Awesome's category file.
 *
 * Upstream is keyed CATEGORY -> icons, because that is how their site browses.
 * Every consumer here needs the opposite: given an icon, which categories is
 * it in. Inverting once at build time means the picker never has to scan 68
 * arrays to answer that.
 *
 * The result is many-to-many on purpose. 840 of 1475 categorised icons sit in
 * more than one category — `heart` is in nine — so this cannot collapse to a
 * single value per icon.
 *
 * @param {Object} cats Parsed categories.yml.
 * @return {Object<string, string[]>} Icon slug => category slugs.
 */
function invertCategories( cats ) {
	const byIcon = {};

	for ( const [ slug, data ] of Object.entries( cats ) ) {
		for ( const icon of data.icons || [] ) {
			( byIcon[ icon ] = byIcon[ icon ] || [] ).push( slug );
		}
	}

	return byIcon;
}

/**
 * Reduces one raw Font Awesome entry to the fields we ship.
 *
 * WHY BRANDS BEFORE SOLID.
 *
 * Brand icons exist ONLY in the brands style. Checking `solid` first would
 * silently drop GitHub, Facebook and every other logo, because their `solid`
 * key is absent and the icon would look unusable.
 *
 * `regular` is not considered at all: nothing selects it, and including it
 * would add roughly 112 KB of paths that never render.
 *
 * WHAT IS DISCARDED, AND WHY IT IS SAFE.
 *
 *   raw        the same art as `path`, wrapped in <svg> we rebuild anyway
 *   viewBox    an array of [ 0, 0, width, height ] — already have both
 *   changes    release history
 *   unicode    icon-font codepoint; we render SVG
 *   ligatures  icon-font feature
 *   styles     we have already chosen one
 *   free       every icon in the free set is free
 *   voted      Font Awesome's own backlog metadata
 *
 * Together that is two thirds of the input.
 *
 * @param {Object} entry One value from icons.json.
 * @return {?Object} { label, width, height, path }, or null if unusable.
 */
function pickArt( entry ) {
	const art = entry.svg?.brands || entry.svg?.solid;

	if ( ! art?.path || ! art.width || ! art.height ) {
		return null;
	}

	return {
		label: entry.label,
		width: art.width,
		height: art.height,
		path: art.path,
	};
}

/**
 * Builds the icon set that both output files are written from.
 *
 * Slugs are sorted before insertion so the output does not inherit whatever
 * order upstream happened to use. Regenerating at the same Font Awesome
 * version gives a byte-identical file, so a version bump diffs to only the
 * icons that actually changed.
 *
 * The result is NOT lexicographic, and that is a JavaScript rule rather than a
 * bug: integer-like keys are hoisted to the front of an object and ordered
 * numerically, whatever order they were inserted in. So `0`-`9` lead, then
 * everything else in sorted order. Deterministic either way, which is all the
 * diff needs. (The same rule bites in PHP, where array_merge() re-indexes
 * those keys instead — worth remembering on the PHP side of this build.)
 *
 * @param {Object} raw  Parsed icons.json.
 * @param {Object} cats Parsed categories.yml.
 * @return {{ icons: Object, skipped: string[] }} The set, and what was dropped.
 */
function buildIconSet( raw, cats ) {
	const byIcon = invertCategories( cats );
	const icons = {};
	const skipped = [];

	for ( const slug of Object.keys( raw ).sort() ) {
		const art = pickArt( raw[ slug ] );

		if ( ! art ) {
			skipped.push( slug );
			continue;
		}

		icons[ slug ] = { ...art, cats: byIcon[ slug ] || [] };
	}

	return { icons, skipped };
}

/* -------------------------------------------------------------------------
 * Emit
 * ---------------------------------------------------------------------- */

/**
 * Escapes a string for a PHP single-quoted literal.
 *
 * Only backslash and the quote itself are special inside single quotes, so
 * this is the whole job — no need for the heredoc gymnastics double quotes
 * would require.
 *
 * @param {string} text Raw value.
 * @return {string} Safe to place between single quotes.
 */
function phpEscape( text ) {
	return String( text ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" );
}

/**
 * Escapes a string for a JavaScript single-quoted literal.
 *
 * JSON.stringify would be simpler but emits double quotes, which this
 * project's Prettier config then rewrites — producing a file that fails lint
 * the moment it is generated.
 *
 * @param {string} text Raw value.
 * @return {string} Safe to place between single quotes.
 */
function jsEscape( text ) {
	return String( text )
		.replace( /\\/g, '\\\\' )
		.replace( /'/g, "\\'" )
		.replace( /\n/g, '\\n' );
}

/**
 * Writes includes/icon-handler/icons.php — the front end's resolver.
 *
 * Carries NO categories. PHP resolves one slug per icon on the page and never
 * groups or searches, so category data would be weight on every front-end
 * request that renders anything.
 *
 * TWO THINGS THIS FILE DEPENDS ON.
 *
 * It must be required LAZILY. Roughly 2000 __() calls run on include, and
 * WordPress raises _doing_it_wrong for a text domain used before
 * `after_setup_theme` (wp-includes/l10n.php:1444). Loading it at plugin
 * bootstrap would trip that on every request.
 *
 * Reading one icon costs the whole file — there is no partial include — so
 * this is ~4 ms and ~3 MB at the full set. That is the accepted price of one
 * readable file; splitting per icon would make it 0.19 ms and no measurable
 * memory, at the cost of 1992 files on disk.
 *
 * @param {Object} icons   Slug => { label, width, height, path, cats }.
 * @param {string} version Font Awesome tag the data came from.
 * @return {string} File contents.
 */
function renderPhp( icons, version ) {
	const rows = Object.entries( icons ).map(
		( [ slug, i ] ) =>
			`\t'${ phpEscape( slug ) }' => array( ` +
			`'label' => __( '${ phpEscape(
				i.label
			) }', '${ TEXT_DOMAIN }' ), ` +
			`'width' => ${ i.width }, ` +
			`'height' => ${ i.height }, ` +
			`'path' => '${ phpEscape( i.path ) }' ),`
	);

	return [
		'<?php',
		'/**',
		` * Font Awesome Free ${ version } icon data.`,
		' *',
		' * Generated by bin/generate-icons-json.js — do not edit by hand.',
		' * Run: npm run update-icons',
		' *',
		' * Icons are licensed CC BY 4.0 (https://fontawesome.com/license/free).',
		" * Font Awesome's own attribution comments do not survive this extraction,",
		' * so the credit in readme.txt and CREDITS.md is required, not optional.',
		' *',
		' * REQUIRE THIS LAZILY. It calls __() about 2000 times, and WordPress',
		' * raises _doing_it_wrong for a text domain used before',
		' * `after_setup_theme` (wp-includes/l10n.php:1444).',
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
}

/**
 * Writes src/ui/icon-library/icons-data.js — the picker's GEOMETRY.
 *
 * NO TEXT LIVES HERE, and that is the whole point.
 *
 * This file becomes an async webpack chunk, loaded by the webpack runtime
 * rather than enqueued as a script. WordPress looks up JS translations by
 * md5 of a REGISTERED HANDLE's src, so a string in a chunk has no handle to
 * be found under: `wp i18n make-json` writes a file that nothing ever loads,
 * and the string silently stays English. Labels and category titles
 * therefore live in PHP, where translate.wordpress.org already works, and
 * reach the picker over REST.
 *
 * Field names match the PHP file exactly — `width`/`height`, not `w`/`h`. The
 * picker hands a chosen icon straight to the render cache, and a shape
 * difference would mean translating between them at every hand-off, which is
 * a bug waiting to be written once and missed everywhere else.
 *
 * @param {Object} icons   Slug => { label, width, height, path, cats }.
 * @param {string} version Font Awesome tag the data came from.
 * @return {string} File contents.
 */
function renderJs( icons, version ) {
	const iconRows = Object.entries( icons ).map(
		( [ slug, i ] ) =>
			`\t'${ jsEscape( slug ) }': { ` +
			`width: ${ i.width }, height: ${ i.height }, ` +
			`path: '${ jsEscape( i.path ) }' },`
	);

	return [
		'/**',
		` * Font Awesome Free ${ version } icon geometry, for the editor's picker.`,
		' *',
		' * Generated by bin/generate-icons-json.js — do not edit by hand.',
		' * Run: npm run update-icons',
		' *',
		' * Icons are licensed CC BY 4.0 (https://fontawesome.com/license/free).',
		' *',
		' * NO TRANSLATABLE STRINGS. This builds into an async chunk, which is not',
		' * a registered script handle, so WordPress can never load translations',
		' * for it. Labels and category titles come from PHP over REST instead —',
		' * see includes/icon-handler/categories.php.',
		' *',
		' * IMPORT THIS DYNAMICALLY, under a NAMED chunk. A static import pulls it',
		' * into the editor bundle for everyone; an unnamed one is `898.js`, an id',
		' * that moves whenever the module graph does.',
		' */',
		'',
		'/* eslint-disable prettier/prettier -- generated; one row per icon is the readable form. */',
		'',
		'/** Icon slug => geometry. Text lives in PHP. */',
		'export const ICONS = {',
		...iconRows,
		'};',
		'',
	].join( '\n' );
}

/**
 * Writes includes/icon-handler/categories.php — the picker's TEXT.
 *
 * Editor-only. The front end resolves one slug and never groups or searches,
 * so it never loads this.
 *
 * It exists in PHP rather than beside the geometry because PHP is where
 * translation works: `wp i18n make-pot` extracts these __() calls, and
 * translate.wordpress.org delivers .mo files that core loads without any
 * handle mapping. The same strings in the async chunk would extract fine and
 * then never be loaded.
 *
 * REQUIRE THIS LAZILY, for the same reason as icons.php — __() before
 * `after_setup_theme` raises _doing_it_wrong (wp-includes/l10n.php:1444).
 *
 * @param {Object} icons   Slug => { label, width, height, path, cats }.
 * @param {Object} cats    Parsed categories.yml, for the titles.
 * @param {string} version Font Awesome tag the data came from.
 * @return {string} File contents.
 */
function renderCategoriesPhp( icons, cats, version ) {
	/*
	 * Only categories that actually have an icon in our set. Font Awesome lists
	 * some whose members are all Pro-only, and an empty sidebar row is worse
	 * than no row.
	 */
	const used = new Set();
	Object.values( icons ).forEach( ( i ) =>
		i.cats.forEach( ( c ) => used.add( c ) )
	);

	const titleRows = Object.keys( cats )
		.filter( ( slug ) => used.has( slug ) )
		.sort()
		.map(
			( slug ) =>
				`\t'${ phpEscape( slug ) }' => __( '${ phpEscape(
					cats[ slug ].label || slug
				) }', '${ TEXT_DOMAIN }' ),`
		);

	const memberRows = Object.entries( icons )
		.filter( ( [ , i ] ) => i.cats.length )
		.map(
			( [ slug, i ] ) =>
				`\t'${ phpEscape( slug ) }' => array( ${ i.cats
					.map( ( c ) => `'${ phpEscape( c ) }'` )
					.join( ', ' ) } ),`
		);

	return [
		'<?php',
		'/**',
		` * Font Awesome Free ${ version } category data, for the editor's picker.`,
		' *',
		' * Generated by bin/generate-icons-json.js — do not edit by hand.',
		' * Run: npm run update-icons',
		' *',
		' * Icons are licensed CC BY 4.0 (https://fontawesome.com/license/free).',
		' *',
		' * EDITOR ONLY. The front end resolves one slug and never groups, so',
		' * nothing on a visitor request loads this.',
		' *',
		' * REQUIRE THIS LAZILY. Like icons.php it calls __() on include, and',
		' * WordPress raises _doing_it_wrong for a text domain used before',
		' * `after_setup_theme` (wp-includes/l10n.php:1444).',
		' *',
		' * @package Zealblocks',
		' */',
		'',
		"defined( 'ABSPATH' ) || exit;",
		'',
		'// phpcs:disable WordPress.Arrays.MultipleStatementAlignment -- generated; aligning ~2000 rows would add tens of KB of whitespace.',
		'return array(',
		"\t'titles' => array(",
		...titleRows.map( ( r ) => `\t${ r }` ),
		'\t),',
		"\t'members' => array(",
		...memberRows.map( ( r ) => `\t${ r }` ),
		'\t),',
		');',
		'// phpcs:enable',
		'',
	].join( '\n' );
}

/* -------------------------------------------------------------------------
 * Main
 * ---------------------------------------------------------------------- */

/**
 * Fetches, transforms and writes both files.
 *
 * @return {Promise<void>} Resolves when everything is on disk.
 */
async function main() {
	const base = `${ REPO }/${ FA_VERSION }/metadata`;

	console.log( `Font Awesome Free ${ FA_VERSION }` );

	const iconsRaw = await read( ICONS_SRC, `${ base }/icons.json` );
	const catsRaw = await read( CATS_SRC, `${ base }/categories.yml` );

	console.log(
		`  icons.json      ${ ( byteLength( iconsRaw ) / 1048576 ).toFixed(
			2
		) } MB  sha256 ${ sha256( iconsRaw ).slice( 0, 16 ) }…`
	);
	console.log(
		`  categories.yml  ${ ( byteLength( catsRaw ) / 1024 ).toFixed(
			0
		) } KB  sha256 ${ sha256( catsRaw ).slice( 0, 16 ) }…`
	);

	const raw = JSON.parse( iconsRaw );
	const cats = yaml.load( catsRaw );
	const { icons, skipped } = buildIconSet( raw, cats );

	const phpPath = path.join( ROOT, 'includes', 'icon-handler', 'icons.php' );
	const catsPath = path.join(
		ROOT,
		'includes',
		'icon-handler',
		'categories.php'
	);
	const jsPath = path.join(
		ROOT,
		'src',
		'ui',
		'icon-library',
		'icons-data.js'
	);

	fs.mkdirSync( path.dirname( phpPath ), { recursive: true } );
	fs.mkdirSync( path.dirname( jsPath ), { recursive: true } );

	fs.writeFileSync( phpPath, renderPhp( icons, FA_VERSION ) );
	fs.writeFileSync(
		catsPath,
		renderCategoriesPhp( icons, cats, FA_VERSION )
	);
	fs.writeFileSync( jsPath, renderJs( icons, FA_VERSION ) );

	/*
	 * Provenance, so a build can be traced back to exact upstream bytes and a
	 * future maintainer can prove which release an icon came from.
	 */
	fs.writeFileSync(
		path.join( ROOT, 'includes', 'icon-handler', 'source.json' ),
		JSON.stringify(
			{
				source: 'Font Awesome Free',
				version: FA_VERSION,
				license: 'CC BY 4.0 — https://fontawesome.com/license/free',
				icons: {
					sha256: sha256( iconsRaw ),
					bytes: byteLength( iconsRaw ),
				},
				categories: {
					sha256: sha256( catsRaw ),
					bytes: byteLength( catsRaw ),
				},
				generated: new Date().toISOString().slice( 0, 10 ),
			},
			null,
			'\t'
		) + '\n'
	);

	const kb = ( p ) => `${ ( fs.statSync( p ).size / 1024 ).toFixed( 0 ) } KB`;

	console.log( `\n  icons written   ${ Object.keys( icons ).length }` );

	if ( skipped.length ) {
		console.log( `  skipped         ${ skipped.length } (no usable path)` );
	}

	console.log( `  categories      ${ Object.keys( cats ).length }` );
	console.log(
		`\n  includes/icon-handler/icons.php       ${ kb( phpPath ) }`
	);
	console.log(
		`  includes/icon-handler/categories.php  ${ kb( catsPath ) }`
	);
	console.log( `  src/ui/icon-library/icons-data.js     ${ kb( jsPath ) }` );
	console.log( `  includes/icon-handler/source.json  provenance recorded` );
}

main().catch( ( err ) => {
	console.error( `error: ${ err.message }` );
	process.exit( 1 );
} );
