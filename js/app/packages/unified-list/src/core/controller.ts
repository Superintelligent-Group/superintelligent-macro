/**
 * List Controller - the main interface that plugins interact with.
 *
 * Provides:
 * - Reactive state management
 * - Command dispatch
 * - Entity lookup utilities
 * - Scroll/virtualization control
 */

import { createSignal, type Setter, batch } from 'solid-js';
import type { ListController, CleanupFn, VirtualizerHandle } from '../types';
import { createReactiveListState } from './state';
import { createCommandSystem } from './commands';

// ============================================================================
// Controller Factory
// ============================================================================

export type CreateControllerOptions<T extends { id: string }> = {
  /** Unique identifier for this list instance */
  id: string;
  /** Function to get entity ID */
  getEntityId?: (entity: T) => string;
  /** Initial entities */
  initialEntities?: T[];
  /** Initial focused ID */
  initialFocusedId?: string | null;
  /** Function to fetch more entities (can be sync or async) */
  onFetchMore?: () => void | Promise<void>;
};

/** Create a list controller */
export function createListController<T extends { id: string }>(
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
    onFetchMore,
  } = options;

  // Create reactive state
  const { state, setters } = createReactiveListState<T>({
    entities: initialEntities,
    focusedId: initialFocusedId,
    selectedIds: new Set(),
    isLoading: false,
    hasMore: true,
    scrollOffset: 0,
  });

  // Create command system
  const commands = createCommandSystem();

  // Create refs for container and virtualizer
  const [containerRef, setContainerRef] = createSignal<HTMLElement | null>(
    null
  );
  const [virtualizerHandle, setVirtualizerHandle] =
    createSignal<VirtualizerHandle | null>(null);

  // Entity lookup map for O(1) access
  let entityMap = new Map<string, T>();
  let entityIndexMap = new Map<string, number>();

  // Update maps when entities change (derived from signal)
  const updateEntityMaps = (entities: T[]) => {
    entityMap = new Map();
    entityIndexMap = new Map();
    entities.forEach((entity, index) => {
      const entityId = getEntityId(entity);
      entityMap.set(entityId, entity);
      entityIndexMap.set(entityId, index);
    });
  };

  // Initialize maps
  updateEntityMaps(initialEntities);

  /** Get entity by ID */
  const getEntityById = (entityId: string): T | undefined => {
    // Re-sync map if needed
    const entities = state.entities();
    if (entityMap.size !== entities.length) {
      updateEntityMaps(entities);
    }
    return entityMap.get(entityId);
  };

  /** Get entity index by ID */
  const getEntityIndex = (entityId: string): number => {
    const entities = state.entities();
    if (entityIndexMap.size !== entities.length) {
      updateEntityMaps(entities);
    }
    return entityIndexMap.get(entityId) ?? -1;
  };

  /** Get focused entity */
  const getFocusedEntity = (): T | undefined => {
    const focusedId = state.focusedId();
    if (!focusedId) return undefined;
    return getEntityById(focusedId);
  };

  /** Scroll to entity by ID */
  const scrollToEntity = (entityId: string): void => {
    const handle = virtualizerHandle();
    if (!handle) return;

    const index = getEntityIndex(entityId);
    if (index === -1) return;

    handle.scrollToIndex(index, { align: 'center', behavior: 'auto' });
  };

  /** Fetch more entities */
  const fetchMore = async (): Promise<void> => {
    if (state.isLoading() || !state.hasMore()) return;

    setters.setIsLoading(true);
    try {
      await onFetchMore?.();
    } finally {
      setters.setIsLoading(false);
    }
  };

  // Wrap setEntities to update maps
  const wrappedSetters = {
    ...setters,
    setEntities: ((updater) => {
      setters.setEntities((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        updateEntityMaps(next);
        return next;
      });
    }) as Setter<T[]>,
  };

  const controller: ListController<T> = {
    id,
    state,
    setters: wrappedSetters,
    commands,
    getEntityById,
    getEntityIndex,
    getFocusedEntity,
    scrollToEntity,
    fetchMore,
    containerRef,
    setContainerRef,
    virtualizerHandle,
    setVirtualizerHandle,
  };

  const cleanup = () => {
    entityMap.clear();
    entityIndexMap.clear();
  };

  return { controller, cleanup };
}

// ============================================================================
// Controller Utilities
// ============================================================================

/** Helper to batch multiple state updates */
export function batchUpdates(fn: () => void): void {
  batch(fn);
}

/** Create a selector for checking if an entity is focused */
export function createFocusedSelector<T extends { id: string }>(
  controller: ListController<T>
): (entityId: string) => boolean {
  return (entityId: string) => controller.state.focusedId() === entityId;
}

/** Create a selector for checking if an entity is selected */
export function createSelectedSelector<T extends { id: string }>(
  controller: ListController<T>
): (entityId: string) => boolean {
  return (entityId: string) => controller.state.selectedIds().has(entityId);
}
