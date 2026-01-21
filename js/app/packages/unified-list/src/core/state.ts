/**
 * Pure state management for unified-list.
 *
 * All state transitions are pure functions: (state) => newState
 * This makes testing trivial and reasoning about state changes easy.
 *
 * @example
 * ```ts
 * const newState = navigateDown(getEntityId)(currentState);
 * ```
 */

import { createSignal } from 'solid-js';
import type {
  EntityConstraint,
  ListState,
  StateTransition,
  ReactiveState,
  StateSetters,
  GetEntityId,
} from './types';

// ============================================================================
// Initial State Factory
// ============================================================================

/** Create initial list state */
export function createInitialState<T extends EntityConstraint>(): ListState<T> {
  return {
    entities: [],
    focusedId: null,
    selectedIds: new Set(),
    isLoading: false,
    hasMore: true,
    scrollOffset: 0,
    visibleEntityIds: null,
  };
}

// ============================================================================
// Reactive State Factory
// ============================================================================

/** Create reactive state with Solid.js signals */
export function createReactiveState<T extends EntityConstraint>(
  initial: ListState<T> = createInitialState()
): {
  state: ReactiveState<T>;
  setters: StateSetters<T>;
  getSnapshot: () => ListState<T>;
  apply: (transition: StateTransition<T>) => void;
} {
  const [entities, setEntities] = createSignal<readonly T[]>(initial.entities);
  const [focusedId, setFocusedId] = createSignal<string | null>(
    initial.focusedId
  );
  const [selectedIds, setSelectedIds] = createSignal<ReadonlySet<string>>(
    initial.selectedIds
  );
  const [isLoading, setIsLoading] = createSignal(initial.isLoading);
  const [hasMore, setHasMore] = createSignal(initial.hasMore);
  const [scrollOffset, setScrollOffset] = createSignal(initial.scrollOffset);
  const [visibleEntityIds, setVisibleEntityIds] = createSignal<
    readonly string[] | null
  >(initial.visibleEntityIds);

  const state: ReactiveState<T> = {
    entities,
    focusedId,
    selectedIds,
    isLoading,
    hasMore,
    scrollOffset,
    visibleEntityIds,
  };

  const setters: StateSetters<T> = {
    setEntities,
    setFocusedId,
    setSelectedIds,
    setIsLoading,
    setHasMore,
    setScrollOffset,
    setVisibleEntityIds,
  };

  /** Get current state as immutable snapshot */
  const getSnapshot = (): ListState<T> => ({
    entities: entities(),
    focusedId: focusedId(),
    selectedIds: selectedIds(),
    isLoading: isLoading(),
    hasMore: hasMore(),
    scrollOffset: scrollOffset(),
    visibleEntityIds: visibleEntityIds(),
  });

  /** Apply a state transition (pure function) */
  const apply = (transition: StateTransition<T>): void => {
    const current = getSnapshot();
    const next = transition(current);

    // Only update changed values (referential equality check)
    if (next.entities !== current.entities) setEntities(() => next.entities);
    if (next.focusedId !== current.focusedId) setFocusedId(next.focusedId);
    if (next.selectedIds !== current.selectedIds)
      setSelectedIds(next.selectedIds);
    if (next.isLoading !== current.isLoading) setIsLoading(next.isLoading);
    if (next.hasMore !== current.hasMore) setHasMore(next.hasMore);
    if (next.scrollOffset !== current.scrollOffset)
      setScrollOffset(next.scrollOffset);
    if (next.visibleEntityIds !== current.visibleEntityIds)
      setVisibleEntityIds(next.visibleEntityIds);
  };

  return { state, setters, getSnapshot, apply };
}

// ============================================================================
// Pure State Transitions: Entities
// ============================================================================

/** Set entities */
export function setEntities<T extends EntityConstraint>(
  entities: readonly T[]
): StateTransition<T> {
  return (state) => ({ ...state, entities });
}

/** Append entities (for infinite scroll) */
export function appendEntities<T extends EntityConstraint>(
  newEntities: readonly T[]
): StateTransition<T> {
  return (state) => ({
    ...state,
    entities: [...state.entities, ...newEntities],
  });
}

/** Update a single entity */
export function updateEntity<T extends EntityConstraint>(
  id: string,
  updater: (entity: T) => T,
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => ({
    ...state,
    entities: state.entities.map((e) => (getId(e) === id ? updater(e) : e)),
  });
}

/** Remove entity by ID */
export function removeEntity<T extends EntityConstraint>(
  id: string,
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const newSelected = new Set(state.selectedIds);
    newSelected.delete(id);
    return {
      ...state,
      entities: state.entities.filter((e) => getId(e) !== id),
      focusedId: state.focusedId === id ? null : state.focusedId,
      selectedIds: newSelected,
    };
  };
}

// ============================================================================
// Pure State Transitions: Focus/Navigation
// ============================================================================

/** Set focused ID */
export function setFocusedId<T extends EntityConstraint>(
  id: string | null
): StateTransition<T> {
  return (state) => ({ ...state, focusedId: id });
}

/** Get effective entity IDs (visible or all) */
function getEffectiveIds<T extends EntityConstraint>(
  state: ListState<T>,
  getId: GetEntityId<T>
): readonly string[] {
  return state.visibleEntityIds ?? state.entities.map((e) => getId(e));
}

