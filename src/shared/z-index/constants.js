/**
 * Z-index — values shared by every block that opts in.
 */

/**
 * Key under `style.zealblocks`. MUST match Z_Index::KEY.
 */
export const Z_INDEX_KEY = 'zIndex';

/**
 * The editor's range, as Spectra Free's. MUST match Z_Index::MIN and ::MAX;
 * BlockContractTest compares them.
 */
export const Z_INDEX_RANGE = { min: -100, max: 1000 };

/**
 * The class that switches on `position: relative`. MUST match
 * Z_Index::CLASS_NAME.
 */
export const Z_INDEX_CLASS = 'has-zealblocks-z-index';
