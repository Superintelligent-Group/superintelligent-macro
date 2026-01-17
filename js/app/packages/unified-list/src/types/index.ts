/**
 * Core types for the unified-list package.
 *
 * Design principles:
 * - Type-driven: Make illegal states unrepresentable
 * - Composable: Small building blocks that combine
 * - Testable: Pure functions where possible
 */

import type { JSX } from 'solid-js';

// Re-export entity types - single source of truth
export type {
  EntityData,
  EntityType,
  ExpandedEntityType,
  EntityBase,
  ChannelEntity,
  ChatEntity,
  DocumentEntity,
  TaskEntity,
  EmailEntity,
  ProjectEntity,
  EntityMapper,
  EntityEnhancer,
  EntityFilter,
  EntitiesFilter,
  EntityComparator,
  EntityRenderer,
} from '@macro-entity';

// ============================================================================
// Core Types - Re-export from core/types.ts
// ============================================================================

// Entity types
export type { EntityConstraint, GetEntityId } from '../core/types';

// List state types
export type {
  ListState,
  StateTransition,
  ReactiveState,
  StateSetters,
} from '../core/types';

// Command system types
export type {
  CommandHandler,
  CommandPriorityValue,
  CommandSystem,
  CommandRegistration,
} from '../core/types';
export { CommandPriority } from '../core/types';

// Controller types
export type {
  ListController,
  VirtualizerHandle,
  VirtualItem,
} from '../core/types';

// Plugin types
export type {
  CleanupFn,
  Plugin,
  PluginWithStore,
} from '../core/types';

// Filter types
export type {
  FilterPredicate,
  FilterConfig,
  FilterGroup,
} from '../core/types';

// Sort types
export type {
  Comparator,
  SortConfig,
  SortOrder,
} from '../core/types';

// Selection types
export type { SelectionMode } from '../core/types';

// Action types
export type { ActionConfig } from '../core/types';

// Group types
export type {
  GroupKeyFn,
  GroupConfig,
  GroupRegistry,
  HeaderItem,
  EntityItem,
  DisplayItem,
  RowRenderState,
  RowRenderer,
} from '../core/types';
export { isHeaderItem, isEntityItem } from '../core/types';

// Commands
export { ListCommands } from '../core/types';
export type { ListCommand } from '../core/types';

// ============================================================================
// Backwards Compatibility Aliases
// ============================================================================

// Old names that mapped to new types
import type {
  StateTransition as CoreStateTransition,
  ReactiveState as CoreReactiveState,
  StateSetters as CoreStateSetters,
  EntityConstraint,
  FilterConfig as CoreFilterConfig,
  FilterGroup as CoreFilterGroup,
  SortConfig as CoreSortConfig,
  ListController,
  CleanupFn,
} from '../core/types';

/** @deprecated Use ListState from core/types */
export type ListStateTransition<T extends EntityConstraint> =
  CoreStateTransition<T>;

/** @deprecated Use ReactiveState from core/types */
export type ReactiveListState<T extends EntityConstraint> =
  CoreReactiveState<T>;

/** @deprecated Use StateSetters from core/types */
export type ListStateSetters<T extends EntityConstraint> = CoreStateSetters<T>;

// ============================================================================
// Additional Types (not in core)
// ============================================================================

// ============================================================================
// Filter Types (extended)
// ============================================================================

/** Composed filter state */
export type FilterState<T> = {
  filters: Map<string, CoreFilterConfig<T>>;
  groups: Map<string, CoreFilterGroup>;
  activeFilterIds: Set<string>;
};

// ============================================================================
// Sort Types (extended)
// ============================================================================

/** Sort state */
export type SortState<T> = {
  activeSortId: string | null;
  sortOrder: 'ascending' | 'descending';
  sorts: Map<string, CoreSortConfig<T>>;
};

// ============================================================================
// Selection Types (extended)
// ============================================================================

/** Selection state */
export type SelectionState = {
  mode: SelectionMode;
  selectedIds: Set<string>;
  anchorId: string | null;
  lastClickedId: string | null;
};

// ============================================================================
// Navigation Types
// ============================================================================

/** Navigation direction */
export type NavigationDirection = 'up' | 'down' | 'start' | 'end';

/** Navigation mode */
export type NavigationMode = 'step' | 'page' | 'jump';

/** Navigation input */
export type NavigationInput = {
  direction: NavigationDirection;
  mode: NavigationMode;
  select?: boolean;
};

// ============================================================================
// Rendering Types
// ============================================================================

/** Slot names for entity rendering */
export type EntitySlot =
  | 'indicator'
  | 'checkbox'
  | 'icon'
  | 'title'
  | 'subtitle'
  | 'metadata'
  | 'timestamp'
  | 'badge'
  | 'actions'
  | 'properties'
  | 'notifications'
  | 'content';

/** Slot renderer */
export type SlotRenderer<T> = (props: {
  entity: T;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
}) => JSX.Element | null;

/** Entity template configuration */
export type EntityTemplate<T> = {
  slots: Partial<Record<EntitySlot, SlotRenderer<T>>>;
  layout: 'default' | 'compact' | 'expanded';
  height: number;
};

// ============================================================================
// Query Types
// ============================================================================

/** Query configuration for data fetching */
export type QueryConfig = {
  /** Query key for caching */
  queryKey: unknown[];
  /** Whether this is an infinite query */
  infinite: boolean;
  /** Operations this query supports */
  operations: {
    filter: boolean;
    search: boolean;
  };
};

// ============================================================================
// Event Types
// ============================================================================

/** Entity click event type */
export type EntityClickType =
  | 'entity'
  | 'entity-project-path'
  | 'notification'
  | 'action';

/** Entity click event */
export type EntityClickEvent<T> = {
  type: EntityClickType;
  entity: T;
  event: MouseEvent | PointerEvent | KeyboardEvent;
};

/** Entity action */
export type EntityAction<T> = {
  id: string;
  label: string;
  icon?: string;
  handler: (entities: T[]) => Promise<void> | void;
  canExecute: (entities: T[]) => boolean;
  hotkey?: string;
};

// ============================================================================
// Legacy/Deprecated Types
// ============================================================================

/** @deprecated Use Plugin<T> from core/types instead */
export type PluginFactory<T extends EntityConstraint, Config = void> = (
  config: Config
) => (controller: ListController<T>) => CleanupFn;
