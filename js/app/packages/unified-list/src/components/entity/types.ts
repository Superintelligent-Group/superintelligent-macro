/**
 * Entity rendering types and slot system.
 *
 * Design:
 * - Slot-based composition for flexible entity rendering
 * - Type-safe slot props
 * - Support all entity types with specialized rendering
 */

import type { JSX, Accessor } from 'solid-js';
import type {
  EntityData,
  Notification,
  WithNotification,
  WithSearch,
  SearchLocation,
} from '@macro-entity';
import type { Property } from '@core/component/Properties/types';

// ============================================================================
// Entity Display Types
// ============================================================================

/** Enhanced entity with notifications and optional search data */
export type EnhancedEntity<T extends EntityData = EntityData> =
  WithNotification<T | WithSearch<T>>;

/** Entity click event types */
export type EntityClickType = 'entity' | 'entity-project-path';

/** Entity click event payload */
export type EntityClickEvent<T extends EntityData = EntityData> = {
  type: EntityClickType;
  entity: T;
  projectEntity?: T;
  event: MouseEvent | PointerEvent;
  location?: SearchLocation;
};

/** Entity click handler */
export type EntityClickHandler<T extends EntityData = EntityData> = (
  event: EntityClickEvent<T>
) => void;

/** Notification click handler */
export type NotificationClickHandler<T extends EntityData = EntityData> = (
  event: EntityClickEvent<T & { notification: Notification }>
) => void;

// ============================================================================
// Slot System Types
// ============================================================================

/** Props passed to all slot renderers */
export type SlotProps<T extends EntityData = EntityData> = {
  entity: EnhancedEntity<T>;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  isChecked: boolean;
  isHovered: boolean;
  searchActive: boolean;
};

/** Slot renderer function type */
export type SlotRenderer<T extends EntityData = EntityData> = (
  props: SlotProps<T>
) => JSX.Element | null;

/** Available slot positions in entity row */
export type EntitySlotName =
  | 'leftIndicator' // Unread dot / checkbox area
  | 'icon' // Entity icon (email, doc, channel, etc.)
  | 'title' // Main title/name
  | 'subtitle' // Secondary text (snippet, latest message)
  | 'badges' // Shared badge, project badge
  | 'properties' // Task properties (status, priority, assignees)
  | 'timestamp' // Updated/created time
  | 'actions' // Row actions (mark done button)
  | 'notifications' // Unrolled notifications
  | 'searchHits'; // Search content hits

/** Slot configuration map */
export type EntitySlots<T extends EntityData = EntityData> = Partial<
  Record<EntitySlotName, SlotRenderer<T>>
>;

// ============================================================================
// Entity Row Configuration
// ============================================================================

/** Configuration for entity row rendering */
export type EntityRowConfig<T extends EntityData = EntityData> = {
  /** Slot renderers */
  slots: EntitySlots<T>;
  /** Row height in pixels */
  height: number;
  /** Layout variant */
  layout: 'default' | 'compact' | 'expanded';
  /** Click handler */
  onClick?: EntityClickHandler<T>;
  /** Double click handler */
  onDoubleClick?: EntityClickHandler<T>;
  /** Pointer down handler (for multi-select) */
  onPointerDown?: EntityClickHandler<T>;
  /** Row action handler */
  onRowAction?: (entity: T, action: 'done' | 'delete') => void;
  /** Notification click handler */
  onNotificationClick?: NotificationClickHandler<T>;
  /** Checkbox toggle handler */
  onCheckboxToggle?: (entity: T, checked: boolean, shiftKey?: boolean) => void;
  /** Context menu handler */
  onContextMenu?: (entity: T) => void;
  /** Whether to show unread indicators */
  showUnreadIndicator?: boolean;
  /** Whether to show the left column indicator */
  showLeftColumnIndicator?: boolean;
  /** Whether to unroll notifications */
  showUnrollNotifications?: boolean;
  /** Whether to show done button */
  showDoneButton?: boolean;
  /** Whether to fade read items */
  fadeIfRead?: boolean;
  /** Called when expandable content changes size (for virtualizer re-measurement) */
  onToggleExpand?: () => void;
  /** Properties to display (for tasks) */
  properties?: Property[];
  /** Children slot configuration - unified children rendering (notifications, search hits, etc.) */
  childrenSlot?: {
    /** Reactive children array */
    children: Accessor<unknown[]>;
    /** How to render each child row */
    rowConfig: ChildRowConfig<unknown>;
    /** Maximum visible children before collapse (default: 3) */
    maxVisible?: number;
    /** Whether the list is collapsible (default: true) */
    collapsible?: boolean;
    /** Custom "show more" label function */
    moreLabel?: (hiddenCount: number) => string;
    /** Generate unique child ID for selection targeting */
    getChildId?: (child: unknown, index: number) => ChildItemId;
  };
};

// ============================================================================
// Entity Type-Specific Props
// ============================================================================

