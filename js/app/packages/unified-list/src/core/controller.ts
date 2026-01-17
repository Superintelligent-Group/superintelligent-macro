/**
 * List Controller - the main interface that plugins interact with.
 *
 * The controller is the central hub for list operations:
 * - Reactive state management
 * - Command dispatch system
 * - Entity lookup utilities (O(1) by ID)
 * - Scroll/virtualization control
 *
 * Plugins receive the controller and can:
 * - Read state via controller.state
 * - Mutate state via controller.setters
 * - Register command handlers via controller.commands
 * - Access entities via getEntityById, getFocusedEntity, etc.
 *
 * @example
 * ```ts
 * const { controller, cleanup } = createListController({
 *   id: 'my-list',
 *   onFetchMore: async () => {
 *     const more = await fetchMoreData();
 *     controller.setters.setEntities(prev => [...prev, ...more]);
 *   }
 * });
 *
 * // Later: cleanup
 * cleanup();
 * ```
 */

import { createSignal, batch, type Setter } from 'solid-js';
import type {
  EntityConstraint,
  ListController,
  CleanupFn,
  VirtualizerHandle,
  GetEntityId,
  ListState,
} from './types';
import { createReactiveState, createInitialState } from './state';
import { createCommandSystem } from './commands';

// ============================================================================
// Controller Factory Options
// ============================================================================

export type CreateControllerOptions<T extends EntityConstraint> = {
  /** Unique identifier for this list instance */
  readonly id: string;
  /** Function to extract entity ID (defaults to entity.id) */
  readonly getEntityId?: GetEntityId<T>;
  /** Initial entities */
  readonly initialEntities?: readonly T[];
  /** Initial focused entity ID */
  readonly initialFocusedId?: string | null;
  /** Initial state (overrides other initial* options) */
  readonly initialState?: ListState<T>;
  /** Callback when more data is requested (infinite scroll) */
  readonly onFetchMore?: () => void | Promise<void>;
};

// ============================================================================
// Controller Factory
// ============================================================================

/** Create a list controller instance */
export function createListController<T extends EntityConstraint>(
  options: CreateControllerOptions<T>
): {
  controller: ListController<T>;
  cleanup: CleanupFn;
} {
  const {
    id,
    getEntityId = (entity: T) => entity.id,
    initialEntities = [],
    initialFocusedId = null,
    initialState,
    onFetchMore,
  } = options;

  // Create initial state
  const initial: ListState<T> = initialState ?? {
    ...createInitialState<T>(),
    entities: initialEntities,
    focusedId: initialFocusedId,
  };

  // Create reactive state
  const { state, setters } = createReactiveState<T>(initial);

  // Create command system
  const commands = createCommandSystem();

  // Create refs for container and virtualizer
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(
    null
  );
  const [virtualizerHandle, setVirtualizerHandle] =
    createSignal<VirtualizerHandle | null>(null);

  // Entity lookup maps for O(1) access
  let entityMap = new Map<string, T>();
  let entityIndexMap = new Map<string, number>();
  let lastEntityCount = -1;

  /** Update lookup maps when entities change */
  const updateEntityMaps = (entities: readonly T[]) => {
    entityMap.clear();
    entityIndexMap.clear();
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity) {
        const entityId = getEntityId(entity);
        entityMap.set(entityId, entity);
        entityIndexMap.set(entityId, i);
      }
    }
    lastEntityCount = entities.length;
  };

  // Initialize maps
  updateEntityMaps(initialEntities);

  /** Ensure maps are in sync */
  const ensureMapsSync = () => {
    const entities = state.entities();
    if (entities.length !== lastEntityCount) {
      updateEntityMaps(entities);
    }
  };

  /** Get entity by ID (O(1)) */
  const getEntityById = (entityId: string): T | undefined => {
    ensureMapsSync();
    return entityMap.get(entityId);
  };

  /** Get entity index by ID (O(1)) */
  const getEntityIndex = (entityId: string): number => {
    ensureMapsSync();
    return entityIndexMap.get(entityId) ?? -1;
  };

  /** Get currently focused entity */
  const getFocusedEntity = (): T | undefined => {
    const focusedId = state.focusedId();
    return focusedId ? getEntityById(focusedId) : undefined;
  };

  /** Get all selected entities */
  const getSelectedEntities = (): readonly T[] => {
    const selectedIds = state.selectedIds();
    if (selectedIds.size === 0) return [];

    const result: T[] = [];
    for (const id of selectedIds) {
      const entity = getEntityById(id);
      if (entity) result.push(entity);
    }
    return result;
  };

  /** Get effective entity list (visible or all) */
  const getEffectiveEntities = (): readonly T[] => {
    const visibleIds = state.visibleEntityIds();
    if (!visibleIds) return state.entities();

    const result: T[] = [];
    for (const id of visibleIds) {
      const entity = getEntityById(id);
      if (entity) result.push(entity);
    }
    return result;
  };

  /** Scroll to entity by ID */
  const scrollToEntity = (entityId: string): void => {
    const handle = virtualizerHandle();
    if (!handle) return;

    const index = getEntityIndex(entityId);
    if (index === -1) return;

    handle.scrollToIndex(index, { align: 'center' });
  };

  /** Fetch more entities (infinite scroll) */
  const fetchMore = async (): Promise<void> => {
    if (state.isLoading() || !state.hasMore()) return;

    setters.setIsLoading(true);
    try {
      await onFetchMore?.();
    } finally {
      setters.setIsLoading(false);
    }
  };

  // Wrap setEntities to auto-update lookup maps
  const wrappedSetters = {
    ...setters,
    setEntities: ((updater) => {
      setters.setEntities((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        updateEntityMaps(next);
        return next;
      });
    }) as Setter<readonly T[]>,
  };

  // Build controller object
  const controller: ListController<T> = {
    id,
    state,
    setters: wrappedSetters,
    commands,
    getEntityById,
    getEntityIndex,
    getFocusedEntity,
    getSelectedEntities,
    getEffectiveEntities,
    scrollToEntity,
    fetchMore,
    containerRef,
    setContainerRef,
    virtualizerHandle,
    setVirtualizerHandle,
  };

  // Cleanup function
  const cleanup: CleanupFn = () => {
    entityMap.clear();
    entityIndexMap.clear();
  };

  return { controller, cleanup };
}

// ============================================================================
// Controller Utilities
// ============================================================================

/** Batch multiple state updates for performance */
export function batchUpdates(fn: () => void): void {
  batch(fn);
}

/** Create a selector for checking if an entity is focused */
export function createFocusedSelector<T extends EntityConstraint>(
  controller: ListController<T>
): (entityId: string) => boolean {
  return (entityId: string) => controller.state.focusedId() === entityId;
}

/** Create a selector for checking if an entity is selected */
export function createSelectedSelector<T extends EntityConstraint>(
  controller: ListController<T>
): (entityId: string) => boolean {
  return (entityId: string) => controller.state.selectedIds().has(entityId);
}

/** Get entity at specific index */
export function getEntityAtIndex<T extends EntityConstraint>(
  controller: ListController<T>,
  index: number
): T | undefined {
  const entities = controller.state.entities();
  return entities[index];
}
