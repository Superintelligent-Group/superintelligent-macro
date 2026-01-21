/**
 * Entity slot implementations.
 *
 * Each slot is a small, focused component that renders a specific part
 * of an entity row. Slots can be composed to create different entity displays.
 */

export { IndicatorSlot, createIndicatorSlot } from './IndicatorSlot';
export { IconSlot, createIconSlot } from './IconSlot';
export { TitleSlot, createTitleSlot } from './TitleSlot';
export { SubtitleSlot, createSubtitleSlot } from './SubtitleSlot';
export { BadgesSlot, createBadgesSlot } from './BadgesSlot';
export { TimestampSlot, createTimestampSlot } from './TimestampSlot';
export { ActionsSlot, createActionsSlot } from './ActionsSlot';
export {
  NotificationsSlot,
  createNotificationsSlot,
} from './NotificationsSlot';
export { SearchHitsSlot, createSearchHitsSlot } from './SearchHitsSlot';

// Children slot system
export {
  ChildrenSlot,
  CollapsibleChildList,
  ChildRow,
  ThreadBorder,
  type ChildrenSlotProps,
  type CollapsibleChildListProps,
  type ChildRowProps,
} from './ChildrenSlot';
