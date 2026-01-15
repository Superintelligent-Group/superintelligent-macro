/**
 * ChildrenSlot - Unified children rendering system.
 *
 * Exports:
 * - ChildrenSlot: Main container component
 * - CollapsibleChildList: Collapse/expand container
 * - ChildRow: Single child row with slot system
 * - ThreadBorder: Visual connector component
 */

export { ChildrenSlot, type ChildrenSlotProps } from './ChildrenSlot';
export {
  CollapsibleChildList,
  type CollapsibleChildListProps,
} from './CollapsibleChildList';
export { ChildRow, ThreadBorder, type ChildRowProps } from './ChildRow';
