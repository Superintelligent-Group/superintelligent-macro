/**
 * GroupBy Types - Type definitions for the group-by plugin system.
 *
 * Enables grouping entities by a key function and rendering collapsible
 * section headers between entity rows.
 */

import type { Accessor, Setter, JSX } from 'solid-js';

// ============================================================================
// Core Types
// ============================================================================

/** Unique identifier for a group */
export type GroupId = string;

/** Function to extract group key from an entity */
export type GroupKeyFn<T> = (entity: T) => GroupId;

/** Configuration for a single group */
export type GroupConfig = {
  id: GroupId;
  label: string;
  /** Icon component for the group header */
  icon?: () => JSX.Element;
  /** Sort order - lower values appear first (default: alphabetical by label) */
  order?: number;
};

/** Registry mapping group IDs to their configuration */
export type GroupRegistry = Map<GroupId, GroupConfig>;

// ============================================================================
// Display Items - Discriminated union for virtualized rendering
// ============================================================================

/** Header item in the display list */
export type HeaderDisplayItem = {
  type: 'header';
  groupId: GroupId;
  label: string;
  icon?: () => JSX.Element;
  count: number;
  collapsed: boolean;
};

/** Entity item in the display list */
export type EntityDisplayItem<T> = {
  type: 'entity';
  entity: T;
  groupId: GroupId;
};

/** Discriminated union for display items (headers + entities) */
export type DisplayItem<T> = HeaderDisplayItem | EntityDisplayItem<T>;

// ============================================================================
// Type Guards
// ============================================================================

/** Check if display item is an entity */
export function isEntityItem<T>(
  item: DisplayItem<T>
): item is EntityDisplayItem<T> {
  return item.type === 'entity';
}

/** Check if display item is a header */
export function isHeaderItem<T>(
  item: DisplayItem<T>
): item is HeaderDisplayItem {
  return item.type === 'header';
}

/** Get unique key for a display item (for reconciliation) */
export function getDisplayItemKey<T extends { id: string }>(
  item: DisplayItem<T>
): string {
  return item.type === 'header' ? `header:${item.groupId}` : item.entity.id;
}

// ============================================================================
// Group Store Types
// ============================================================================

/** Reactive store exposed by GroupByPlugin */
export type GroupStore<T> = {
  /** Whether grouping is currently enabled */
  enabled: Accessor<boolean>;
  setEnabled: Setter<boolean>;

  /** The group key function */
  groupKeyFn: GroupKeyFn<T>;

  /** Group registry with configurations */
  groupRegistry: GroupRegistry;

  /** Set of currently collapsed group IDs */
  collapsedGroups: Accessor<Set<GroupId>>;
  setCollapsedGroups: Setter<Set<GroupId>>;

  /** Toggle a specific group's collapsed state */
  toggleGroup: (groupId: GroupId) => void;

  /** Collapse all groups */
  collapseAll: () => void;

  /** Expand all groups */
  expandAll: () => void;

  /** Transform entities into display items (headers + entities) */
  createDisplayItems: (entities: readonly T[]) => DisplayItem<T>[];

  /** Get ordered list of visible group IDs (groups with at least one entity) */
  getVisibleGroupIds: (entities: readonly T[]) => GroupId[];
};

// ============================================================================
// Plugin Configuration
// ============================================================================

/** Configuration for createGroupByPlugin */
export type GroupByPluginConfig<T> = {
  /** Function to extract group key from entity */
  groupKeyFn: GroupKeyFn<T>;

  /** Registry of group configurations (id, label, icon, order) */
  groupRegistry: GroupRegistry;

  /** Initially collapsed group IDs */
  initialCollapsed?: Set<GroupId>;

  /** Whether grouping starts enabled (default: true) */
  initialEnabled?: boolean;

  /** Callback when collapse state changes */
  onCollapseChange?: (collapsedGroups: Set<GroupId>) => void;

  /** Callback when enabled state changes */
  onEnabledChange?: (enabled: boolean) => void;
};

// ============================================================================
// Group Header Component Types
// ============================================================================

/** Props for the GroupHeader component */
export type GroupHeaderProps = {
  groupId: GroupId;
  label: string;
  icon?: () => JSX.Element;
  count: number;
  collapsed: boolean;
  onToggle: (groupId: GroupId) => void;
};

/** Custom group header renderer function */
export type GroupHeaderRenderer = (props: GroupHeaderProps) => JSX.Element;
