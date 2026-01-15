/**
 * Data Pipeline Plugin - connects queries to the list.
 *
 * Design:
 * - Merges multiple query sources
 * - Applies filters, sorts, deduplication
 * - Handles loading states
 * - Supports infinite queries
 */

import { createMemo, createEffect, type Accessor } from 'solid-js';
import type { Plugin, CleanupFn, ListController } from '../types';
import type { FilterStore } from './filterPlugin';
import type { SortStore } from './sortPlugin';
import type { SearchStore } from './searchPlugin';

// ============================================================================
// Data Pipeline Types
// ============================================================================

/** Query source configuration */
export type QuerySource<T> = {
  /** Accessor for query data */
  data: Accessor<T[] | undefined>;
  /** Accessor for loading state */
  isLoading: Accessor<boolean>;
  /** Accessor for has more pages */
  hasMore?: Accessor<boolean>;
  /** Function to fetch next page */
  fetchNextPage?: () => Promise<void>;
  /** Whether to apply filters to this source */
  applyFilter?: boolean;
  /** Whether to apply search to this source */
  applySearch?: boolean;
};

/** Data pipeline stage */
export type PipelineStage<T> = (entities: T[]) => T[];

// ============================================================================
// Data Pipeline Plugin Configuration
// ============================================================================

export type DataPipelinePluginConfig<T extends { id: string }> = {
  /** Query sources */
  sources: QuerySource<T>[];
  /** Filter store for filtering */
  filterStore?: FilterStore<T>;
  /** Sort store for sorting */
  sortStore?: SortStore<T>;
  /** Search store for search filtering */
  searchStore?: SearchStore;
  /** Additional local filter */
  localFilter?: Accessor<(entity: T) => boolean>;
  /** Local search filter */
  searchFilter?: Accessor<(entity: T, searchText: string) => boolean>;
  /** Entity enhancer (e.g., add notifications) */
  enhancer?: (entity: T) => T;
  /** Deduplication key */
  dedupeKey?: (entity: T) => string;
  /** Callback when entities change */
  onEntitiesChange?: (entities: T[]) => void;
};

// ============================================================================
// Data Pipeline Plugin Factory
// ============================================================================

/** Create a data pipeline plugin */
export function createDataPipelinePlugin<T extends { id: string }>(
  config: DataPipelinePluginConfig<T>
): Plugin<T, ListController<T>> {
  const {
    sources,
    filterStore,
    sortStore,
    searchStore,
    localFilter,
    searchFilter,
    enhancer,
    dedupeKey = (e: T) => e.id,
    onEntitiesChange,
  } = config;

  return (controller: ListController<T>): CleanupFn => {
    // Merge all query sources
    const mergedData = createMemo<T[]>(() => {
      const allEntities: T[] = [];
      const seenIds = new Set<string>();

      for (const source of sources) {
        const data = source.data();
        if (!data) continue;

        for (const entity of data) {
          const key = dedupeKey(entity);
          if (!seenIds.has(key)) {
            seenIds.add(key);
            allEntities.push(enhancer ? enhancer(entity) : entity);
          }
        }
      }

      return allEntities;
    });

    // Apply filters
    const filteredData = createMemo<T[]>(() => {
      let entities = mergedData();

      // Apply filter store filters
      if (filterStore) {
        const filterFn = filterStore.filterFn();
        entities = entities.filter(filterFn);
      }

      // Apply local filter
      if (localFilter) {
        const localFilterFn = localFilter();
        entities = entities.filter(localFilterFn);
      }

      // Apply search filter
      if (searchStore && searchFilter) {
        const searchText = searchStore.searchText();
        if (searchText) {
          const searchFilterFn = searchFilter();
          entities = entities.filter((e) => searchFilterFn(e, searchText));
        }
      }

      return entities;
    });

    // Apply sorting
    const sortedData = createMemo<T[]>(() => {
      const entities = [...filteredData()];

      if (sortStore) {
        const sortFn = sortStore.sortFn();
        if (sortFn) {
          entities.sort(sortFn);
        }
      }

      return entities;
    });

    // Compute loading state
    const isLoading = createMemo(() => {
      return sources.some((source) => source.isLoading());
    });

    // Compute has more
    const hasMore = createMemo(() => {
      return sources.some((source) => source.hasMore?.() ?? false);
    });

    // Update controller state when data changes
    createEffect(() => {
      const entities = sortedData();
      controller.setters.setEntities(() => entities);
      onEntitiesChange?.(entities);
    });

    createEffect(() => {
      controller.setters.setIsLoading(isLoading());
    });

    createEffect(() => {
      controller.setters.setHasMore(hasMore());
    });

    // Set up fetch more handler
    const originalFetchMore = controller.fetchMore;
    (controller as { fetchMore: () => Promise<void> }).fetchMore =
      async (): Promise<void> => {
        // Fetch from all sources that have more
        const fetchPromises = sources
          .filter((source) => source.hasMore?.() && source.fetchNextPage)
          .map((source) => source.fetchNextPage!());

        await Promise.all(fetchPromises);
      };

    return () => {
      // Restore original fetch more
      (controller as { fetchMore: () => Promise<void> }).fetchMore =
        originalFetchMore;
    };
  };
}

// ============================================================================
// Data Pipeline Utilities
// ============================================================================

/** Create a pipeline stage that filters entities */
export function createFilterStage<T>(
  predicate: (entity: T) => boolean
): PipelineStage<T> {
  return (entities: T[]) => entities.filter(predicate);
}

/** Create a pipeline stage that sorts entities */
export function createSortStage<T>(
  comparator: (a: T, b: T) => number
): PipelineStage<T> {
  return (entities: T[]) => [...entities].sort(comparator);
}

/** Create a pipeline stage that deduplicates entities */
export function createDedupeStage<T>(
  getKey: (entity: T) => string
): PipelineStage<T> {
  return (entities: T[]) => {
    const seen = new Set<string>();
    return entities.filter((entity) => {
      const key = getKey(entity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
}

/** Create a pipeline stage that enhances entities */
export function createEnhanceStage<T, U extends T>(
  enhancer: (entity: T) => U
): (entities: T[]) => U[] {
  return (entities: T[]) => entities.map(enhancer);
}

/** Compose multiple pipeline stages */
export function composePipeline<T>(
  ...stages: PipelineStage<T>[]
): PipelineStage<T> {
  return (entities: T[]) => {
    let result = entities;
    for (const stage of stages) {
      result = stage(result);
    }
    return result;
  };
}
