/**
 * Test Fixtures - Type-safe mock entity generators for testing.
 *
 * These fixtures provide isolated, predictable test data without
 * dependencies on real entity types or API responses.
 */

// ============================================================================
// Test Entity Type
// ============================================================================

/** Minimal entity type for testing - matches the { id: string } constraint */
export type TestEntity = {
  id: string;
  name: string;
  type: 'document' | 'task' | 'email' | 'channel';
  updatedAt: number;
  createdAt: number;
  isUnread?: boolean;
  isDone?: boolean;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
};

// ============================================================================
// Entity Factories
// ============================================================================

let entityCounter = 0;

/** Create a single test entity with optional overrides */
export function createTestEntity(
  id?: string,
  overrides?: Partial<Omit<TestEntity, 'id'>>
): TestEntity {
  const entityId = id ?? `entity-${++entityCounter}`;
  const now = Date.now();

  return {
    id: entityId,
    name: overrides?.name ?? `Entity ${entityId}`,
    type: overrides?.type ?? 'document',
    updatedAt: overrides?.updatedAt ?? now,
    createdAt: overrides?.createdAt ?? now - 86400000, // 1 day ago
    isUnread: overrides?.isUnread ?? false,
    isDone: overrides?.isDone ?? false,
    priority: overrides?.priority ?? 'medium',
    category: overrides?.category ?? 'default',
  };
}

/** Create multiple test entities */
export function createTestEntities(
  count: number,
  overrides?: Partial<Omit<TestEntity, 'id'>>
): TestEntity[] {
  return Array.from({ length: count }, (_, i) =>
    createTestEntity(`entity-${i + 1}`, overrides)
  );
}

/** Reset the entity counter (useful between tests) */
export function resetEntityCounter(): void {
  entityCounter = 0;
}

// ============================================================================
// Preset Datasets
// ============================================================================

/** Small list for basic tests (10 items) */
export const FIXTURE_SMALL_LIST: TestEntity[] = [
  createTestEntity('small-1', { name: 'First Document', type: 'document' }),
  createTestEntity('small-2', { name: 'Second Document', type: 'document' }),
  createTestEntity('small-3', {
    name: 'First Task',
    type: 'task',
    isDone: false,
  }),
  createTestEntity('small-4', {
    name: 'Second Task',
    type: 'task',
    isDone: true,
  }),
  createTestEntity('small-5', {
    name: 'First Email',
    type: 'email',
    isUnread: true,
  }),
  createTestEntity('small-6', {
    name: 'Second Email',
    type: 'email',
    isUnread: false,
  }),
  createTestEntity('small-7', { name: 'First Channel', type: 'channel' }),
  createTestEntity('small-8', { name: 'Third Document', type: 'document' }),
  createTestEntity('small-9', { name: 'Third Task', type: 'task' }),
  createTestEntity('small-10', { name: 'Third Email', type: 'email' }),
];

/** Large list for virtualization tests (1000 items) */
export function createLargeList(count = 1000): TestEntity[] {
  const types: TestEntity['type'][] = ['document', 'task', 'email', 'channel'];
  return Array.from({ length: count }, (_, i) =>
    createTestEntity(`large-${i + 1}`, {
      name: `Item ${i + 1}`,
      type: types[i % types.length],
      isUnread: i % 5 === 0,
      isDone: i % 7 === 0,
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      category: `Category ${(i % 5) + 1}`,
      updatedAt: Date.now() - i * 60000, // Each item 1 minute older
      createdAt: Date.now() - i * 120000 - 86400000,
    })
  );
}

export const FIXTURE_LARGE_LIST = createLargeList(1000);

/** Mixed types list for filter testing */
export const FIXTURE_MIXED_TYPES: TestEntity[] = [
  // Documents
  createTestEntity('mixed-doc-1', {
    name: 'Project Proposal',
    type: 'document',
    category: 'work',
  }),
  createTestEntity('mixed-doc-2', {
    name: 'Meeting Notes',
    type: 'document',
    category: 'work',
  }),
  createTestEntity('mixed-doc-3', {
    name: 'Personal Notes',
    type: 'document',
    category: 'personal',
  }),
  // Tasks
  createTestEntity('mixed-task-1', {
    name: 'Review PR',
    type: 'task',
    isDone: false,
    priority: 'high',
  }),
  createTestEntity('mixed-task-2', {
    name: 'Fix Bug',
    type: 'task',
    isDone: false,
    priority: 'high',
  }),
  createTestEntity('mixed-task-3', {
    name: 'Update Docs',
    type: 'task',
    isDone: true,
    priority: 'low',
  }),
  createTestEntity('mixed-task-4', {
    name: 'Write Tests',
    type: 'task',
    isDone: false,
    priority: 'medium',
  }),
  // Emails
  createTestEntity('mixed-email-1', {
    name: 'Team Update',
    type: 'email',
    isUnread: true,
  }),
  createTestEntity('mixed-email-2', {
    name: 'Newsletter',
    type: 'email',
    isUnread: false,
  }),
  createTestEntity('mixed-email-3', {
    name: 'Important Alert',
    type: 'email',
    isUnread: true,
  }),
  // Channels
  createTestEntity('mixed-channel-1', { name: 'General', type: 'channel' }),
  createTestEntity('mixed-channel-2', { name: 'Engineering', type: 'channel' }),
];

