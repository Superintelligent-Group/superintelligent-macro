/**
 * Filter Plugin - composable filtering system.
 *
 * Filters are pure predicate functions that can be composed.
 * - AND composition by default
 * - OR composition available via utility
 * - Filter groups for mutual exclusivity
 * - Reactive filter state with computed filterFn
 *
 * The plugin does NOT auto-apply filtering to entities.
 * Consumer is responsible for using filterStore.filterFn() on their data.
 * This keeps the pipeline explicit and testable.
 *
 * @example
 * ```ts
 * const { store, plugin } = createFilterPlugin({
 *   filters: [
 *     { id: 'docs', label: 'Documents', predicate: (e) => e.type === 'document' },
 *     { id: 'tasks', label: 'Tasks', predicate: (e) => e.type === 'task' },
 *   ],
 *   groups: [{ id: 'type', filterIds: ['docs', 'tasks'], allowMultiple: false }],
 * });
 *
 * // In component: apply filter
 * const filtered = createMemo(() => entities().filter(store.filterFn()));
 * ```
 */

import { createSignal, createMemo, type Accessor, type Setter } from 'solid-js';
import type {
  EntityConstraint,
  Plugin,
  ListController,
  FilterConfig,
  FilterGroup,
  FilterPredicate,
  CleanupFn,
  PluginWithStore,
} from '../core/types';
import { CommandPriority } from '../core/types';
import { ListCommands, type ToggleFilterPayload } from '../core/commands';

// ============================================================================
// Filter Store Types
// ============================================================================

export type FilterStore<T> = {
  /** All registered filters */
  readonly filters: Accessor<ReadonlyMap<string, FilterConfig<T>>>;
  /** All registered filter groups */
  readonly groups: Accessor<ReadonlyMap<string, FilterGroup>>;
  /** Currently active filter IDs */
  readonly activeFilterIds: Accessor<ReadonlySet<string>>;
  /** Set active filter IDs */
  readonly setActiveFilterIds: Setter<ReadonlySet<string>>;
  /** Computed filter function (AND composition of active filters) */
  readonly filterFn: Accessor<FilterPredicate<T>>;
  /** Check if a specific filter is active */
  readonly isActive: (filterId: string) => boolean;
  /** Get active filters in a specific group */
  readonly getActiveInGroup: (groupId: string) => readonly string[];
};

// ============================================================================
// Filter Store Factory
// ============================================================================

/** Create reactive filter store */
export function createFilterStore<T>(
  initialFilters: ReadonlyMap<string, FilterConfig<T>> = new Map(),
  initialGroups: ReadonlyMap<string, FilterGroup> = new Map(),
  initialActive: ReadonlySet<string> = new Set()
): FilterStore<T> {
  const [filters] = createSignal(initialFilters);
  const [groups] = createSignal(initialGroups);
  const [activeFilterIds, setActiveFilterIds] =
    createSignal<ReadonlySet<string>>(initialActive);

  /** Compose active filters into a single predicate (AND logic) */
  const filterFn = createMemo<FilterPredicate<T>>(() => {
    const active = activeFilterIds();
    const filterMap = filters();

    if (active.size === 0) {
      return () => true;
    }

    // Collect predicates for active filters
    const predicates: FilterPredicate<T>[] = [];
    for (const filterId of active) {
      const filter = filterMap.get(filterId);
      if (filter) {
        predicates.push(filter.predicate);
      }
    }

    if (predicates.length === 0) {
      return () => true;
    }

    // AND composition
    return (entity: T) => predicates.every((pred) => pred(entity));
  });

  /** Check if a specific filter is active */
  const isActive = (filterId: string): boolean => {
    return activeFilterIds().has(filterId);
  };

  /** Get filter IDs from a group (handles both filterIds and filters properties) */
  const getGroupFilterIds = (group: FilterGroup): readonly string[] => {
    if (group.filterIds) return group.filterIds;
    if (group.filters) return group.filters.map((f) => f.id);
    return [];
  };

  /** Get active filters in a specific group */
  const getActiveInGroup = (groupId: string): readonly string[] => {
    const group = groups().get(groupId);
    if (!group) return [];
    return getGroupFilterIds(group).filter((id) => activeFilterIds().has(id));
  };

  return {
    filters,
    groups,
    activeFilterIds,
    setActiveFilterIds,
    filterFn,
    isActive,
    getActiveInGroup,
  };
}

// ============================================================================
// Filter Plugin Configuration
// ============================================================================

export type FilterPluginConfig<T> = {
  /** Initial filters to register */
  readonly filters?: readonly FilterConfig<T>[];
  /** Filter groups for mutual exclusivity */
  readonly groups?: readonly FilterGroup[];
  /** Initially active filter IDs */
  readonly initialActive?: readonly string[];
  /** Callback when filters change */
  readonly onFilterChange?: (activeIds: ReadonlySet<string>) => void;
};

