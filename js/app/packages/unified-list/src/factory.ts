/**
 * Unified List Factory - main entry point for creating unified lists.
 *
 * Provides a fluent builder API for assembling lists with plugins.
 */

import type {
  EntityConstraint,
  ListController,
  CleanupFn,
  Plugin,
} from './core/types';
import {
  createListController,
  type CreateControllerOptions,
} from './core/controller';
import { createPluginManager, type PluginManager } from './core/pluginManager';
import {
  createFilterPlugin,
  type FilterPluginConfig,
  type FilterStore,
} from './plugins/filterPlugin';
import {
  createSortPlugin,
  type SortPluginConfig,
  type SortStore,
} from './plugins/sortPlugin';
import {
  createNavigationPlugin,
  type NavigationPluginConfig,
} from './plugins/navigationPlugin';
import {
  createSelectionPlugin,
  type SelectionPluginConfig,
  type SelectionStore,
} from './plugins/selectionPlugin';
import {
  createHotkeyPlugin,
  type HotkeyPluginConfig,
} from './plugins/hotkeyPlugin';
import {
  createSearchPlugin,
  type SearchPluginConfig,
  type SearchStore,
} from './plugins/searchPlugin';
import {
  createActionPlugin,
  type ActionPluginConfig,
  type ActionRegistry,
} from './plugins/actionPlugin';

// ============================================================================
// Factory Types
// ============================================================================

export type UnifiedListInstance<T extends EntityConstraint> = {
  /** The list controller */
  controller: ListController<T>;
  /** Plugin manager for additional plugins */
  plugins: PluginManager<T>;
  /** Filter store (if filter plugin enabled) */
  filterStore?: FilterStore<T>;
  /** Sort store (if sort plugin enabled) */
  sortStore?: SortStore<T>;
  /** Selection store (if selection plugin enabled) */
  selectionStore?: SelectionStore;
  /** Search store (if search plugin enabled) */
  searchStore?: SearchStore;
  /** Action registry (if action plugin enabled) */
  actionRegistry?: ActionRegistry<T>;
  /** Cleanup function */
  cleanup: CleanupFn;
};

export type UnifiedListFactoryConfig<T extends EntityConstraint> = {
  /** Controller options */
  controller: CreateControllerOptions<T>;
  /** Filter plugin config */
  filter?: FilterPluginConfig<T>;
  /** Sort plugin config */
  sort?: SortPluginConfig<T>;
  /** Navigation plugin config */
  navigation?: NavigationPluginConfig;
  /** Selection plugin config */
  selection?: SelectionPluginConfig;
  /** Hotkey plugin config */
  hotkeys?: HotkeyPluginConfig;
  /** Search plugin config */
  search?: SearchPluginConfig<T>;
  /** Action plugin config */
  actions?: ActionPluginConfig<T>;
  /** Additional plugins */
  plugins?: Plugin<T>[];
};

// ============================================================================
// Factory Function
// ============================================================================

