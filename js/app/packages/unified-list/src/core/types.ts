/**
 * Core types for the unified-list package.
 *
 * Design principles:
 * - Types drive composition - if types align, composition makes sense
 * - Discriminated unions for state variants
 * - Generic over entity type with minimal constraints
 * - Pure function signatures for state transitions
 */

import type { Accessor, Setter } from 'solid-js';

// ============================================================================
// Entity Types
// ============================================================================

/** Minimal constraint for entities - must have an ID */
export type EntityConstraint = { id: string };

/** Function to extract ID from an entity */
export type GetEntityId<T> = (entity: T) => string;

// ============================================================================
// List State
// ============================================================================

/** Core list state - immutable data structure */
export type ListState<T extends EntityConstraint> = {
  /** All entities in the list */
  readonly entities: readonly T[];
  /** Currently focused entity ID (keyboard navigation) */
  readonly focusedId: string | null;
  /** Selected entity IDs (multi-select) */
  readonly selectedIds: ReadonlySet<string>;
  /** Loading state */
  readonly isLoading: boolean;
  /** Has more data for infinite scroll */
  readonly hasMore: boolean;
  /** Current scroll offset */
  readonly scrollOffset: number;
  /** Visible entity IDs when filtering/grouping (null = use entities) */
  readonly visibleEntityIds: readonly string[] | null;
};

/** Pure state transition function */
export type StateTransition<T extends EntityConstraint> = (
  state: ListState<T>
) => ListState<T>;

/** Reactive list state using Solid.js accessors */
export type ReactiveState<T extends EntityConstraint> = {
  readonly entities: Accessor<readonly T[]>;
  readonly focusedId: Accessor<string | null>;
  readonly selectedIds: Accessor<ReadonlySet<string>>;
  readonly isLoading: Accessor<boolean>;
  readonly hasMore: Accessor<boolean>;
  readonly scrollOffset: Accessor<number>;
  readonly visibleEntityIds: Accessor<readonly string[] | null>;
};

/** State setters */
export type StateSetters<T extends EntityConstraint> = {
  readonly setEntities: Setter<readonly T[]>;
  readonly setFocusedId: Setter<string | null>;
  readonly setSelectedIds: Setter<ReadonlySet<string>>;
  readonly setIsLoading: Setter<boolean>;
  readonly setHasMore: Setter<boolean>;
  readonly setScrollOffset: Setter<number>;
  readonly setVisibleEntityIds: Setter<readonly string[] | null>;
};

// ============================================================================
// Command System
// ============================================================================

/** Command handler function */
export type CommandHandler<TPayload = void> = (payload: TPayload) => boolean;

/** Command priority values (lower = higher priority) */
export const CommandPriority = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
  EDITOR: 4,
} as const;

export type CommandPriorityValue =
  (typeof CommandPriority)[keyof typeof CommandPriority];

/** Command registration handle */
export type CommandRegistration = {
  readonly unregister: () => void;
};

/** Command system interface */
export type CommandSystem = {
  /** Register a command handler */
  register<TPayload = void>(
    command: string,
    handler: CommandHandler<TPayload>,
    priority?: CommandPriorityValue
  ): CommandRegistration;

  /** Dispatch a command */
  dispatch<TPayload = void>(command: string, payload: TPayload): boolean;

  /** Check if command has handlers */
  hasHandlers(command: string): boolean;
};

// ============================================================================
// Controller
// ============================================================================

/** Virtualizer handle for scroll control */
export type VirtualizerHandle = {
  scrollToIndex(
    index: number,
    options?: {
      align?: 'start' | 'center' | 'end';
      behavior?: 'auto' | 'smooth';
    }
  ): void;
  scrollToOffset(
    offset: number,
    options?: { behavior?: 'auto' | 'smooth' }
  ): void;
  scrollOffset: number;
  getTotalSize(): number;
  getVirtualItems(): VirtualItem[];
  /** Optional measure function - not all virtualizers support this */
  measure?(): void;
};

/** Virtual item from tanstack */
export type VirtualItem = {
  key: string | number | bigint;
  index: number;
  start: number;
  end: number;
  size: number;
};

/** List controller - the main interface for plugins */
export type ListController<T extends EntityConstraint> = {
  /** Unique list identifier */
  readonly id: string;

  /** Reactive state accessors */
  readonly state: ReactiveState<T>;

  /** State setters */
  readonly setters: StateSetters<T>;

  /** Command system */
  readonly commands: CommandSystem;

  /** Get entity by ID (O(1) lookup) */
  getEntityById(id: string): T | undefined;

  /** Get entity index by ID (O(1) lookup) */
  getEntityIndex(id: string): number;

  /** Get currently focused entity */
  getFocusedEntity(): T | undefined;

  /** Get selected entities */
  getSelectedEntities(): readonly T[];

  /** Get effective entity list (visible or all) */
  getEffectiveEntities(): readonly T[];

  /** Scroll to entity by ID */
  scrollToEntity(id: string): void;

  /** Fetch more entities (infinite scroll) */
  fetchMore(): Promise<void>;

  /** Container element ref */
  readonly containerRef: Accessor<HTMLElement | null>;
  readonly setContainerRef: Setter<HTMLElement | null>;

  /** Virtualizer handle */
  readonly virtualizerHandle: Accessor<VirtualizerHandle | null>;
  readonly setVirtualizerHandle: Setter<VirtualizerHandle | null>;
};

// ============================================================================
// Plugin System
// ============================================================================