// ============================================================================
// Filter Plugin Factory
// ============================================================================

/** Create a filter plugin with store */
export function createFilterPlugin<T extends EntityConstraint>(
  config: FilterPluginConfig<T> = {}
): PluginWithStore<T, FilterStore<T>> {
  const {
    filters: filterConfigs = [],
    groups: groupConfigs = [],
    initialActive = [],
    onFilterChange,
  } = config;

  // Build maps from arrays
  const filterMap = new Map<string, FilterConfig<T>>();
  for (const filter of filterConfigs) {
    filterMap.set(filter.id, filter);
  }

  const groupMap = new Map<string, FilterGroup>();
  for (const group of groupConfigs) {
    groupMap.set(group.id, group);
  }

  // Create store
  const store = createFilterStore<T>(
    filterMap,
    groupMap,
    new Set(initialActive)
  );

  // Plugin function
  const plugin: Plugin<T> = (controller: ListController<T>) => {
    const cleanups: CleanupFn[] = [];

    // Register toggle filter command
    const toggleReg = controller.commands.register<ToggleFilterPayload>(
      ListCommands.TOGGLE_FILTER,
      (payload) => {
        const { filterId } = payload;
        const filterConfig = filterMap.get(filterId);
        if (!filterConfig) return false;

        const currentActive = store.activeFilterIds();
        const newActive = new Set(currentActive);

        if (newActive.has(filterId)) {
          // Deactivate filter
          newActive.delete(filterId);
        } else {
          // Activate filter
          // Handle mutual exclusivity via groups
          if (filterConfig.group) {
            const group = groupMap.get(filterConfig.group);
            if (group && !group.allowMultiple) {
              // Remove other filters in same group
              // Support both filterIds and deprecated filters property
              const groupFilterIds =
                group.filterIds ?? group.filters?.map((f) => f.id) ?? [];
              for (const otherId of groupFilterIds) {
                if (otherId !== filterId) {
                  newActive.delete(otherId);
                }
              }
            }
          }
          newActive.add(filterId);
        }

        store.setActiveFilterIds(newActive);
        onFilterChange?.(newActive);
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(toggleReg.unregister);

    // Register clear filters command
    const clearReg = controller.commands.register(
      ListCommands.CLEAR_FILTERS,
      () => {
        const empty = new Set<string>();
        store.setActiveFilterIds(empty);
        onFilterChange?.(empty);
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(clearReg.unregister);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

  // Attach store to plugin
  return Object.assign(plugin, { store });
}

// ============================================================================
// Filter Utilities
// ============================================================================

/** Compose multiple predicates with AND logic */
export function composeFilters<T>(
  ...predicates: FilterPredicate<T>[]
): FilterPredicate<T> {
  if (predicates.length === 0) return () => true;
  return (entity: T) => predicates.every((pred) => pred(entity));
}

/** Compose multiple predicates with OR logic */
export function composeFiltersOr<T>(
  ...predicates: FilterPredicate<T>[]
): FilterPredicate<T> {
  if (predicates.length === 0) return () => true;
  return (entity: T) => predicates.some((pred) => pred(entity));
}

/** Negate a predicate */
export function negateFilter<T>(
  predicate: FilterPredicate<T>
): FilterPredicate<T> {
  return (entity: T) => !predicate(entity);
}

/** Create a type-matching predicate */
export function createTypeFilter<T extends { type: string }>(
  types: readonly string[]
): FilterPredicate<T> {
  const typeSet = new Set(types);
  return (entity: T) => typeSet.has(entity.type);
}

/** Create a property equality predicate */
export function createPropertyFilter<T, K extends keyof T>(
  property: K,
  value: T[K]
): FilterPredicate<T> {
  return (entity: T) => entity[property] === value;
}

/** Create a truthy property predicate */
export function createTruthyFilter<T, K extends keyof T>(
  property: K
): FilterPredicate<T> {
  return (entity: T) => Boolean(entity[property]);
}

// ============================================================================
// Pre-built Filter Config Factories
// ============================================================================

/** Create entity type filter config */
export function entityTypeFilter<T extends { type: string }>(
  id: string,
  label: string,
  types: readonly string[],
  group?: string
): FilterConfig<T> {
  return {
    id,
    label,
    predicate: createTypeFilter(types),
    group,
  };
}

/** Create filter group */
export function createFilterGroup(
  id: string,
  label: string,
  filterIds: readonly string[],
  allowMultiple = false
): FilterGroup {
  return { id, label, filterIds, allowMultiple };
}
