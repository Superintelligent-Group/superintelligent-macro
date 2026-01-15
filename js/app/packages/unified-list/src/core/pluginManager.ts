/**
 * Plugin Manager - composable plugin registration system.
 *
 * Similar to Lexical's plugin manager pattern:
 * - Fluent interface for chaining plugin registration
 * - Automatic cleanup tracking
 * - Reactive plugin support
 * - Pre-built plugin helpers
 */

import {
  createEffect,
  onCleanup,
  type Accessor,
  type AccessorArray,
} from 'solid-js';
import type { Plugin, CleanupFn, ListController } from '../types';

// ============================================================================
// Utility: Merge Register
// ============================================================================

/** Merge multiple cleanup functions into one */
export function mergeRegister(...cleanups: CleanupFn[]): CleanupFn {
  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

// ============================================================================
// Plugin Manager
// ============================================================================

export type PluginManager<T extends { id: string }> = {
  /** Register a plugin */
  use: (plugin: Plugin<T, ListController<T>>) => PluginManager<T>;

  /** Register a reactive plugin that re-runs when dependencies change */
  useReactive: <D>(
    deps: Accessor<D> | AccessorArray<D>,
    pluginFactory: Accessor<Plugin<T, ListController<T>> | undefined>
  ) => PluginManager<T>;

  /** Register multiple plugins */
  useAll: (plugins: Plugin<T, ListController<T>>[]) => PluginManager<T>;

  /** Cleanup all registered plugins */
  cleanup: () => void;

  /** Get the controller */
  getController: () => ListController<T>;
};

/** Create a plugin manager for a list controller */
export function createPluginManager<T extends { id: string }>(
  controller: ListController<T>
): PluginManager<T> {
  const cleanupFunctions: CleanupFn[] = [];

  const manager: PluginManager<T> = {
    /** Register a plugin and return manager for chaining */
    use(plugin: Plugin<T, ListController<T>>): PluginManager<T> {
      const cleanup = plugin(controller);
      cleanupFunctions.push(cleanup);
      return manager;
    },

    /** Register a reactive plugin that re-runs when deps change */
    useReactive<D>(
      deps: Accessor<D> | AccessorArray<D>,
      pluginFactory: Accessor<Plugin<T, ListController<T>> | undefined>
    ): PluginManager<T> {
      let currentCleanup: CleanupFn | null = null;

      createEffect(() => {
        // Track dependencies
        const depsValue = Array.isArray(deps)
          ? deps.map((d) => d())
          : (deps as Accessor<D>)();

        // Cleanup previous plugin
        if (currentCleanup) {
          currentCleanup();
          currentCleanup = null;
        }

        // Register new plugin if factory returns one
        const plugin = pluginFactory();
        if (plugin) {
          currentCleanup = plugin(controller);
        }
      });

      // Track effect cleanup
      onCleanup(() => {
        if (currentCleanup) {
          currentCleanup();
        }
      });

      // Track for manager cleanup
      cleanupFunctions.push(() => {
        if (currentCleanup) {
          currentCleanup();
          currentCleanup = null;
        }
      });

      return manager;
    },

    /** Register multiple plugins at once */
    useAll(plugins: Plugin<T, ListController<T>>[]): PluginManager<T> {
      plugins.forEach((plugin) => manager.use(plugin));
      return manager;
    },

    /** Cleanup all registered plugins */
    cleanup(): void {
      cleanupFunctions.forEach((cleanup) => cleanup());
      cleanupFunctions.length = 0;
    },

    /** Get the underlying controller */
    getController(): ListController<T> {
      return controller;
    },
  };

  return manager;
}

// ============================================================================
// Plugin Composition Helpers
// ============================================================================

/** Combine multiple plugins into a single plugin */
export function composePlugins<T extends { id: string }>(
  ...plugins: Plugin<T, ListController<T>>[]
): Plugin<T, ListController<T>> {
  return (controller: ListController<T>) => {
    const cleanups = plugins.map((plugin) => plugin(controller));
    return mergeRegister(...cleanups);
  };
}

/** Create a conditional plugin that only runs when condition is true */
export function conditionalPlugin<T extends { id: string }>(
  condition: Accessor<boolean>,
  plugin: Plugin<T, ListController<T>>
): Plugin<T, ListController<T>> {
  return (controller: ListController<T>) => {
    let currentCleanup: CleanupFn | null = null;

    createEffect(() => {
      const shouldRun = condition();

      if (shouldRun && !currentCleanup) {
        currentCleanup = plugin(controller);
      } else if (!shouldRun && currentCleanup) {
        currentCleanup();
        currentCleanup = null;
      }
    });

    return () => {
      if (currentCleanup) {
        currentCleanup();
      }
    };
  };
}

/** Create a plugin that runs once and doesn't cleanup */
export function oncePlugin<T extends { id: string }>(
  fn: (controller: ListController<T>) => void
): Plugin<T, ListController<T>> {
  return (controller: ListController<T>) => {
    fn(controller);
    return () => {};
  };
}
