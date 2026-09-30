/**
 * Icon library — public API.
 *
 * Blocks import from here and nowhere deeper, so the internals (which file
 * holds the data, how it is fetched, how the picker is built) can change
 * without touching a single block.
 *
 *   import IconControl from '@/ui/icon-library';          the inspector field
 *   import { useIcon, Icon } from '@/ui/icon-library';    render a saved slug
 *   import { IconPicker } from '@/ui/icon-library';       open the picker yourself
 *
 * primeIcon is NOT exported. It writes to the render cache, which only the
 * picker has any business doing, and a block calling it could seed a slug with
 * geometry that does not match what the front end will draw.
 *
 * icons-data.js is deliberately NOT exported. It is ~1.5 MB and must only ever
 * be reached through the picker's dynamic import(); a static re-export here
 * would pull it into every bundle that touches this module.
 */

export { default } from './icon-control';
export { default as IconPicker } from './icon-picker';
export { useIcon, Icon } from './use-icon';
