/**
 * Builder pattern for creating unified lists.
 *
 * Makes it easy to configure common setups without manual plugin wiring.
 *
 * @example
 * ```tsx
 * const { plugins, rowConfig } = createUnifiedList<MyEntity>()
 *   .withFilters({
 *     filters: [documentFilter, emailFilter],
 *     onFilterChange: (ids) => console.log(ids),
 *   })
 *   .withSorts({
 *     sorts: [updatedAtSort(), frecencySort()],
 *     defaultSort: 'updated_at',
 *   })
 *   .withNavigation()
 *   .withSelection({ mode: 'multi' })
 *   .withHotkeys({ scope: 'my-list' })
 *   .withActions({
 *     actions: [markDoneAction],
 *   })
 *   .build();
 *
 * <UnifiedListView
 *   entities={entities}
 *   plugins={plugins}
 *   renderRow={(entity, state) => <EntityRow entity={entity} {...state} config={rowConfig} />}
 * />
 * ```
 */

import type {
  EntityConstraint,
  Plugin,
  FilterConfig,
  FilterGroup,
  SortConfig,
  SelectionMode,
} from './core/types';
import type { EntityAction } from './types';
import { createFilterPlugin, type FilterStore } from './plugins/filterPlugin';
import { createSortPlugin, type SortStore } from './plugins/sortPlugin';
import { createNavigationPlugin } from './plugins/navigationPlugin';
import {
  createSelectionPlugin,
  type SelectionStore,
} from './plugins/selectionPlugin';
import { createHotkeyPlugin } from './plugins/hotkeyPlugin';
import { createSearchPlugin, type SearchStore } from './plugins/searchPlugin';
import { createActionPlugin } from './plugins/actionPlugin';
import { createGroupByPlugin } from './plugins/groupByPlugin';
import type {
  GroupId,
  GroupKeyFn,
  GroupRegistry,
  GroupStore,
} from './types/groupBy';

// ============================================================================
// Types
// ============================================================================