/** Navigate to next entity */
export function navigateDown<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    if (ids.length === 0) return state;

    const currentIndex = state.focusedId ? ids.indexOf(state.focusedId) : -1;

    // If nothing focused, focus first
    if (currentIndex === -1) {
      return { ...state, focusedId: ids[0] ?? null };
    }

    // Move to next if not at end
    if (currentIndex < ids.length - 1) {
      return { ...state, focusedId: ids[currentIndex + 1] ?? null };
    }

    return state;
  };
}

/** Navigate to previous entity */
export function navigateUp<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    if (ids.length === 0) return state;

    const currentIndex = state.focusedId ? ids.indexOf(state.focusedId) : -1;

    // If nothing focused, focus first
    if (currentIndex === -1) {
      return { ...state, focusedId: ids[0] ?? null };
    }

    // Move to previous if not at start
    if (currentIndex > 0) {
      return { ...state, focusedId: ids[currentIndex - 1] ?? null };
    }

    return state;
  };
}

/** Navigate to first entity */
export function navigateFirst<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    return { ...state, focusedId: ids[0] ?? null };
  };
}

/** Navigate to last entity */
export function navigateLast<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    return { ...state, focusedId: ids[ids.length - 1] ?? null };
  };
}

// ============================================================================
// Pure State Transitions: Selection
// ============================================================================

/** Toggle selection of an entity */
export function toggleSelection<T extends EntityConstraint>(
  id: string
): StateTransition<T> {
  return (state) => {
    const newSelected = new Set(state.selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    return { ...state, selectedIds: newSelected };
  };
}

/** Select a single entity (clears other selections) */
export function selectSingle<T extends EntityConstraint>(
  id: string
): StateTransition<T> {
  return (state) => ({ ...state, selectedIds: new Set([id]) });
}

/** Add IDs to selection */
export function addToSelection<T extends EntityConstraint>(
  ids: readonly string[]
): StateTransition<T> {
  return (state) => ({
    ...state,
    selectedIds: new Set([...state.selectedIds, ...ids]),
  });
}

/** Select range between two IDs */
export function selectRange<T extends EntityConstraint>(
  fromId: string,
  toId: string,
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);

    if (fromIndex === -1 || toIndex === -1) return state;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    const rangeIds = ids.slice(start, end + 1);

    return {
      ...state,
      selectedIds: new Set([...state.selectedIds, ...rangeIds]),
    };
  };
}

/** Select all entities */
export function selectAll<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    return { ...state, selectedIds: new Set(ids) };
  };
}

/** Clear all selections */
export function clearSelection<
  T extends EntityConstraint,
>(): StateTransition<T> {
  return (state) => ({ ...state, selectedIds: new Set() });
}

/** Extend selection up (Shift+K) */
export function extendSelectionUp<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    if (ids.length === 0 || !state.focusedId) return state;

    const currentIndex = ids.indexOf(state.focusedId);
    if (currentIndex <= 0) return state;

    const prevId = ids[currentIndex - 1];
    if (!prevId) return state;

    return {
      ...state,
      focusedId: prevId,
      selectedIds: new Set([...state.selectedIds, state.focusedId, prevId]),
    };
  };
}

/** Extend selection down (Shift+J) */
export function extendSelectionDown<T extends EntityConstraint>(
  getId: GetEntityId<T> = (e) => e.id
): StateTransition<T> {
  return (state) => {
    const ids = getEffectiveIds(state, getId);
    if (ids.length === 0 || !state.focusedId) return state;

    const currentIndex = ids.indexOf(state.focusedId);
    if (currentIndex >= ids.length - 1) return state;

    const nextId = ids[currentIndex + 1];
    if (!nextId) return state;

    return {
      ...state,
      focusedId: nextId,
      selectedIds: new Set([...state.selectedIds, state.focusedId, nextId]),
    };
  };
}

// ============================================================================
// Pure State Transitions: Loading/Metadata
// ============================================================================

/** Set loading state */
export function setLoading<T extends EntityConstraint>(
  isLoading: boolean
): StateTransition<T> {
  return (state) => ({ ...state, isLoading });
}

/** Set hasMore state */
export function setHasMore<T extends EntityConstraint>(
  hasMore: boolean
): StateTransition<T> {
  return (state) => ({ ...state, hasMore });
}

/** Set scroll offset */
export function setScrollOffset<T extends EntityConstraint>(
  scrollOffset: number
): StateTransition<T> {
  return (state) => ({ ...state, scrollOffset });
}

/** Set visible entity IDs (for grouping/filtering) */
export function setVisibleEntityIds<T extends EntityConstraint>(
  visibleEntityIds: readonly string[] | null
): StateTransition<T> {
  return (state) => ({ ...state, visibleEntityIds });
}

// ============================================================================
// Transition Composition
// ============================================================================

/** Compose multiple transitions into one */
export function compose<T extends EntityConstraint>(
  ...transitions: StateTransition<T>[]
): StateTransition<T> {
  return (state) => transitions.reduce((s, t) => t(s), state);
}

/** Apply transition only if condition is true */
export function when<T extends EntityConstraint>(
  condition: boolean | ((state: ListState<T>) => boolean),
  transition: StateTransition<T>
): StateTransition<T> {
  return (state) => {
    const shouldApply =
      typeof condition === 'function' ? condition(state) : condition;
    return shouldApply ? transition(state) : state;
  };
}

