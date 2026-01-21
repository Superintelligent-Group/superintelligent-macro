/**
 * Tests for core state management.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  setEntities,
  setFocusedId,
  toggleSelection,
  selectRange,
  clearSelection,
  setLoading,
  navigateDown,
  navigateUp,
  navigateFirst,
  navigateLast,
} from '../core/state';

// Test entity type
type TestEntity = { id: string; name: string };

const createTestEntity = (id: string, name: string): TestEntity => ({
  id,
  name,
});

describe('State Management', () => {
  describe('createInitialState', () => {
    it('creates correct initial state', () => {
      const state = createInitialState<TestEntity>();

      expect(state.entities).toEqual([]);
      expect(state.focusedId).toBeNull();
      expect(state.selectedIds.size).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.hasMore).toBe(true);
      expect(state.scrollOffset).toBe(0);
    });
  });

  describe('setEntities', () => {
    it('sets entities correctly', () => {
      const initial = createInitialState<TestEntity>();
      const entities = [
        createTestEntity('1', 'Entity 1'),
        createTestEntity('2', 'Entity 2'),
      ];

      const transition = setEntities<TestEntity>(entities);
      const result = transition(initial);

      expect(result.entities).toEqual(entities);
      expect(result.entities).not.toBe(initial.entities);
    });
  });

  describe('setFocusedId', () => {
    it('sets focused ID correctly', () => {
      const initial = createInitialState<TestEntity>();

      const transition = setFocusedId<TestEntity>('1');
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('clears focused ID when set to null', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        focusedId: '1',
      };

      const transition = setFocusedId<TestEntity>(null);
      const result = transition(initial);

      expect(result.focusedId).toBeNull();
    });
  });

  describe('toggleSelection', () => {
    it('adds ID to selection when not present', () => {
      const initial = createInitialState<TestEntity>();

      const transition = toggleSelection<TestEntity>('1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(true);
    });

    it('removes ID from selection when present', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        selectedIds: new Set(['1']),
      };

      const transition = toggleSelection<TestEntity>('1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(false);
    });

    it('does not mutate original state', () => {
      const initial = createInitialState<TestEntity>();

      const transition = toggleSelection<TestEntity>('1');
      transition(initial);

      expect(initial.selectedIds.has('1')).toBe(false);
    });
  });

  describe('selectRange', () => {
    it('selects range of entities', () => {
      const entities = [
        createTestEntity('1', 'Entity 1'),
        createTestEntity('2', 'Entity 2'),
        createTestEntity('3', 'Entity 3'),
        createTestEntity('4', 'Entity 4'),
      ];
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
      };

      // Default getId uses entity.id - no need to pass getIndex
      const transition = selectRange<TestEntity>('1', '3');
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
        ...createInitialState<TestEntity>(),
        entities,
      };

      // Default getId uses entity.id - no need to pass getIndex
      const transition = selectRange<TestEntity>('3', '1');
      const result = transition(initial);

      expect(result.selectedIds.has('1')).toBe(true);
      expect(result.selectedIds.has('2')).toBe(true);
      expect(result.selectedIds.has('3')).toBe(true);
    });

    it('handles invalid IDs', () => {
      const initial = createInitialState<TestEntity>();

      const transition = selectRange<TestEntity>(
        'invalid',
        'also-invalid'
      );
      const result = transition(initial);

      expect(result).toBe(initial);
    });
  });

  describe('clearSelection', () => {
    it('clears all selections', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        selectedIds: new Set(['1', '2', '3']),
      };

      const transition = clearSelection<TestEntity>();
      const result = transition(initial);

      expect(result.selectedIds.size).toBe(0);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      const initial = createInitialState<TestEntity>();

      const transition = setLoading<TestEntity>(true);
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

    it('navigateDown moves to next entity', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigateDown<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('2');
    });

    it('navigateDown stops at end', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '3',
      };

      const transition = navigateDown<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('3');
    });

    it('navigateUp moves to previous entity', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '2',
      };

      const transition = navigateUp<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigateUp stops at start', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigateUp<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigateFirst moves to first entity', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '3',
      };

      const transition = navigateFirst<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('1');
    });

    it('navigateLast moves to last entity', () => {
      const initial = {
        ...createInitialState<TestEntity>(),
        entities,
        focusedId: '1',
      };

      const transition = navigateLast<TestEntity>(getEntityId);
      const result = transition(initial);

      expect(result.focusedId).toBe('3');
    });

    it('handles empty entity list', () => {
      const initial = createInitialState<TestEntity>();

      const nextTransition = navigateDown<TestEntity>(getEntityId);
      const prevTransition = navigateUp<TestEntity>(getEntityId);

      expect(nextTransition(initial)).toBe(initial);
      expect(prevTransition(initial)).toBe(initial);
    });
  });
});
