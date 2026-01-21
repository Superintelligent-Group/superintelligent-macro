/**
 * Tests for filter utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  createTypeFilter,
  entityTypeFilter,
  createFilterGroup,
} from '../plugins/filterPlugin';

// Test entity types
type TestEntity = {
  id: string;
  type: 'document' | 'email' | 'channel';
  name: string;
};

describe('Filter Utilities', () => {
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
