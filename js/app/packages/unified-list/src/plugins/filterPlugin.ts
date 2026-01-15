/**
 * Filter Plugin - composable filtering system.
 *
 * Design:
 * - Filters are pure predicate functions
 * - Filter groups handle mutual exclusivity
 * - Filters can be combined with AND/OR logic
 * - State changes trigger automatic re-filtering
 */

import { createSignal, createMemo, type Accessor, type Setter } from 'solid-js';
import type {
  Plugin,
  CleanupFn,
  ListController,
  FilterConfig,
  FilterGroup,
  FilterState,
} from '../types';
import { CommandPriority } from '../types';
import { ListCommands, type ToggleFilterPayload } from '../core/commands';

// ============================================================================
// Filter State Management
// ============================================================================

export type FilterStore<T> = {
  /** All registered filters */
  filters: Accessor<Map<string, FilterConfig<T>>>;
  /** All registered filter groups */
  groups: Accessor<Map<string, FilterGroup<T>>>;
  /** Currently active filter IDs */
  activeFilterIds: Accessor<Set<string>>;
  /** Setters */
  setActiveFilterIds: Setter<Set<string>>;
  /** Computed filter function */
  filterFn: Accessor<(entity: T) => boolean>;
};

/** Create reactive filter state */
export function createFilterStore<T>(
  initialFilters?: Map<string, FilterConfig<T>>,
  initialGroups?: Map<string, FilterGroup<T>>
): FilterStore<T> {
  const [filters, setFilters] = createSignal<Map<string, FilterConfig<T>>>(
    initialFilters ?? new Map()
  );
  const [groups, setGroups] = createSignal<Map<string, FilterGroup<T>>>(
    initialGroups ?? new Map()
  );
  const [activeFilterIds, setActiveFilterIds] = createSignal<Set<string>>(
    new Set()
  );

  /** Compose active filters into a single predicate */
  const filterFn = createMemo<(entity: T) => boolean>(() => {
    const active = activeFilterIds();
    const filterMap = filters();

    if (active.size === 0) {
      return () => true;
    }

    // Get predicates for all active filters
    const predicates: ((entity: T) => boolean)[] = [];
    for (const filterId of active) {
      const filter = filterMap.get(filterId);
      if (filter) {
        predicates.push(filter.predicate);
      }
    }

    if (predicates.length === 0) {
      return () => true;
    }

    // Combine with AND logic
    return (entity: T) => predicates.every((pred) => pred(entity));
  });

  return {
    filters,
    groups,
    activeFilterIds,
    setActiveFilterIds,
    filterFn,
  };
}

// ============================================================================
// Filter Plugin Configuration
// ============================================================================

export type FilterPluginConfig<T> = {
  /** Initial filters to register */
  filters?: FilterConfig<T>[];
  /** Filter groups for mutual exclusivity */
  groups?: FilterGroup<T>[];
  /** Callback when filters change */
  onFilterChange?: (activeIds: Set<string>) => void;
};

// ============================================================================
// Filter Plugin Factory
// ============================================================================

/** Create a filter plugin */
export function createFilterPlugin<T extends { id: string }>(
  config: FilterPluginConfig<T> = {}
): Plugin<T, ListController<T>> & { store: FilterStore<T> } {
  const { filters: initialFilters = [], groups: initialGroups = [] } = config;

  // Initialize filter and group maps
  const filterMap = new Map<string, FilterConfig<T>>();
  initialFilters.forEach((filter) => {
    filterMap.set(filter.id, filter);
  });

  const groupMap = new Map<string, FilterGroup<T>>();
  initialGroups.forEach((group) => {
    groupMap.set(group.id, group);
  });

  // Create store with initialized filters
  const store = createFilterStore<T>(filterMap, groupMap);

  const plugin: Plugin<T, ListController<T>> = (
    controller: ListController<T>
  ) => {
    const cleanups: CleanupFn[] = [];

    // Register toggle filter command
    cleanups.push(
      controller.commands.register<ToggleFilterPayload>(
        ListCommands.TOGGLE_FILTER,
        (payload) => {
          const { filterId } = payload;
          const currentActive = store.activeFilterIds();
          const filterConfig = filterMap.get(filterId);

          if (!filterConfig) return false;

          const newActive = new Set(currentActive);

          if (newActive.has(filterId)) {
            // Deactivate filter
            newActive.delete(filterId);
          } else {
            // Activate filter - check for mutual exclusivity
            if (filterConfig.group) {
              const group = groupMap.get(filterConfig.group);
              if (group && !group.allowMultiple) {
                // Remove other filters in the same group
                group.filters.forEach((f) => {
                  newActive.delete(f.id);
                });
              }
            }
            newActive.add(filterId);
          }

          store.setActiveFilterIds(newActive);
          config.onFilterChange?.(newActive);
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    // Register clear filters command
    cleanups.push(
      controller.commands.register(
        ListCommands.CLEAR_FILTERS,
        () => {
          store.setActiveFilterIds(new Set<string>());
          config.onFilterChange?.(new Set<string>());
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  };

  // Attach store to plugin for external access
  return Object.assign(plugin, { store });
}

// ============================================================================
// Filter Utilities
// ============================================================================

/** Compose multiple filter predicates with AND logic */
export function composeFilters<T>(
  ...predicates: ((entity: T) => boolean)[]
): (entity: T) => boolean {
  if (predicates.length === 0) return () => true;
  return (entity: T) => predicates.every((pred) => pred(entity));
}

/** Compose multiple filter predicates with OR logic */
export function composeFiltersOr<T>(
  ...predicates: ((entity: T) => boolean)[]
): (entity: T) => boolean {
  if (predicates.length === 0) return () => true;
  return (entity: T) => predicates.some((pred) => pred(entity));
}

/** Negate a filter predicate */
export function negateFilter<T>(
  predicate: (entity: T) => boolean
): (entity: T) => boolean {
  return (entity: T) => !predicate(entity);
}

/** Create a filter that matches entity type */
export function createTypeFilter<T extends { type: string }>(
  types: string[]
): (entity: T) => boolean {
  const typeSet = new Set(types);
  return (entity: T) => typeSet.has(entity.type);
}

/** Create a filter that matches a property value */
export function createPropertyFilter<T, K extends keyof T>(
  property: K,
  value: T[K]
): (entity: T) => boolean {
  return (entity: T) => entity[property] === value;
}

/** Create a filter that checks if a property exists and is truthy */
export function createTruthyFilter<T, K extends keyof T>(
  property: K
): (entity: T) => boolean {
  return (entity: T) => Boolean(entity[property]);
}

// ============================================================================
// Pre-built Filter Configs
// ============================================================================

/** Create entity type filter config */
export function entityTypeFilter<T extends { type: string }>(
  id: string,
  label: string,
  types: string[],
  group?: string
): FilterConfig<T> {
  return {
    id,
    label,
    predicate: createTypeFilter(types),
    active: false,
    group,
  };
}

/** Create filter group config */
export function createFilterGroup<T>(
  id: string,
  label: string,
  filters: FilterConfig<T>[],
  allowMultiple = false
): FilterGroup<T> {
  // Set group on each filter
  filters.forEach((f) => {
    f.group = id;
  });

  return {
    id,
    label,
    filters,
    allowMultiple,
  };
}
