/**
 * Core types for the unified-list package.
 *
 * Design principles:
 * - Type-driven: Make illegal states unrepresentable
 * - Composable: Small building blocks that combine
 * - Testable: Pure functions where possible
 */

import type { Accessor, JSX, Setter } from 'solid-js';

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
// List State Types
// ============================================================================

/** Core list state - pure data, no UI concerns */
export type ListState<T> = {
  /** All entities in the list (post-filter, post-sort) */
  entities: T[];
  /** Currently focused entity for keyboard navigation */
  focusedId: string | null;
  /** Multi-selected entity IDs */
  selectedIds: Set<string>;
  /** Whether the list is loading */
  isLoading: boolean;
  /** Whether there are more items to fetch */
  hasMore: boolean;
  /** Current scroll offset for restoration */
  scrollOffset: number;
};

/** List state transitions - pure functions */
export type ListStateTransition<T> = (state: ListState<T>) => ListState<T>;

/** Accessor-based reactive list state */
export type ReactiveListState<T> = {
  entities: Accessor<T[]>;
  focusedId: Accessor<string | null>;
  selectedIds: Accessor<Set<string>>;
  isLoading: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  scrollOffset: Accessor<number>;
};

/** Setters for list state */
export type ListStateSetters<T> = {
  setEntities: Setter<T[]>;
  setFocusedId: Setter<string | null>;
  setSelectedIds: Setter<Set<string>>;
  setIsLoading: Setter<boolean>;
  setHasMore: Setter<boolean>;
  setScrollOffset: Setter<number>;
};

// ============================================================================
// Plugin System Types
// ============================================================================

/** Plugin cleanup function */
export type CleanupFn = () => void;

/** Base plugin interface - returns cleanup function */
export type Plugin<T, C extends ListController<T>> = (
  controller: C
) => CleanupFn;

/** Plugin factory - creates plugin with configuration */
export type PluginFactory<T, C extends ListController<T>, Config = void> = (
  config: Config
) => Plugin<T, C>;

/** Command handler function */
export type CommandHandler<Payload = void> = (payload: Payload) => boolean;

/** Command priorities for execution order */
export const CommandPriority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
} as const;

export type CommandPriorityValue =
  (typeof CommandPriority)[keyof typeof CommandPriority];

/** Command registration */
export type CommandRegistration<Payload = void> = {
  name: string;
  handler: CommandHandler<Payload>;
  priority: CommandPriorityValue;
};

/** Command system interface */
export type CommandSystem = {
  register: <Payload>(
    name: string,
    handler: CommandHandler<Payload>,
    priority?: CommandPriorityValue
  ) => CleanupFn;
  dispatch: <Payload>(name: string, payload: Payload) => boolean;
  canDispatch: (name: string) => boolean;
};

// ============================================================================
// Controller Types
// ============================================================================

/** Core list controller - the main interface plugins interact with */
export type ListController<T> = {
  /** Unique identifier for this list instance */
  id: string;

  /** Reactive state accessors */
  state: ReactiveListState<T>;

  /** State setters */
  setters: ListStateSetters<T>;

  /** Command system for dispatching actions */
  commands: CommandSystem;

  /** Get entity by ID */
  getEntityById: (id: string) => T | undefined;

  /** Get entity index by ID */
  getEntityIndex: (id: string) => number;

  /** Get focused entity */
  getFocusedEntity: () => T | undefined;

  /** Scroll to entity by ID */
  scrollToEntity: (id: string) => void;

  /** Fetch more entities (infinite scroll) */
  fetchMore: () => Promise<void>;

  /** DOM container ref */
  containerRef: Accessor<HTMLElement | null>;
  setContainerRef: Setter<HTMLElement | null>;

  /** Virtualizer handle for scroll control */
  virtualizerHandle: Accessor<VirtualizerHandle | null>;
  setVirtualizerHandle: Setter<VirtualizerHandle | null>;
};

/** Virtualizer handle interface (from @tanstack/solid-virtual) */
export type VirtualizerHandle = {
  scrollToIndex: (
    index: number,
    options?: {
      align?: 'start' | 'center' | 'end';
      behavior?: 'auto' | 'smooth';
    }
  ) => void;
  scrollToOffset: (
    offset: number,
    options?: { behavior?: 'auto' | 'smooth' }
  ) => void;
  scrollOffset: number;
  getTotalSize: () => number;
  getVirtualItems: () => VirtualItem[];
};

export type VirtualItem = {
  key: string | number | bigint;
  index: number;
  start: number;
  end: number;
  size: number;
};

// ============================================================================
// Filter Types
// ============================================================================

/** Filter configuration */
export type FilterConfig<T> = {
  /** Unique identifier for this filter */
  id: string;
  /** Display label */
  label: string;
  /** Filter predicate */
  predicate: (entity: T) => boolean;
  /** Whether filter is currently active */
  active: boolean;
  /** Filter group for mutual exclusivity */
  group?: string;
};

/** Filter group - filters in same group are mutually exclusive */
export type FilterGroup<T> = {
  id: string;
  label: string;
  filters: FilterConfig<T>[];
  /** Whether multiple filters in this group can be active */
  allowMultiple: boolean;
};

/** Composed filter state */
export type FilterState<T> = {
  filters: Map<string, FilterConfig<T>>;
  groups: Map<string, FilterGroup<T>>;
  activeFilterIds: Set<string>;
};

// ============================================================================
// Sort Types
// ============================================================================

/** Sort configuration */
export type SortConfig<T> = {
  id: string;
  label: string;
  comparator: (a: T, b: T) => number;
};

/** Sort state */
export type SortState<T> = {
  activeSortId: string | null;
  sortOrder: 'ascending' | 'descending';
  sorts: Map<string, SortConfig<T>>;
};

// ============================================================================
// Selection Types
// ============================================================================

/** Selection mode */
export type SelectionMode = 'single' | 'multi' | 'range';

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
export type QueryConfig<T> = {
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