/** Grouped list for groupBy testing */
export const FIXTURE_GROUPED_LIST: TestEntity[] = [
  // High priority
  createTestEntity('grouped-1', {
    name: 'Urgent Task',
    type: 'task',
    priority: 'high',
  }),
  createTestEntity('grouped-2', {
    name: 'Critical Bug',
    type: 'task',
    priority: 'high',
  }),
  // Medium priority
  createTestEntity('grouped-3', {
    name: 'Feature Work',
    type: 'task',
    priority: 'medium',
  }),
  createTestEntity('grouped-4', {
    name: 'Code Review',
    type: 'task',
    priority: 'medium',
  }),
  createTestEntity('grouped-5', {
    name: 'Documentation',
    type: 'task',
    priority: 'medium',
  }),
  // Low priority
  createTestEntity('grouped-6', {
    name: 'Nice to Have',
    type: 'task',
    priority: 'low',
  }),
  createTestEntity('grouped-7', {
    name: 'Cleanup',
    type: 'task',
    priority: 'low',
  }),
];

// ============================================================================
// Filter Configs for Testing
// ============================================================================

import type { FilterConfig } from '../types';

/** Document type filter */
export const testDocumentFilter: FilterConfig<TestEntity> = {
  id: 'documents',
  label: 'Documents',
  predicate: (entity) => entity.type === 'document',
  active: false,
};

/** Task type filter */
export const testTaskFilter: FilterConfig<TestEntity> = {
  id: 'tasks',
  label: 'Tasks',
  predicate: (entity) => entity.type === 'task',
  active: false,
};

/** Email type filter */
export const testEmailFilter: FilterConfig<TestEntity> = {
  id: 'emails',
  label: 'Emails',
  predicate: (entity) => entity.type === 'email',
  active: false,
};

/** Channel type filter */
export const testChannelFilter: FilterConfig<TestEntity> = {
  id: 'channels',
  label: 'Channels',
  predicate: (entity) => entity.type === 'channel',
  active: false,
};

/** Unread filter */
export const testUnreadFilter: FilterConfig<TestEntity> = {
  id: 'unread',
  label: 'Unread',
  predicate: (entity) => entity.isUnread === true,
  active: false,
};

/** Not done filter */
export const testNotDoneFilter: FilterConfig<TestEntity> = {
  id: 'not-done',
  label: 'Not Done',
  predicate: (entity) => entity.isDone === false,
  active: false,
};

/** High priority filter */
export const testHighPriorityFilter: FilterConfig<TestEntity> = {
  id: 'high-priority',
  label: 'High Priority',
  predicate: (entity) => entity.priority === 'high',
  active: false,
};

/** All test filters */
export const TEST_FILTERS: FilterConfig<TestEntity>[] = [
  testDocumentFilter,
  testTaskFilter,
  testEmailFilter,
  testChannelFilter,
  testUnreadFilter,
  testNotDoneFilter,
  testHighPriorityFilter,
];

// ============================================================================
// Sort Configs for Testing
// ============================================================================

import type { SortConfig } from '../types';

/** Sort by name ascending */
export const testNameSort: SortConfig<TestEntity> = {
  id: 'name',
  label: 'Name',
  comparator: (a, b) => a.name.localeCompare(b.name),
};

/** Sort by updated at descending */
export const testUpdatedAtSort: SortConfig<TestEntity> = {
  id: 'updated_at',
  label: 'Updated',
  comparator: (a, b) => b.updatedAt - a.updatedAt,
};

/** Sort by created at descending */
export const testCreatedAtSort: SortConfig<TestEntity> = {
  id: 'created_at',
  label: 'Created',
  comparator: (a, b) => b.createdAt - a.createdAt,
};

/** Sort by priority (high first) */
export const testPrioritySort: SortConfig<TestEntity> = {
  id: 'priority',
  label: 'Priority',
  comparator: (a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (
      (order[a.priority ?? 'medium'] ?? 1) -
      (order[b.priority ?? 'medium'] ?? 1)
    );
  },
};

/** All test sorts */
export const TEST_SORTS: SortConfig<TestEntity>[] = [
  testNameSort,
  testUpdatedAtSort,
  testCreatedAtSort,
  testPrioritySort,
];

// ============================================================================
// GroupBy Configs for Testing
// ============================================================================

import type { GroupKeyFn, GroupRegistry, GroupConfig } from '../types/groupBy';

/** Group by entity type */
export const testTypeGroupKeyFn: GroupKeyFn<TestEntity> = (entity) =>
  entity.type;

/** Group by priority */
export const testPriorityGroupKeyFn: GroupKeyFn<TestEntity> = (entity) =>
  entity.priority ?? 'medium';

/** Group by category */
export const testCategoryGroupKeyFn: GroupKeyFn<TestEntity> = (entity) =>
  entity.category ?? 'default';

/** Type group registry */
export const testTypeGroupRegistry: GroupRegistry = new Map<
  string,
  GroupConfig
>([
  ['document', { id: 'document', label: 'Documents', order: 0 }],
  ['task', { id: 'task', label: 'Tasks', order: 1 }],
  ['email', { id: 'email', label: 'Emails', order: 2 }],
  ['channel', { id: 'channel', label: 'Channels', order: 3 }],
]);

/** Priority group registry */
export const testPriorityGroupRegistry: GroupRegistry = new Map<
  string,
  GroupConfig
>([
  ['high', { id: 'high', label: 'High Priority', order: 0 }],
  ['medium', { id: 'medium', label: 'Medium Priority', order: 1 }],
  ['low', { id: 'low', label: 'Low Priority', order: 2 }],
]);

// ============================================================================
// Search Helpers
// ============================================================================

/** Simple local search filter that matches entity name */
export function testLocalSearchFilter(
  entity: TestEntity,
  text: string
): boolean {
  if (!text) return true;
  return entity.name.toLowerCase().includes(text.toLowerCase());
}
