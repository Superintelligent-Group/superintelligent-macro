/**
 * Tests for filter utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  composeFilters,
  composeFiltersOr,
  negateFilter,
  createTypeFilter,
  createPropertyFilter,
  createTruthyFilter,
  entityTypeFilter,
  createFilterGroup,
} from '../plugins/filterPlugin';

// Test entity types
type TestEntity = {
  id: string;
  type: 'document' | 'email' | 'channel';
  name: string;
  isRead?: boolean;
  priority?: number;
};

describe('Filter Utilities', () => {
  describe('composeFilters', () => {
    it('returns true when no filters provided', () => {
      const composed = composeFilters<TestEntity>();
      const entity: TestEntity = { id: '1', type: 'document', name: 'Test' };

      expect(composed(entity)).toBe(true);
    });

    it('combines filters with AND logic', () => {
      const isDocument = (e: TestEntity) => e.type === 'document';
      const hasName = (e: TestEntity) => e.name.length > 0;

      const composed = composeFilters(isDocument, hasName);

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };
      const emptyDoc: TestEntity = { id: '3', type: 'document', name: '' };

      expect(composed(doc)).toBe(true);
      expect(composed(email)).toBe(false);
      expect(composed(emptyDoc)).toBe(false);
    });
  });

  describe('composeFiltersOr', () => {
    it('returns true when no filters provided', () => {
      const composed = composeFiltersOr<TestEntity>();
      const entity: TestEntity = { id: '1', type: 'document', name: 'Test' };

      expect(composed(entity)).toBe(true);
    });

    it('combines filters with OR logic', () => {
      const isDocument = (e: TestEntity) => e.type === 'document';
      const isEmail = (e: TestEntity) => e.type === 'email';

      const composed = composeFiltersOr(isDocument, isEmail);

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };
      const channel: TestEntity = { id: '3', type: 'channel', name: 'Test' };

      expect(composed(doc)).toBe(true);
      expect(composed(email)).toBe(true);
      expect(composed(channel)).toBe(false);
    });
  });

  describe('negateFilter', () => {
    it('inverts filter result', () => {
      const isDocument = (e: TestEntity) => e.type === 'document';
      const notDocument = negateFilter(isDocument);

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };

      expect(notDocument(doc)).toBe(false);
      expect(notDocument(email)).toBe(true);
    });
  });

  describe('createTypeFilter', () => {
    it('filters by single type', () => {
      const documentFilter = createTypeFilter<TestEntity>(['document']);

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };

      expect(documentFilter(doc)).toBe(true);
      expect(documentFilter(email)).toBe(false);
    });

    it('filters by multiple types', () => {
      const docOrEmailFilter = createTypeFilter<TestEntity>([
        'document',
        'email',
      ]);

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };
      const channel: TestEntity = { id: '3', type: 'channel', name: 'Test' };

      expect(docOrEmailFilter(doc)).toBe(true);
      expect(docOrEmailFilter(email)).toBe(true);
      expect(docOrEmailFilter(channel)).toBe(false);
    });
  });

  describe('createPropertyFilter', () => {
    it('filters by property value', () => {
      const highPriorityFilter = createPropertyFilter<TestEntity, 'priority'>(
        'priority',
        1
      );

      const highPriority: TestEntity = {
        id: '1',
        type: 'document',
        name: 'Test',
        priority: 1,
      };
      const lowPriority: TestEntity = {
        id: '2',
        type: 'document',
        name: 'Test',
        priority: 2,
      };

      expect(highPriorityFilter(highPriority)).toBe(true);
      expect(highPriorityFilter(lowPriority)).toBe(false);
    });
  });

  describe('createTruthyFilter', () => {
    it('filters by truthy property value', () => {
      const readFilter = createTruthyFilter<TestEntity, 'isRead'>('isRead');

      const read: TestEntity = {
        id: '1',
        type: 'email',
        name: 'Test',
        isRead: true,
      };
      const unread: TestEntity = {
        id: '2',
        type: 'email',
        name: 'Test',
        isRead: false,
      };
      const noStatus: TestEntity = { id: '3', type: 'email', name: 'Test' };

      expect(readFilter(read)).toBe(true);
      expect(readFilter(unread)).toBe(false);
      expect(readFilter(noStatus)).toBe(false);
    });
  });

  describe('entityTypeFilter', () => {
    it('creates filter config for entity type', () => {
      const config = entityTypeFilter<TestEntity>(
        'documents',
        'Documents',
        ['document'],
        'type-group'
      );

      expect(config.id).toBe('documents');
      expect(config.label).toBe('Documents');
      expect(config.group).toBe('type-group');

      const doc: TestEntity = { id: '1', type: 'document', name: 'Test' };
      const email: TestEntity = { id: '2', type: 'email', name: 'Test' };

      expect(config.predicate(doc)).toBe(true);
      expect(config.predicate(email)).toBe(false);
    });
  });

  describe('createFilterGroup', () => {
    it('creates filter group with filter IDs', () => {
      const group = createFilterGroup(
        'entity-types',
        'Entity Types',
        ['documents', 'emails'],
        false
      );

      expect(group.id).toBe('entity-types');
      expect(group.label).toBe('Entity Types');
      expect(group.allowMultiple).toBe(false);
      expect(group.filterIds).toEqual(['documents', 'emails']);
    });

    it('allows multiple selections when configured', () => {
      const group = createFilterGroup(
        'multi-group',
        'Multi Group',
        ['f1', 'f2'],
        true
      );

      expect(group.allowMultiple).toBe(true);
    });
  });
});
