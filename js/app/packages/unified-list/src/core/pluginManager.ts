/**
 * Plugin Manager - composable plugin registration system.
 *
 * Inspired by Lexical's plugin system:
 * - Fluent interface for chaining plugin registration
 * - Automatic cleanup tracking
 * - Reactive plugin support (re-run when deps change)
 * - Plugin composition helpers
 *
 * @example
 * ```ts
 * const manager = createPluginManager(controller);
 *
 * manager
 *   .use(filterPlugin)
 *   .use(sortPlugin)
 *   .use(navigationPlugin)
 *   .useAll([selectionPlugin, hotkeyPlugin]);
 *
 * // Later: cleanup all
 * manager.cleanup();
 * ```
 */

import {
  createEffect,
  onCleanup,
  type Accessor,
  type AccessorArray,
} from 'solid-js';
import type {
  EntityConstraint,
  Plugin,
  CleanupFn,
  ListController,
} from './types';

// ============================================================================
// Utility: Merge Register
// ============================================================================

/** Merge multiple cleanup functions into one */
export function mergeRegister(...cleanups: CleanupFn[]): CleanupFn {
  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

// ============================================================================
// Plugin Manager Types
// ============================================================================

export type PluginManager<T extends EntityConstraint> = {
  /** Register a plugin and return manager for chaining */
  use(plugin: Plugin<T>): PluginManager<T>;

  /** Register a reactive plugin that re-runs when dependencies change */
  useReactive<D>(
    deps: Accessor<D> | AccessorArray<D>,
    pluginFactory: Accessor<Plugin<T> | undefined>
  ): PluginManager<T>;

  /** Register multiple plugins at once */
  useAll(plugins: Plugin<T>[]): PluginManager<T>;

  /** Cleanup all registered plugins */
  cleanup(): void;

  /** Get the underlying controller */
  getController(): ListController<T>;
};

// ============================================================================
// Plugin Manager Factory
// ============================================================================

/** Create a plugin manager for a list controller */
export function createPluginManager<T extends EntityConstraint>(
  controller: ListController<T>
): PluginManager<T> {
  const cleanupFunctions: CleanupFn[] = [];

  const manager: PluginManager<T> = {
    use(plugin: Plugin<T>): PluginManager<T> {
      const cleanup = plugin(controller);
      cleanupFunctions.push(cleanup);
      return manager;
    },

    useReactive<D>(
      deps: Accessor<D> | AccessorArray<D>,
      pluginFactory: Accessor<Plugin<T> | undefined>
    ): PluginManager<T> {
      let currentCleanup: CleanupFn | null = null;

      createEffect(() => {
        // Track dependencies (force reactivity)
        if (Array.isArray(deps)) {
          deps.forEach((d) => d());
        } else {
          (deps as Accessor<D>)();
        }

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

    useAll(plugins: Plugin<T>[]): PluginManager<T> {
      for (const plugin of plugins) {
        manager.use(plugin);
      }
      return manager;
    },

    cleanup(): void {
      for (const cleanup of cleanupFunctions) {
        cleanup();
      }
      cleanupFunctions.length = 0;
    },

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
export function composePlugins<T extends EntityConstraint>(
  ...plugins: Plugin<T>[]
): Plugin<T> {
  return (controller: ListController<T>) => {
    const cleanups = plugins.map((plugin) => plugin(controller));
    return mergeRegister(...cleanups);
  };
}

/** Create a conditional plugin that only runs when condition is true */
export function conditionalPlugin<T extends EntityConstraint>(
  condition: Accessor<boolean>,
  plugin: Plugin<T>
): Plugin<T> {
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

/** Create a plugin that runs setup once (no cleanup needed) */
export function oncePlugin<T extends EntityConstraint>(
  setup: (controller: ListController<T>) => void
): Plugin<T> {
  return (controller: ListController<T>) => {
    setup(controller);
    return () => {};
  };
}

/** Create a plugin from configuration object */
export function createPlugin<T extends EntityConstraint>(config: {
  setup: (controller: ListController<T>) => void | CleanupFn;
}): Plugin<T> {
  return (controller: ListController<T>) => {
    const result = config.setup(controller);
    return result ?? (() => {});
  };
}

/** No-op plugin for conditional composition */
export function noopPlugin<T extends EntityConstraint>(): Plugin<T> {
  return () => () => {};
}
