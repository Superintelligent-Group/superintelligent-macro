/**
 * Core state management for unified-list.
 *
 * Pure state transitions and reactive state creation.
 * All state changes go through well-defined transitions.
 */

import { createSignal, type Accessor, type Setter } from 'solid-js';
import type {
  ListState,
  ListStateTransition,
  ReactiveListState,
  ListStateSetters,
} from '../types';

// ============================================================================
// Initial State
// ============================================================================

/** Create initial list state */
export function createInitialListState<T>(): ListState<T> {
  return {
    entities: [],
    focusedId: null,
    selectedIds: new Set(),
    isLoading: false,
    hasMore: true,
    scrollOffset: 0,
  };
}

// ============================================================================
// Pure State Transitions
// ============================================================================

/** Set entities transition */
export function setEntitiesTransition<T>(
  entities: T[]
): ListStateTransition<T> {
  return (state) => ({ ...state, entities });
}

/** Set focused ID transition */
export function setFocusedIdTransition<T>(
  focusedId: string | null
): ListStateTransition<T> {
  return (state) => ({ ...state, focusedId });
}

/** Toggle selection transition */
export function toggleSelectionTransition<T>(
  id: string
): ListStateTransition<T> {
  return (state) => {
    const newSelectedIds = new Set(state.selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    return { ...state, selectedIds: newSelectedIds };
  };
}

/** Select range transition */
export function selectRangeTransition<T>(
  fromId: string,
  toId: string,
  getIndex: (id: string) => number
): ListStateTransition<T> {
  return (state) => {
    const fromIndex = getIndex(fromId);
    const toIndex = getIndex(toId);
    if (fromIndex === -1 || toIndex === -1) return state;

    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);
    const newSelectedIds = new Set(state.selectedIds);

    for (let i = startIndex; i <= endIndex; i++) {
      const entity = state.entities[i] as T & { id: string };
      if (entity?.id) {
        newSelectedIds.add(entity.id);
      }
    }

    return { ...state, selectedIds: newSelectedIds };
  };
}

/** Clear selection transition */
export function clearSelectionTransition<T>(): ListStateTransition<T> {
  return (state) => ({ ...state, selectedIds: new Set() });
}

/** Set loading transition */
export function setLoadingTransition<T>(
  isLoading: boolean
): ListStateTransition<T> {
  return (state) => ({ ...state, isLoading });
}

/** Set has more transition */
export function setHasMoreTransition<T>(
  hasMore: boolean
): ListStateTransition<T> {
  return (state) => ({ ...state, hasMore });
}

/** Set scroll offset transition */
export function setScrollOffsetTransition<T>(
  scrollOffset: number
): ListStateTransition<T> {
  return (state) => ({ ...state, scrollOffset });
}

/** Navigate to next entity transition */
export function navigateNextTransition<T>(
  getEntityId: (entity: T) => string
): ListStateTransition<T> {
  return (state) => {
    const { entities, focusedId } = state;
    if (entities.length === 0) return state;

    const currentIndex = focusedId
      ? entities.findIndex((e) => getEntityId(e) === focusedId)
      : -1;

    const nextIndex = Math.min(currentIndex + 1, entities.length - 1);
    const nextEntity = entities[nextIndex];
    if (!nextEntity) return state;

    return { ...state, focusedId: getEntityId(nextEntity) };
  };
}

/** Navigate to previous entity transition */
export function navigatePrevTransition<T>(
  getEntityId: (entity: T) => string
): ListStateTransition<T> {
  return (state) => {
    const { entities, focusedId } = state;
    if (entities.length === 0) return state;

    const currentIndex = focusedId
      ? entities.findIndex((e) => getEntityId(e) === focusedId)
      : entities.length;

    const prevIndex = Math.max(currentIndex - 1, 0);
    const prevEntity = entities[prevIndex];
    if (!prevEntity) return state;

    return { ...state, focusedId: getEntityId(prevEntity) };
  };
}

/** Navigate to first entity transition */
export function navigateFirstTransition<T>(
  getEntityId: (entity: T) => string
): ListStateTransition<T> {
  return (state) => {
    const { entities } = state;
    const firstEntity = entities[0];
    if (!firstEntity) return state;

    return { ...state, focusedId: getEntityId(firstEntity) };
  };
}

/** Navigate to last entity transition */
export function navigateLastTransition<T>(
  getEntityId: (entity: T) => string
): ListStateTransition<T> {
  return (state) => {
    const { entities } = state;
    const lastEntity = entities[entities.length - 1];
    if (!lastEntity) return state;

    return { ...state, focusedId: getEntityId(lastEntity) };
  };
}

// ============================================================================
// Reactive State Factory
// ============================================================================

/** Create reactive list state with signals */
export function createReactiveListState<T>(
  initial: ListState<T> = createInitialListState<T>()
): {
  state: ReactiveListState<T>;
  setters: ListStateSetters<T>;
  getSnapshot: () => ListState<T>;
  applyTransition: (transition: ListStateTransition<T>) => void;
} {
  const [entities, setEntities] = createSignal<T[]>(initial.entities);
  const [focusedId, setFocusedId] = createSignal<string | null>(
    initial.focusedId
  );
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(
    initial.selectedIds
  );
  const [isLoading, setIsLoading] = createSignal<boolean>(initial.isLoading);
  const [hasMore, setHasMore] = createSignal<boolean>(initial.hasMore);
  const [scrollOffset, setScrollOffset] = createSignal<number>(
    initial.scrollOffset
  );
  const [visibleEntityIds, setVisibleEntityIds] = createSignal<string[] | null>(
    null
  );

  const state: ReactiveListState<T> = {
    entities,
    focusedId,
    selectedIds,
    isLoading,
    hasMore,
    scrollOffset,
    visibleEntityIds,
  };

  const setters: ListStateSetters<T> = {
    setEntities,
    setFocusedId,
    setSelectedIds,
    setIsLoading,
    setHasMore,
    setScrollOffset,
    setVisibleEntityIds,
  };

  /** Get current state as plain object */
  const getSnapshot = (): ListState<T> => ({
    entities: entities(),
    focusedId: focusedId(),
    selectedIds: selectedIds(),
    isLoading: isLoading(),
    hasMore: hasMore(),
    scrollOffset: scrollOffset(),
  });

  /** Apply a state transition */
  const applyTransition = (transition: ListStateTransition<T>): void => {
    const currentState = getSnapshot();
    const nextState = transition(currentState);

    // Only update changed values
    if (nextState.entities !== currentState.entities) {
      setEntities(() => nextState.entities);
    }
    if (nextState.focusedId !== currentState.focusedId) {
      setFocusedId(nextState.focusedId);
    }
    if (nextState.selectedIds !== currentState.selectedIds) {
      setSelectedIds(nextState.selectedIds);
    }
    if (nextState.isLoading !== currentState.isLoading) {
      setIsLoading(nextState.isLoading);
    }
    if (nextState.hasMore !== currentState.hasMore) {
      setHasMore(nextState.hasMore);
    }
    if (nextState.scrollOffset !== currentState.scrollOffset) {
      setScrollOffset(nextState.scrollOffset);
    }
  };

  return { state, setters, getSnapshot, applyTransition };
}