/** Email-specific display props */
export type EmailDisplayProps = {
  showSnippet?: boolean;
  showParticipants?: boolean;
  showLabels?: boolean;
};

/** Channel-specific display props */
export type ChannelDisplayProps = {
  showLatestMessage?: boolean;
  showParticipantIcon?: boolean;
};

/** Document-specific display props */
export type DocumentDisplayProps = {
  showFileType?: boolean;
  showProjectPath?: boolean;
};

/** Task-specific display props */
export type TaskDisplayProps = {
  showStatus?: boolean;
  showPriority?: boolean;
  showAssignees?: boolean;
};

// ============================================================================
// Slot Builder Types
// ============================================================================

/** Factory for creating slot renderers */
export type SlotFactory<T extends EntityData = EntityData> = {
  /** Create indicator slot */
  indicator: (config?: {
    showUnread?: boolean;
    showCheckbox?: boolean;
  }) => SlotRenderer<T>;
  /** Create icon slot */
  icon: (config?: { showDmParticipant?: boolean }) => SlotRenderer<T>;
  /** Create title slot */
  title: (config?: { showSearchHighlight?: boolean }) => SlotRenderer<T>;
  /** Create subtitle slot */
  subtitle: (config?: {
    showSnippet?: boolean;
    showLatestMessage?: boolean;
  }) => SlotRenderer<T>;
  /** Create badges slot */
  badges: (config?: {
    showShared?: boolean;
    showProject?: boolean;
  }) => SlotRenderer<T>;
  /** Create properties slot */
  properties: (config?: {
    properties?: Property[];
    maxVisible?: number;
  }) => SlotRenderer<T>;
  /** Create timestamp slot */
  timestamp: (config?: { format?: 'relative' | 'absolute' }) => SlotRenderer<T>;
  /** Create actions slot */
  actions: (config?: {
    showDone?: boolean;
    showDelete?: boolean;
  }) => SlotRenderer<T>;
  /** Create notifications slot */
  notifications: (config?: {
    maxVisible?: number;
    collapsible?: boolean;
  }) => SlotRenderer<T>;
  /** Create search hits slot */
  searchHits: (config?: {
    maxVisible?: number;
    showThreadBorder?: boolean;
  }) => SlotRenderer<T>;
};

// ============================================================================
// Children Slot System Types
// ============================================================================

/**
 * Unique identifier for a child item, enabling future controller selection.
 * Format: {parentId}:{childId}
 */
export type ChildItemId = string;

/**
 * Child row slot names - each child has its own slot system.
 * Similar to EntityRow slots but for child items.
 */
export type ChildRowSlotName =
  | 'userIcon' // User avatar/profile picture
  | 'label' // Action type label ("shared", "message", etc.)
  | 'content' // Main content (markdown text)
  | 'date' // Date/timestamp
  | 'actions'; // Row-level actions

/**
 * Props passed to child row slot renderers.
 */
export type ChildRowSlotProps<TChild> = {
  /** The child item data */
  child: TChild;
  /** Index within the children list */
  index: number;
  /** Total count of children */
  totalCount: number;
  /** Child's unique identifier for selection targeting */
  childId: ChildItemId;
  /** Whether this specific child is focused (for future keyboard nav) */
  isChildFocused: boolean;
};

/**
 * Slot renderer function type for child rows.
 */
export type ChildRowSlotRenderer<TChild> = (
  props: ChildRowSlotProps<TChild>
) => JSX.Element | null;

/**
 * Child row slots configuration.
 * Maps slot names to their renderers.
 */
export type ChildRowSlots<TChild> = Partial<
  Record<ChildRowSlotName, ChildRowSlotRenderer<TChild>>
>;

/**
 * Base child item interface.
 * All children must have an id for identification.
 */
export type ChildItem<TData = unknown> = {
  /** Unique identifier for the child */
  id: string;
  /** Consumer's data (Notification, ContentHitData, etc.) */
  data: TData;
};

/**
 * Child row configuration - defines how a single child row is rendered.
 */
export type ChildRowConfig<TChild> = {
  /** Slot renderers for the child row */
  slots: ChildRowSlots<TChild>;
  /** Whether to show thread border connector */
  showThreadBorder?: boolean;
  /** Click handler for the child row */
  onClick?: (child: TChild, event: MouseEvent) => void;
  /** Whether clicking blocks parent navigation */
  blocksNavigation?: boolean;
  /** Custom class names */
  classList?: Record<string, boolean>;
};

/**
 * Children slot configuration - configures how children are rendered.
 */
export type ChildrenSlotConfig<TChild> = {
  /** How to render each child row */
  rowConfig: ChildRowConfig<TChild>;
  /** Maximum visible children before collapse */
  maxVisible?: number;
  /** Whether the list is collapsible */
  collapsible?: boolean;
  /** Custom "show more" label function */
  moreLabel?: (hiddenCount: number) => string;
  /** Generate unique child ID for selection targeting */
  getChildId?: (child: TChild, index: number) => ChildItemId;
};
