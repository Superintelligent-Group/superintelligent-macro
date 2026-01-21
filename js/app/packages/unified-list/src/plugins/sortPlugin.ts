/**
 * Sort Plugin - composable sorting system.
 *
 * Design:
 * - Sorts are pure comparator functions
 * - Supports ascending/descending order
 * - Stable sort for consistent results
 * - Easy to extend with new sort options
 */

import { createSignal, createMemo, type Accessor, type Setter } from 'solid-js';
import type {
  EntityConstraint,
  Plugin,
  ListController,
  SortConfig,
  Comparator,
  SortOrder,
  PluginWithStore,
} from '../core/types';

// ============================================================================
// Sort State Management
// ============================================================================

export type SortStore<T> = {
  /** Available sort options */
  readonly sorts: Accessor<ReadonlyMap<string, SortConfig<T>>>;
  /** Currently active sort ID */
  readonly activeSortId: Accessor<string | null>;
  /** Sort direction */
  readonly sortOrder: Accessor<SortOrder>;
  /** Setters */
  readonly setActiveSortId: Setter<string | null>;
  readonly setSortOrder: Setter<SortOrder>;
  /** Computed sort function */
  readonly sortFn: Accessor<Comparator<T> | null>;
  /** Toggle order */
  readonly toggleOrder: () => void;
};

/** Create reactive sort state */
export function createSortStore<T>(
  initialSorts: readonly SortConfig<T>[] = [],
  defaultSortId: string | null = null,
  defaultOrder: SortOrder = 'descending'
): SortStore<T> {
  const sortMap = new Map<string, SortConfig<T>>();
  for (const sort of initialSorts) {
    sortMap.set(sort.id, sort);
  }

  const [sorts] = createSignal<ReadonlyMap<string, SortConfig<T>>>(sortMap);
  const [activeSortId, setActiveSortId] = createSignal<string | null>(
    defaultSortId
  );
  const [sortOrder, setSortOrder] = createSignal<SortOrder>(defaultOrder);

  /** Get the active sort comparator */
  const sortFn = createMemo<Comparator<T> | null>(() => {
    const sortId = activeSortId();
    if (!sortId) return null;

    const sortConfig = sorts().get(sortId);
    if (!sortConfig) return null;

    const order = sortOrder();
    const baseComparator = sortConfig.comparator;

    // Flip for descending order
    if (order === 'descending') {
      return (a: T, b: T) => -baseComparator(a, b);
    }

    return baseComparator;
  });

  /** Toggle sort order */
  const toggleOrder = () => {
    setSortOrder((prev) => (prev === 'ascending' ? 'descending' : 'ascending'));
  };

  return {
    sorts,
    activeSortId,
    sortOrder,
    setActiveSortId,
    setSortOrder,
    sortFn,
    toggleOrder,
  };
}

// ============================================================================
// Sort Plugin Configuration
// ============================================================================

export type SortPluginConfig<T> = {
  /** Available sort options */
  readonly sorts?: readonly SortConfig<T>[];
  /** Default sort ID */
  readonly defaultSortId?: string;
  /** Default sort order */
  readonly defaultOrder?: SortOrder;
  /** Callback when sort changes */
  readonly onSortChange?: (sortId: string | null, order: SortOrder) => void;
};

// ============================================================================
// Sort Plugin Factory
// ============================================================================

/** Create a sort plugin */
export function createSortPlugin<T extends EntityConstraint>(
  config: SortPluginConfig<T> = {}
): PluginWithStore<T, SortStore<T>> {
  const store = createSortStore<T>(
    config.sorts ?? [],
    config.defaultSortId ?? null,
    config.defaultOrder ?? 'descending'
  );

  const plugin: Plugin<T> = (_controller: ListController<T>) => {
    // Sort plugin is passive - state is controlled via store
    return () => {};
  };

  return Object.assign(plugin, { store });
}

// ============================================================================
// Sort Utilities
// ============================================================================

/** Create a comparator for a numeric property */
export function createNumericSort<T, K extends keyof T>(
  property: K
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const aVal = a[property] as unknown as number;
    const bVal = b[property] as unknown as number;
    return (aVal ?? 0) - (bVal ?? 0);
  };
}

/** Create a comparator for a string property */
export function createStringSort<T, K extends keyof T>(
  property: K
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const aVal = String(a[property] ?? '');
    const bVal = String(b[property] ?? '');
    return aVal.localeCompare(bVal);
  };
}

/** Create a comparator for a date/timestamp property (alias for createNumericSort) */
export const createDateSort = createNumericSort;

/** Compose multiple sort comparators (first match wins, then fallback) */
export function composeComparators<T>(
  ...comparators: ((a: T, b: T) => number)[]
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

/** Stable sort implementation */
export function stableSort<T>(
  items: T[],
  comparator: (a: T, b: T) => number
): T[] {
  // Create array with original indices
  const indexed = items.map((item, index) => ({ item, index }));

  // Sort with fallback to original index
  indexed.sort((a, b) => {
    const result = comparator(a.item, b.item);
    if (result !== 0) return result;
    return a.index - b.index;
  });

  return indexed.map(({ item }) => item);
}

// ============================================================================
// Pre-built Sort Configs
// ============================================================================

/** Sort config for updated_at timestamp */
export function updatedAtSort<
  T extends { updatedAt?: number },
>(): SortConfig<T> {
  return {
    id: 'updated_at',
    label: 'Last Updated',
    comparator: createDateSort<T, 'updatedAt'>('updatedAt'),
  };
}

/** Sort config for created_at timestamp */
export function createdAtSort<
  T extends { createdAt?: number },
>(): SortConfig<T> {
  return {
    id: 'created_at',
    label: 'Created',
    comparator: createDateSort<T, 'createdAt'>('createdAt'),
  };
}

/** Sort config for viewed_at timestamp */
export function viewedAtSort<T extends { viewedAt?: number }>(): SortConfig<T> {
  return {
    id: 'viewed_at',
    label: 'Last Viewed',
    comparator: createDateSort<T, 'viewedAt'>('viewedAt'),
  };
}

/** Sort config for name (alphabetical) */
export function nameSort<T extends { name: string }>(): SortConfig<T> {
  return {
    id: 'name',
    label: 'Name',
    comparator: createStringSort<T, 'name'>('name'),
  };
}

/** Sort config for frecency score */
export function frecencySort<
  T extends { frecencyScore?: number },
>(): SortConfig<T> {
  return {
    id: 'frecency',
    label: 'Frecency',
    comparator: createNumericSort<T, 'frecencyScore'>('frecencyScore'),
  };
}
