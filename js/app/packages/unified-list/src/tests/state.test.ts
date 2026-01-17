/**
 * Tests for core state management.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialListState,
  setEntitiesTransition,
  setFocusedIdTransition,
  toggleSelectionTransition,
  selectRangeTransition,
  clearSelectionTransition,
  setLoadingTransition,
  navigateNextTransition,
  navigatePrevTransition,
  navigateFirstTransition,
  navigateLastTransition,
} from '../core/state';

// Test entity type
type TestEntity = { id: string; name: string };

const createTestEntity = (id: string, name: string): TestEntity => ({
  id,
  name,
});

describe('State Management', () => {
  describe('createInitialListState', () => {
    it('creates correct initial state', () => {
      const state = createInitialListState<TestEntity>();

      expect(state.entities).toEqual([]);
      expect(state.focusedId).toBeNull();
      expect(state.selectedIds.size).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.hasMore).toBe(true);
      expect(state.scrollOffset).toBe(0);
    });
  });

  describe('setEntitiesTransition', () => {
    it('sets entities correctly', () => {
      const initial = createInitialListState<TestEntity>();
      const entities = [
        createTestEntity('1', 'Entity 1'),
        createTestEntity('2', 'Entity 2'),
      ];

      const transition = setEntitiesTransition<TestEntity>(entities);
      const result = transition(initial);

      expect(result.entities).toEqual(entities);
      expect(result.entities).not.toBe(initial.entities);
    });
  });

  describe('setFocusedIdTransition', () => {
    it('sets focused ID correctly', () => {
      const initial = createInitialListState<TestEntity>();

      const transition = setFocusedIdTransition<TestEntity>('1');
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('clears focused ID when set to null', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        focusedId: '1',
      };

      const transition = setFocusedIdTransition<TestEntity>(null);
      const result = transition(initial);

      expect(result.focusedId).toBeNull();
    });
  });

  describe('toggleSelectionTransition', () => {
    it('adds ID to selection when not present', () => {
      const initial = createInitialListState<TestEntity>();

      const transition = toggleSelectionTransition<TestEntity>('1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(true);
    });

    it('removes ID from selection when present', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        selectedIds: new Set(['1']),
      };

      const transition = toggleSelectionTransition<TestEntity>('1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(false);
    });

    it('does not mutate original state', () => {
      const initial = createInitialListState<TestEntity>();

      const transition = toggleSelectionTransition<TestEntity>('1');
      transition(initial);

      expect(initial.selectedIds.has('1')).toBe(false);
    });
  });

  describe('selectRangeTransition', () => {
    it('selects range of entities', () => {
      const entities = [
        createTestEntity('1', 'Entity 1'),
        createTestEntity('2', 'Entity 2'),
        createTestEntity('3', 'Entity 3'),
        createTestEntity('4', 'Entity 4'),
      ];
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
      };

      // Default getId uses entity.id - no need to pass getIndex
      const transition = selectRangeTransition<TestEntity>('1', '3');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(true);
      expect(result.selectedIds.has('2')).toBe(true);
      expect(result.selectedIds.has('3')).toBe(true);
      expect(result.selectedIds.has('4')).toBe(false);
    });

    it('handles reverse range', () => {
      const entities = [
        createTestEntity('1', 'Entity 1'),
        createTestEntity('2', 'Entity 2'),
        createTestEntity('3', 'Entity 3'),
      ];
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
      };

      // Default getId uses entity.id - no need to pass getIndex
      const transition = selectRangeTransition<TestEntity>('3', '1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(true);
      expect(result.selectedIds.has('2')).toBe(true);
      expect(result.selectedIds.has('3')).toBe(true);
    });

    it('handles invalid IDs', () => {
      const initial = createInitialListState<TestEntity>();

      const transition = selectRangeTransition<TestEntity>(
        'invalid',
        'also-invalid'
      );
      const result = transition(initial);

      expect(result).toBe(initial);
    });
  });

  describe('clearSelectionTransition', () => {
    it('clears all selections', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        selectedIds: new Set(['1', '2', '3']),
      };

      const transition = clearSelectionTransition<TestEntity>();
      const result = transition(initial);

      expect(result.selectedIds.size).toBe(0);
    });
  });

  describe('setLoadingTransition', () => {
    it('sets loading state', () => {
      const initial = createInitialListState<TestEntity>();

      const transition = setLoadingTransition<TestEntity>(true);
      const result = transition(initial);

      expect(result.isLoading).toBe(true);
    });
  });

  describe('Navigation transitions', () => {
    const entities = [
      createTestEntity('1', 'Entity 1'),
      createTestEntity('2', 'Entity 2'),
      createTestEntity('3', 'Entity 3'),
    ];

    const getEntityId = (e: TestEntity) => e.id;

    it('navigateNextTransition moves to next entity', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigateNextTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('2');
    });

    it('navigateNextTransition stops at end', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '3',
      };

      const transition = navigateNextTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('3');
    });

    it('navigatePrevTransition moves to previous entity', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '2',
      };

      const transition = navigatePrevTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigatePrevTransition stops at start', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigatePrevTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigateFirstTransition moves to first entity', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '3',
      };

      const transition = navigateFirstTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigateLastTransition moves to last entity', () => {
      const initial = {
        ...createInitialListState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigateLastTransition<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('3');
    });

    it('handles empty entity list', () => {
      const initial = createInitialListState<TestEntity>();

      const nextTransition = navigateNextTransition<TestEntity>(getEntityId);
      const prevTransition = navigatePrevTransition<TestEntity>(getEntityId);

      expect(nextTransition(initial)).toBe(initial);
      expect(prevTransition(initial)).toBe(initial);
    });
  });
});
