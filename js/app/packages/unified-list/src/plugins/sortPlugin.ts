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
  Plugin,
  CleanupFn,
  ListController,
  SortConfig,
  SortState,
} from '../types';

// ============================================================================
// Sort State Management
// ============================================================================

export type SortStore<T> = {
  /** Available sort options */
  sorts: Accessor<Map<string, SortConfig<T>>>;
  /** Currently active sort ID */
  activeSortId: Accessor<string | null>;
  /** Sort direction */
  sortOrder: Accessor<'ascending' | 'descending'>;
  /** Setters */
  setActiveSortId: Setter<string | null>;
  setSortOrder: Setter<'ascending' | 'descending'>;
  /** Computed sort function */
  sortFn: Accessor<((a: T, b: T) => number) | null>;
};

/** Create reactive sort state */
export function createSortStore<T>(
  initialSorts: SortConfig<T>[] = [],
  defaultSortId: string | null = null,
  defaultOrder: 'ascending' | 'descending' = 'descending'
): SortStore<T> {
  const sortMap = new Map<string, SortConfig<T>>();
  initialSorts.forEach((sort) => sortMap.set(sort.id, sort));

  const [sorts] = createSignal<Map<string, SortConfig<T>>>(sortMap);
  const [activeSortId, setActiveSortId] = createSignal<string | null>(
    defaultSortId
  );
  const [sortOrder, setSortOrder] = createSignal<'ascending' | 'descending'>(
    defaultOrder
  );

  /** Get the active sort comparator */
  const sortFn = createMemo<((a: T, b: T) => number) | null>(() => {
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

  return {
    sorts,
    activeSortId,
    sortOrder,
    setActiveSortId,
    setSortOrder,
    sortFn,
  };
}

// ============================================================================
// Sort Plugin Configuration
// ============================================================================

export type SortPluginConfig<T> = {
  /** Available sort options */
  sorts: SortConfig<T>[];
  /** Default sort ID */
  defaultSortId?: string;
  /** Default sort order */
  defaultOrder?: 'ascending' | 'descending';
  /** Callback when sort changes */
  onSortChange?: (
    sortId: string | null,
    order: 'ascending' | 'descending'
  ) => void;
};

// ============================================================================
// Sort Plugin Factory
// ============================================================================

/** Create a sort plugin */
export function createSortPlugin<T extends { id: string }>(
  config: SortPluginConfig<T>
): Plugin<T, ListController<T>> & { store: SortStore<T> } {
  const store = createSortStore<T>(
    config.sorts,
    config.defaultSortId ?? null,
    config.defaultOrder ?? 'descending'
  );

  const plugin: Plugin<T, ListController<T>> = (
    controller: ListController<T>
  ) => {
    // No commands needed for sort - state is controlled via store
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

/** Create a comparator for a date/timestamp property */
export function createDateSort<T, K extends keyof T>(
  property: K
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const aVal = a[property] as unknown as number | undefined;
    const bVal = b[property] as unknown as number | undefined;
    return (aVal ?? 0) - (bVal ?? 0);
  };
}

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
