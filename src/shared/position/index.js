/**
 * Position, shared: per-device position type and offsets.
 *
 *   PHP   includes/block/class-position.php  Position::properties() for a
 *                                            block's responsive() map
 *   JS    PositionItem                       the inspector item
 *         getPositionPreview()               the canvas preview
 *
 * Text has it beside its overflow and z-index; nested Containers have it as a
 * child setting (CH-06).
 */

export { PositionItem, clearPosition } from './control';
export { getPositionPreview } from './preview';
export {
	POSITION_KEY,
	OFFSET_KEYS,
	POSITION_ITEM_KEYS,
	OFFSET_UNITS,
	POSITION_OPTIONS,
} from './constants';
