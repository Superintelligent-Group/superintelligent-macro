/**
 * Tests for sort utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  createNumericSort,
  createStringSort,
  createDateSort,
  composeComparators,
  stableSort,
  updatedAtSort,
  createdAtSort,
  nameSort,
  frecencySort,
} from '../plugins/sortPlugin';

type TestEntity = {
  id: string;
  name: string;
  updatedAt?: number;
  createdAt?: number;
  priority?: number;
};

/** Entity type matching real EntityData structure */
type MixedEntity = {
  id: string;
  name: string;
  type: 'document' | 'email' | 'channel' | 'chat' | 'project';
  updatedAt?: number;
  createdAt?: number;
  frecencyScore?: number;
};

describe('Sort Utilities', () => {
  describe('createNumericSort', () => {
    it('sorts by numeric property ascending', () => {
      const sortByPriority = createNumericSort<TestEntity, 'priority'>(
        'priority'
      );
      const items: TestEntity[] = [
        { id: '1', name: 'A', priority: 3 },
        { id: '2', name: 'B', priority: 1 },
        { id: '3', name: 'C', priority: 2 },
      ];

      const sorted = [...items].sort(sortByPriority);

      expect(sorted[0].priority).toBe(1);
      expect(sorted[1].priority).toBe(2);
      expect(sorted[2].priority).toBe(3);
    });

    it('handles undefined values as 0', () => {
      const sortByPriority = createNumericSort<TestEntity, 'priority'>(
        'priority'
      );
      const items: TestEntity[] = [
        { id: '1', name: 'A', priority: 2 },
        { id: '2', name: 'B' }, // undefined priority
        { id: '3', name: 'C', priority: 1 },
      ];

      const sorted = [...items].sort(sortByPriority);

      expect(sorted[0].id).toBe('2'); // undefined = 0
      expect(sorted[1].priority).toBe(1);
      expect(sorted[2].priority).toBe(2);
    });
  });

  describe('createStringSort', () => {
    it('sorts by string property alphabetically', () => {
      const sortByName = createStringSort<TestEntity, 'name'>('name');
      const items: TestEntity[] = [
        { id: '1', name: 'Charlie' },
        { id: '2', name: 'Alice' },
        { id: '3', name: 'Bob' },
      ];

      const sorted = [...items].sort(sortByName);

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('handles undefined values as empty string', () => {
      type Entity = { id: string; name?: string };
      const sortByName = createStringSort<Entity, 'name'>('name');
      const items: Entity[] = [
        { id: '1', name: 'Bob' },
        { id: '2' }, // undefined name
        { id: '3', name: 'Alice' },
      ];

      const sorted = [...items].sort(sortByName);

      expect(sorted[0].id).toBe('2'); // undefined = empty string, sorts first
      expect(sorted[1].name).toBe('Alice');
      expect(sorted[2].name).toBe('Bob');
    });
  });

  describe('createDateSort', () => {
    it('sorts by date property', () => {
      const sortByDate = createDateSort<TestEntity, 'updatedAt'>('updatedAt');
      const now = Date.now();
      const items: TestEntity[] = [
        { id: '1', name: 'A', updatedAt: now - 1000 },
        { id: '2', name: 'B', updatedAt: now },
        { id: '3', name: 'C', updatedAt: now - 2000 },
      ];

      const sorted = [...items].sort(sortByDate);

      expect(sorted[0].id).toBe('3'); // oldest
      expect(sorted[1].id).toBe('1');
      expect(sorted[2].id).toBe('2'); // newest
    });
  });

  describe('composeComparators', () => {
    it('falls back to next comparator when first returns 0', () => {
      type Entity = { priority: number; name: string };
      const byPriority = (a: Entity, b: Entity) => a.priority - b.priority;
      const byName = (a: Entity, b: Entity) => a.name.localeCompare(b.name);

      const composed = composeComparators(byPriority, byName);
      const items: Entity[] = [
        { priority: 1, name: 'Charlie' },
        { priority: 1, name: 'Alice' },
        { priority: 2, name: 'Bob' },
      ];

      const sorted = [...items].sort(composed);

      expect(sorted[0].name).toBe('Alice'); // priority 1, alphabetically first
      expect(sorted[1].name).toBe('Charlie'); // priority 1, alphabetically second
      expect(sorted[2].name).toBe('Bob'); // priority 2
    });

    it('uses first comparator result when non-zero', () => {
      type Entity = { priority: number; name: string };
      const byPriority = (a: Entity, b: Entity) => a.priority - b.priority;
      const byName = (a: Entity, b: Entity) => a.name.localeCompare(b.name);

      const composed = composeComparators(byPriority, byName);

      const a: Entity = { priority: 1, name: 'Zebra' };
      const b: Entity = { priority: 2, name: 'Alpha' };

      // Even though 'Alpha' < 'Zebra', priority wins
      expect(composed(a, b)).toBeLessThan(0);
    });
  });

  describe('stableSort', () => {
    it('preserves original order for equal elements', () => {
      type Entity = { id: string; priority: number };
      const byPriority = (a: Entity, b: Entity) => a.priority - b.priority;
      const items: Entity[] = [
        { id: '1', priority: 1 },
        { id: '2', priority: 1 },
        { id: '3', priority: 1 },
      ];

      const sorted = stableSort(items, byPriority);

      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });

    it('does not mutate original array', () => {
      type Entity = { id: string; priority: number };
      const byPriority = (a: Entity, b: Entity) => a.priority - b.priority;
      const items: Entity[] = [
        { id: '3', priority: 3 },
        { id: '1', priority: 1 },
        { id: '2', priority: 2 },
      ];

      stableSort(items, byPriority);

      expect(items[0].id).toBe('3'); // Original unchanged
    });
  });

  describe('Pre-built sort configs', () => {
    it('updatedAtSort creates correct config', () => {
      const config = updatedAtSort<TestEntity>();

      expect(config.id).toBe('updated_at');
      expect(config.label).toBe('Last Updated');
      expect(typeof config.comparator).toBe('function');
    });

    it('createdAtSort creates correct config', () => {
      const config = createdAtSort<TestEntity>();

      expect(config.id).toBe('created_at');
      expect(config.label).toBe('Created');
    });

    it('nameSort creates correct config', () => {
      const config = nameSort<TestEntity>();

      expect(config.id).toBe('name');
      expect(config.label).toBe('Name');

      const items: TestEntity[] = [
        { id: '1', name: 'Zebra' },
        { id: '2', name: 'Alpha' },
      ];

      const sorted = [...items].sort(config.comparator);
      expect(sorted[0].name).toBe('Alpha');
    });
  });

  describe('Mixed Entity Type Sorting', () => {
    const now = Date.now();

    it('sorts mixed entity types by updatedAt descending', () => {
      const config = updatedAtSort<MixedEntity>();
      const items: MixedEntity[] = [
        {
          id: 'doc-1',
          name: 'Document',
          type: 'document',
          updatedAt: now - 2000,
        },
        {
          id: 'email-1',
          name: 'Email',
          type: 'email',
          updatedAt: now - 1000,
        },
        {
          id: 'channel-1',
          name: 'Channel',
          type: 'channel',
          updatedAt: now,
        },
      ];

      // Descending order (newest first)
      const sorted = [...items].sort((a, b) => -config.comparator(a, b));

      expect(sorted[0].id).toBe('channel-1'); // newest
      expect(sorted[1].id).toBe('email-1');
      expect(sorted[2].id).toBe('doc-1'); // oldest
    });

    it('entities with missing updatedAt sort to the end (descending)', () => {
      const config = updatedAtSort<MixedEntity>();
      const items: MixedEntity[] = [
        {
          id: 'doc-1',
          name: 'Document',
          type: 'document',
          updatedAt: now - 1000,
        },
        {
          id: 'channel-missing',
          name: 'Channel Without Timestamp',
          type: 'channel',
          // No updatedAt - simulates bug where channel data wasn't mapped
        },
        {
          id: 'email-1',
          name: 'Email',
          type: 'email',
          updatedAt: now,
        },
      ];

      // Descending order (newest first)
      const sorted = [...items].sort((a, b) => -config.comparator(a, b));

      // Entity with undefined updatedAt gets value 0, which is oldest
      // In descending order, oldest goes last
      expect(sorted[0].id).toBe('email-1'); // newest
      expect(sorted[1].id).toBe('doc-1');
      expect(sorted[2].id).toBe('channel-missing'); // undefined = 0 = oldest
    });

    it('sorts by frecency with mixed entity types', () => {
      const config = frecencySort<MixedEntity>();
      const items: MixedEntity[] = [
        {
          id: 'doc-1',
          name: 'Document',
          type: 'document',
          frecencyScore: 50,
        },
        {
          id: 'channel-1',
          name: 'Channel',
          type: 'channel',
          frecencyScore: 100,
        },
        {
          id: 'email-1',
          name: 'Email',
          type: 'email',
          frecencyScore: 75,
        },
      ];

      // Descending order (highest frecency first)
      const sorted = [...items].sort((a, b) => -config.comparator(a, b));

      expect(sorted[0].id).toBe('channel-1'); // highest frecency
      expect(sorted[1].id).toBe('email-1');
      expect(sorted[2].id).toBe('doc-1'); // lowest frecency
    });

    it('handles mix of defined and undefined frecencyScore', () => {
      const config = frecencySort<MixedEntity>();
      const items: MixedEntity[] = [
        {
          id: 'doc-1',
          name: 'Document',
          type: 'document',
          frecencyScore: 50,
        },
        {
          id: 'channel-missing',
          name: 'Channel Without Score',
          type: 'channel',
          // No frecencyScore - simulates bug
        },
        {
          id: 'email-1',
          name: 'Email',
          type: 'email',
          frecencyScore: 75,
        },
      ];

      // Descending order
      const sorted = [...items].sort((a, b) => -config.comparator(a, b));

      expect(sorted[0].id).toBe('email-1'); // highest
      expect(sorted[1].id).toBe('doc-1');
      expect(sorted[2].id).toBe('channel-missing'); // undefined = 0
    });

    it('verifies all entity types have required sort properties for correct ordering', () => {
      // This test documents the expected contract: all entities need timestamps
      // for sorting to work correctly

      const completeEntities: MixedEntity[] = [
        {
          id: 'doc',
          name: 'Doc',
          type: 'document',
          updatedAt: now - 3000,
          createdAt: now - 5000,
          frecencyScore: 100,
        },
        {
          id: 'email',
          name: 'Email',
          type: 'email',
          updatedAt: now - 2000,
          createdAt: now - 4000,
          frecencyScore: 90,
        },
        {
          id: 'channel',
          name: 'Channel',
          type: 'channel',
          updatedAt: now - 1000,
          createdAt: now - 3000,
          frecencyScore: 80,
        },
        {
          id: 'chat',
          name: 'Chat',
          type: 'chat',
          updatedAt: now,
          createdAt: now - 2000,
          frecencyScore: 70,
        },
        {
          id: 'project',
          name: 'Project',
          type: 'project',
          updatedAt: now - 500,
          createdAt: now - 1000,
          frecencyScore: 60,
        },
      ];

      // All entities should have the required properties
      for (const entity of completeEntities) {
        expect(entity.updatedAt).toBeDefined();
        expect(entity.createdAt).toBeDefined();
        expect(entity.frecencyScore).toBeDefined();
      }

      // Sort by updatedAt descending
      const byUpdated = updatedAtSort<MixedEntity>();
      const sortedByUpdated = [...completeEntities].sort(
        (a, b) => -byUpdated.comparator(a, b)
      );

      expect(sortedByUpdated[0].id).toBe('chat'); // most recent
      expect(sortedByUpdated[4].id).toBe('doc'); // oldest

      // Sort by frecency descending
      const byFrecency = frecencySort<MixedEntity>();
      const sortedByFrecency = [...completeEntities].sort(
        (a, b) => -byFrecency.comparator(a, b)
      );

      expect(sortedByFrecency[0].id).toBe('doc'); // highest score
      expect(sortedByFrecency[4].id).toBe('project'); // lowest score
    });
  });
});