/** Cleanup function returned by plugins */
export type CleanupFn = () => void;

/** Plugin function signature */
export type Plugin<T extends EntityConstraint> = (
  controller: ListController<T>
) => CleanupFn;

/** Plugin with attached store */
export type PluginWithStore<T extends EntityConstraint, TStore> = Plugin<T> & {
  readonly store: TStore;
};

// ============================================================================
// Filter Types
// ============================================================================

/** Filter predicate function */
export type FilterPredicate<T> = (entity: T) => boolean;

/** Filter configuration */
export type FilterConfig<T> = {
  readonly id: string;
  readonly label: string;
  readonly predicate: FilterPredicate<T>;
  readonly group?: string;
};

/** Filter group for mutual exclusivity */
export type FilterGroup = {
  readonly id: string;
  readonly label: string;
  readonly filterIds: readonly string[];
  readonly allowMultiple?: boolean;
};

// ============================================================================
// Sort Types
// ============================================================================

/** Comparator function */
export type Comparator<T> = (a: T, b: T) => number;

/** Sort configuration */
export type SortConfig<T> = {
  readonly id: string;
  readonly label: string;
  readonly comparator: Comparator<T>;
};

/** Sort order */
export type SortOrder = 'ascending' | 'descending';

// ============================================================================
// Selection Types
// ============================================================================

/** Selection mode */
export type SelectionMode = 'single' | 'multi' | 'range' | 'none';

// ============================================================================
// Action Types
// ============================================================================

/** Entity action configuration */
export type ActionConfig<T extends EntityConstraint> = {
  readonly id: string;
  readonly label: string;
  readonly hotkey?: string;
  readonly canExecute?: (entities: readonly T[]) => boolean;
  readonly execute: (entities: readonly T[]) => void | Promise<void>;
};

// ============================================================================
// Group Types
// ============================================================================

/** Group key extraction function */
export type GroupKeyFn<T> = (entity: T) => string;

/** Group configuration */
export type GroupConfig = {
  readonly id: string;
  readonly label: string;
  readonly order: number;
  readonly icon?: string;
};

/** Group registry */
export type GroupRegistry = ReadonlyMap<string, GroupConfig>;

/** Header display item */
export type HeaderItem = {
  readonly type: 'header';
  readonly groupId: string;
  readonly label: string;
  readonly icon?: string;
  readonly count: number;
  readonly collapsed: boolean;
};

/** Entity display item */
export type EntityItem<T> = {
  readonly type: 'entity';
  readonly entity: T;
  readonly groupId: string;
};

/** Display item (discriminated union) */
export type DisplayItem<T> = HeaderItem | EntityItem<T>;

/** Type guard for header items */
export function isHeaderItem<T>(item: DisplayItem<T>): item is HeaderItem {
  return item.type === 'header';
}

/** Type guard for entity items */
export function isEntityItem<T>(item: DisplayItem<T>): item is EntityItem<T> {
  return item.type === 'entity';
}

// ============================================================================
// Rendering Types
// ============================================================================

/** Row render state passed to render function */
export type RowRenderState = {
  readonly index: number;
  readonly focused: boolean;
  readonly selected: boolean;
  readonly triggerMeasure: () => void;
};

/** Row renderer function */
export type RowRenderer<T> = (entity: T, state: RowRenderState) => unknown;

// ============================================================================
// Standard Commands
// ============================================================================

export const ListCommands = {
  // Navigation
  NAVIGATE_UP: 'list:navigate-up',
  NAVIGATE_DOWN: 'list:navigate-down',
  NAVIGATE_FIRST: 'list:navigate-first',
  NAVIGATE_LAST: 'list:navigate-last',
  NAVIGATE_PAGE_UP: 'list:navigate-page-up',
  NAVIGATE_PAGE_DOWN: 'list:navigate-page-down',
  // Legacy navigation aliases
  NAVIGATE_START: 'list:navigate-first',
  NAVIGATE_END: 'list:navigate-last',

  // Selection
  SELECT_FOCUSED: 'list:select-focused',
  TOGGLE_SELECTION: 'list:toggle-selection',
  SELECT_ALL: 'list:select-all',
  CLEAR_SELECTION: 'list:clear-selection',
  EXTEND_SELECTION_UP: 'list:extend-selection-up',
  EXTEND_SELECTION_DOWN: 'list:extend-selection-down',

  // Actions
  OPEN_ENTITY: 'list:open-entity',
  OPEN_PREVIEW: 'list:open-preview',
  OPEN_ENTITY_PREVIEW: 'list:open-preview',
  EXECUTE_ACTION: 'list:execute-action',
  TOGGLE_PREVIEW: 'list:toggle-preview',
  MARK_DONE: 'list:mark-done',
  DELETE_SELECTED: 'list:delete-selected',

  // Filtering
  TOGGLE_FILTER: 'list:toggle-filter',
  CLEAR_FILTERS: 'list:clear-filters',

  // Search
  FOCUS_SEARCH: 'list:focus-search',
  CLEAR_SEARCH: 'list:clear-search',

  // Groups
  TOGGLE_GROUP: 'list:toggle-group',
  EXPAND_ALL_GROUPS: 'list:expand-all-groups',
  COLLAPSE_ALL_GROUPS: 'list:collapse-all-groups',

  // Data
  FETCH_MORE: 'list:fetch-more',
  REFRESH: 'list:refresh',
} as const;

export type ListCommand = (typeof ListCommands)[keyof typeof ListCommands];