/** Create a unified list instance with all configured plugins */
export function createUnifiedList<T extends EntityConstraint>(
  config: UnifiedListFactoryConfig<T>
): UnifiedListInstance<T> {
  // Create controller
  const { controller, cleanup: controllerCleanup } = createListController<T>(
    config.controller
  );

  // Create plugin manager
  const plugins = createPluginManager(controller);

  // Track stores
  let filterStore: FilterStore<T> | undefined;
  let sortStore: SortStore<T> | undefined;
  let selectionStore: SelectionStore | undefined;
  let searchStore: SearchStore | undefined;
  let actionRegistry: ActionRegistry<T> | undefined;

  // Register filter plugin
  if (config.filter) {
    const filterPlugin = createFilterPlugin<T>(config.filter);
    filterStore = filterPlugin.store;
    plugins.use(filterPlugin);
  }

  // Register sort plugin
  if (config.sort) {
    const sortPlugin = createSortPlugin<T>(config.sort);
    sortStore = sortPlugin.store;
    plugins.use(sortPlugin);
  }

  // Register navigation plugin
  if (config.navigation !== undefined || config.navigation === undefined) {
    // Navigation is enabled by default
    plugins.use(createNavigationPlugin(config.navigation ?? {}));
  }

  // Register selection plugin
  if (config.selection !== undefined || config.selection === undefined) {
    // Selection is enabled by default
    const selectionPlugin = createSelectionPlugin<T>(config.selection ?? {});
    selectionStore = selectionPlugin.store;
    plugins.use(selectionPlugin);
  }

  // Register hotkey plugin
  if (config.hotkeys !== undefined || config.hotkeys === undefined) {
    // Hotkeys are enabled by default
    plugins.use(createHotkeyPlugin(config.hotkeys ?? {}));
  }

  // Register search plugin
  if (config.search) {
    const searchPlugin = createSearchPlugin<T>(config.search);
    searchStore = searchPlugin.store;
    plugins.use(searchPlugin);
  }

  // Register action plugin
  if (config.actions) {
    const actionPlugin = createActionPlugin<T>(config.actions);
    actionRegistry = actionPlugin.store;
    plugins.use(actionPlugin);
  }

  // Register additional plugins
  if (config.plugins) {
    plugins.useAll(config.plugins);
  }

  // Cleanup function
  const cleanup = () => {
    plugins.cleanup();
    controllerCleanup();
  };

  return {
    controller,
    plugins,
    filterStore,
    sortStore,
    selectionStore,
    searchStore,
    actionRegistry,
    cleanup,
  };
}

// ============================================================================
// Builder Pattern Alternative
// ============================================================================

export type UnifiedListBuilder<T extends EntityConstraint> = {
  /** Configure controller */
  withController: (
    options: CreateControllerOptions<T>
  ) => UnifiedListBuilder<T>;
  /** Add filter plugin */
  withFilters: (config: FilterPluginConfig<T>) => UnifiedListBuilder<T>;
  /** Add sort plugin */
  withSorts: (config: SortPluginConfig<T>) => UnifiedListBuilder<T>;
  /** Add navigation plugin */
  withNavigation: (config?: NavigationPluginConfig) => UnifiedListBuilder<T>;
  /** Add selection plugin */
  withSelection: (config?: SelectionPluginConfig) => UnifiedListBuilder<T>;
  /** Add hotkey plugin */
  withHotkeys: (config?: HotkeyPluginConfig) => UnifiedListBuilder<T>;
  /** Add search plugin */
  withSearch: (config: SearchPluginConfig<T>) => UnifiedListBuilder<T>;
  /** Add action plugin */
  withActions: (config: ActionPluginConfig<T>) => UnifiedListBuilder<T>;
  /** Add custom plugin */
  withPlugin: (plugin: Plugin<T>) => UnifiedListBuilder<T>;
  /** Build the list instance */
  build: () => UnifiedListInstance<T>;
};

/** Create a unified list builder */
export function createUnifiedListBuilder<T extends EntityConstraint>(
  controllerId: string
): UnifiedListBuilder<T> {
  const config: UnifiedListFactoryConfig<T> = {
    controller: { id: controllerId },
  };
  const additionalPlugins: Plugin<T>[] = [];

  const builder: UnifiedListBuilder<T> = {
    withController(options) {
      config.controller = options;
      return builder;
    },

    withFilters(filterConfig) {
      config.filter = filterConfig;
      return builder;
    },

    withSorts(sortConfig) {
      config.sort = sortConfig;
      return builder;
    },

    withNavigation(navConfig) {
      config.navigation = navConfig ?? {};
      return builder;
    },

    withSelection(selectionConfig) {
      config.selection = selectionConfig ?? {};
      return builder;
    },

    withHotkeys(hotkeyConfig) {
      config.hotkeys = hotkeyConfig ?? {};
      return builder;
    },

    withSearch(searchConfig) {
      config.search = searchConfig;
      return builder;
    },

    withActions(actionConfig) {
      config.actions = actionConfig;
      return builder;
    },

    withPlugin(plugin) {
      additionalPlugins.push(plugin);
      return builder;
    },

    build() {
      config.plugins = additionalPlugins;
      return createUnifiedList(config);
    },
  };

  return builder;
}