/** Configuration options for unified list */
export type UnifiedListConfig<T extends EntityConstraint> = {
  /** Filter configuration */
  filters?: {
    filters: FilterConfig<T>[];
    groups?: FilterGroup[];
    initialActive?: Set<string>;
    onFilterChange?: (activeIds: Set<string>) => void;
  };

  /** Sort configuration */
  sorts?: {
    sorts: SortConfig<T>[];
    defaultSort?: string;
    defaultOrder?: 'ascending' | 'descending';
    onSortChange?: (sortId: string, order: 'ascending' | 'descending') => void;
  };

  /** Navigation configuration */
  navigation?: {
    autoScroll?: boolean;
    autoSelectFirst?: boolean;
    pageSize?: number;
    onNavigate?: (entityId: string | null) => void;
  };

  /** Selection configuration */
  selection?: {
    mode?: SelectionMode;
    onSelectionChange?: (selectedIds: Set<string>) => void;
  };

  /** Hotkey configuration */
  hotkeys?: {
    scope?: string;
  };

  /** Search configuration */
  search?: {
    /** Simple boolean local filter */
    localFilter?: (entity: T, text: string) => boolean;
    /**
     * Enable name fuzzy search that enhances entities with search.nameHighlight.
     * Uses fuzzyMatch from @core/util/fuzzy for proper highlighting.
     * When enabled, stores.search.enhancingSearchFilter will be available.
     */
    useNameFuzzySearch?: boolean;
    /** Callback for remote search */
    onRemoteSearch?: (text: string) => Promise<void>;
    /** Local debounce time (default 20ms) */
    localDebounceMs?: number;
    /** Server debounce time (default 300ms) */
    serverDebounceMs?: number;
  };

  /** Action configuration */
  actions?: {
    actions: EntityAction<T>[];
    onOpenEntity?: (
      entity: T,
      options?: { preview?: boolean; newSplit?: boolean }
    ) => void;
  };

  /** GroupBy configuration */
  groupBy?: {
    /** Function to extract group key from entity */
    groupKeyFn: GroupKeyFn<T>;
    /** Registry mapping group IDs to their configuration */
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
};

/** Result of building a unified list */
export type UnifiedListBuildResult<T extends EntityConstraint> = {
  /** Plugins to pass to UnifiedListView */
  plugins: Plugin<T>[];

  /** Stores for accessing plugin state */
  stores: {
    filter?: FilterStore<T>;
    sort?: SortStore<T>;
    selection?: SelectionStore;
    search?: SearchStore<T>;
    groupBy?: GroupStore<T>;
  };
};

// ============================================================================
// Builder
// ============================================================================

export type UnifiedListBuilder<T extends EntityConstraint> = {
  /** Add filter support */
  withFilters: (
    config: UnifiedListConfig<T>['filters']
  ) => UnifiedListBuilder<T>;

  /** Add sort support */
  withSorts: (config: UnifiedListConfig<T>['sorts']) => UnifiedListBuilder<T>;

  /** Add keyboard navigation */
  withNavigation: (
    config?: UnifiedListConfig<T>['navigation']
  ) => UnifiedListBuilder<T>;

  /** Add selection support */
  withSelection: (
    config?: UnifiedListConfig<T>['selection']
  ) => UnifiedListBuilder<T>;

  /** Add hotkey support */
  withHotkeys: (
    config?: UnifiedListConfig<T>['hotkeys']
  ) => UnifiedListBuilder<T>;

  /** Add search support */
  withSearch: (
    config?: UnifiedListConfig<T>['search']
  ) => UnifiedListBuilder<T>;

  /** Add action support */
  withActions: (
    config: UnifiedListConfig<T>['actions']
  ) => UnifiedListBuilder<T>;

  /** Add group-by support */
  withGroupBy: (
    config: UnifiedListConfig<T>['groupBy']
  ) => UnifiedListBuilder<T>;

  /** Build the final configuration */
  build: () => UnifiedListBuildResult<T>;
};

/** Create a unified list builder */
export function createUnifiedList<
  T extends EntityConstraint,
>(): UnifiedListBuilder<T> {
  const config: UnifiedListConfig<T> = {};

  // Plugin instances and stores (created lazily during build)
  let filterStore: FilterStore<T> | undefined;
  let sortStore: SortStore<T> | undefined;
  let selectionStore: SelectionStore | undefined;
  let searchStore: SearchStore<T> | undefined;
  let groupByStore: GroupStore<T> | undefined;

  const builder: UnifiedListBuilder<T> = {
    withFilters(filterConfig) {
      config.filters = filterConfig;
      return builder;
    },

    withSorts(sortConfig) {
      config.sorts = sortConfig;
      return builder;
    },

    withNavigation(navConfig) {
      config.navigation = navConfig ?? {};
      return builder;
    },

    withSelection(selConfig) {
      config.selection = selConfig ?? {};
      return builder;
    },

    withHotkeys(hotkeyConfig) {
      config.hotkeys = hotkeyConfig ?? {};
      return builder;
    },

    withSearch(searchConfig) {
      config.search = searchConfig ?? {};
      return builder;
    },

    withActions(actionConfig) {
      config.actions = actionConfig;
      return builder;
    },

    withGroupBy(groupByConfig) {
      config.groupBy = groupByConfig;
      return builder;
    },

    build() {
      const plugins: Plugin<T>[] = [];

      // Filter plugin
      if (config.filters) {
        const filterPlugin = createFilterPlugin<T>({
          filters: config.filters.filters,
          groups: config.filters.groups,
          onFilterChange: config.filters.onFilterChange,
        });
        plugins.push(filterPlugin);
        filterStore = filterPlugin.store;

        // Set initial filters if provided
        if (config.filters.initialActive) {
          filterStore.setActiveFilterIds(config.filters.initialActive);
        }
      }

      // Sort plugin
      if (config.sorts) {
        const sortPlugin = createSortPlugin<T>({
          sorts: config.sorts.sorts,
          defaultSortId: config.sorts.defaultSort,
          defaultOrder: config.sorts.defaultOrder,
          onSortChange: config.sorts.onSortChange,
        });
        plugins.push(sortPlugin);
        sortStore = sortPlugin.store;
      }

      // Navigation plugin
      if (config.navigation) {
        plugins.push(
          createNavigationPlugin<T>({
            autoScroll: config.navigation.autoScroll ?? true,
            autoSelectFirst: config.navigation.autoSelectFirst ?? true,
            pageSize: config.navigation.pageSize,
            onNavigate: config.navigation.onNavigate,
          })
        );
      }

      // Selection plugin
      if (config.selection) {
        const selPlugin = createSelectionPlugin<T>({
          mode: config.selection.mode ?? 'multi',
          onSelectionChange: config.selection.onSelectionChange,
        });
        plugins.push(selPlugin);
        selectionStore = selPlugin.store;
      }

      // Hotkey plugin
      if (config.hotkeys) {
        plugins.push(
          createHotkeyPlugin<T>({
            scopeId: config.hotkeys.scope,
          })
        );
      }

      // Search plugin
      if (config.search) {
        const searchPlugin = createSearchPlugin<T>({
          localFilter: config.search.localFilter,
          useNameFuzzySearch: config.search.useNameFuzzySearch,
          onRemoteSearch: config.search.onRemoteSearch,
          localDebounceMs: config.search.localDebounceMs,
          serverDebounceMs: config.search.serverDebounceMs,
        });
        plugins.push(searchPlugin);
        searchStore = searchPlugin.store;
      }

      // Action plugin
      if (config.actions) {
        plugins.push(
          createActionPlugin<T>({
            actions: config.actions.actions,
            onOpenEntity: config.actions.onOpenEntity,
          })
        );
      }

      // GroupBy plugin
      if (config.groupBy) {
        const groupByPlugin = createGroupByPlugin<T>({
          groupKeyFn: config.groupBy.groupKeyFn,
          groupRegistry: config.groupBy.groupRegistry,
          initialCollapsed: config.groupBy.initialCollapsed,
          initialEnabled: config.groupBy.initialEnabled,
          onCollapseChange: config.groupBy.onCollapseChange,
          onEnabledChange: config.groupBy.onEnabledChange,
        });
        plugins.push(groupByPlugin);
        groupByStore = groupByPlugin.store;
      }

      return {
        plugins,
        stores: {
          filter: filterStore,
          sort: sortStore,
          selection: selectionStore,
          search: searchStore,
          groupBy: groupByStore,
        },
      };
    },
  };

  return builder;
}

