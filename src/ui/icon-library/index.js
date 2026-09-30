/**
 * Icon library — public API.
 *
 * Blocks import from here and nowhere deeper, so the internals (which file
 * holds the data, how it is fetched, how the picker is built) can change
 * without touching a single block.
 *
 *   import IconControl from '@/ui/icon-library';          the inspector field
 *   import { useIcon, Icon } from '@/ui/icon-library';    render a saved slug
 *
 * icons-data.js is deliberately NOT exported. It is ~1.5 MB and must only ever
 * be reached through the picker's dynamic import(); a static re-export here
 * would pull it into every bundle that touches this module.
 */

export { default } from './icon-control';
export { default as IconControl } from './icon-control';
export { default as IconPicker } from './icon-picker';
export { useIcon, Icon, primeIcon } from './use-icon';
