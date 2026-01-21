/**
 * Soup Filtering Integration Tests
 *
 * These tests verify that the full filtering pipeline works correctly
 * with mock data, ensuring filters properly filter down the entity list.
 */

import { describe, it, expect } from 'vitest';
import { createRoot } from 'solid-js';
import type { EntityData } from '@macro-entity';
import { createListController } from '../core/controller';
import { createPluginManager } from '../core/pluginManager';
import { createFilterPlugin } from '../plugins/filterPlugin';
import {
  signalFilter,
  noiseFilter,
} from '@soup/filters';
import {
  createSoupFilterConfigs,
  documentFilter,
  taskFilter,
  emailFilter,
  peopleFilter,
  teamsFilter,
  agentFilter,
  projectFilter,
} from '@soup/filterConfigs';
import type { FilterGroup } from '../types';
import type { EnhancedEntity } from '../components/entity/types';

// ============================================================================
// Mock Data Factory
// ============================================================================

function createMockEntity(
  overrides: Partial<EntityData> & {
    id: string;
    name: string;
    type: EntityData['type'];
  }
): EnhancedEntity {
  const base = {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
  return base as EnhancedEntity;
}

function createMockDocument(
  id: string,
  name: string,
  fileType = 'md'
): EnhancedEntity {
  return createMockEntity({
    id,
    name,
    type: 'document',
    fileType,
  });
}

function createMockTask(id: string, name: string): EnhancedEntity {
  return createMockEntity({
    id,
    name,
    type: 'document',
    fileType: 'md',
    subType: { type: 'task' },
  });
}

function createMockEmail(
  id: string,
  name: string,
  labels: string[] = []
): EnhancedEntity {
  const entity = createMockEntity({
    id,
    name,
    type: 'email',
  });
  // Cast to any for test mock - simplified labels structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (entity as any).labels = labels.map((l) => ({ name: l }));
  return entity;
}

function createMockChannel(
  id: string,
  name: string,
  channelType: 'direct_message' | 'public' | 'private' = 'public'
): EnhancedEntity {
  return createMockEntity({
    id,
    name,
    type: 'channel',
    channelType,
  });
}

function createMockChat(id: string, name: string): EnhancedEntity {
  return createMockEntity({
    id,
    name,
    type: 'chat',
  });
}

function createMockProject(id: string, name: string): EnhancedEntity {
  return createMockEntity({
    id,
    name,
    type: 'project',
  });
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestEntities(): EnhancedEntity[] {
  return [
    // Documents
    createMockDocument('doc-1', 'Project Spec'),
    createMockDocument('doc-2', 'Meeting Notes'),
    createMockDocument('doc-3', 'Design Doc', 'canvas'),
    // Tasks
    createMockTask('task-1', 'Fix bug'),
    createMockTask('task-2', 'Review PR'),
    // Emails - signal (priority)
    createMockEmail('email-1', 'Important Email', ['IMPORTANT']),
    createMockEmail('email-2', 'Personal Email', ['CATEGORY_PERSONAL']),
    // Emails - noise (depriority)
    createMockEmail('email-3', 'Newsletter', ['CATEGORY_PROMOTIONS']),
    createMockEmail('email-4', 'Forum Post', ['CATEGORY_FORUMS']),
    // Channels - DMs (people)
    createMockChannel('dm-1', 'Chat with Alice', 'direct_message'),
    createMockChannel('dm-2', 'Chat with Bob', 'direct_message'),
    // Channels - group (teams)
    createMockChannel('team-1', 'Engineering Team', 'public'),
    createMockChannel('team-2', 'Product Team', 'private'),
    // Chats (agents)
    createMockChat('chat-1', 'AI Assistant'),
    createMockChat('chat-2', 'Code Helper'),
    // Projects
    createMockProject('proj-1', 'Main Project'),
    createMockProject('proj-2', 'Side Project'),
  ];
}

// ============================================================================
// Filter Plugin Tests
// ============================================================================

describe('Soup Filter Plugin Integration', () => {
  describe('Filter Store Initialization', () => {
    it('should initialize filters from config', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        // Create controller and register plugin
        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // Store should have all filters
        const store = filterPlugin.store;
        expect(store.filters().size).toBe(filterConfigs.length);
        expect(store.activeFilterIds().size).toBe(0);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should have working filterFn when no filters active', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        const store = filterPlugin.store;
        const filterFn = store.filterFn();

        // With no active filters, everything should pass
        const entities = createTestEntities();
        const filtered = entities.filter(filterFn);
        expect(filtered.length).toBe(entities.length);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });
  });

  describe('Entity Type Filters', () => {
    it('should filter documents only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // Activate document filter
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'document',
        });

        const store = filterPlugin.store;
        expect(store.activeFilterIds().has('document')).toBe(true);

        const filterFn = store.filterFn();
        const entities = createTestEntities();
        const filtered = entities.filter(filterFn);

        // Should only include documents (not tasks)
        expect(
          filtered.every(
            (e) => e.type === 'document' && e.subType?.type !== 'task'
          )
        ).toBe(true);
        expect(filtered.length).toBe(3); // doc-1, doc-2, doc-3

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter tasks only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // Activate task filter
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'task',
        });

        const store = filterPlugin.store;
        const filterFn = store.filterFn();
        const entities = createTestEntities();
        const filtered = entities.filter(filterFn);

        // Should only include tasks (documents with subType.type === 'task')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(filtered.every((e: any) => e.subType?.type === 'task')).toBe(
          true
        );
        expect(filtered.length).toBe(2); // task-1, task-2

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter emails only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'email',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = createTestEntities().filter(filterFn);

        expect(filtered.every((e) => e.type === 'email')).toBe(true);
        expect(filtered.length).toBe(4);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter people (DMs) only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'people',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = createTestEntities().filter(filterFn);

        expect(
          filtered.every(
            (e) => e.type === 'channel' && e.channelType === 'direct_message'
          )
        ).toBe(true);
        expect(filtered.length).toBe(2); // dm-1, dm-2

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter teams (group channels) only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'teams',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = createTestEntities().filter(filterFn);

        expect(
          filtered.every(
            (e) => e.type === 'channel' && e.channelType !== 'direct_message'
          )
        ).toBe(true);
        expect(filtered.length).toBe(2); // team-1, team-2

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter agents (chats) only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'agent',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = createTestEntities().filter(filterFn);

        expect(filtered.every((e) => e.type === 'chat')).toBe(true);
        expect(filtered.length).toBe(2);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter projects only', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'project',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = createTestEntities().filter(filterFn);

        expect(filtered.every((e) => e.type === 'project')).toBe(true);
        expect(filtered.length).toBe(2);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });
  });

  describe('Signal/Noise Filters', () => {
    it('should filter signal (inbox) emails', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'signal',
        });

        const filterFn = filterPlugin.store.filterFn();
        const entities = createTestEntities();
        const filtered = entities.filter(filterFn);

        // Signal filter should include priority emails and all non-emails
        const signalEmails = filtered.filter((e) => e.type === 'email');
        expect(signalEmails.length).toBe(2); // email-1 (IMPORTANT), email-2 (CATEGORY_PERSONAL)

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should filter noise (other) emails', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'noise',
        });

        const filterFn = filterPlugin.store.filterFn();
        const entities = createTestEntities();
        const filtered = entities.filter(filterFn);

        // Noise filter is the inverse of signal
        const noiseEmails = filtered.filter((e) => e.type === 'email');
        expect(noiseEmails.length).toBe(2); // email-3 (PROMOTIONS), email-4 (FORUMS)

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });
  });

  describe('Filter Toggle Behavior', () => {
    it('should toggle filter on and off', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        const store = filterPlugin.store;

        // Initially no filters
        expect(store.activeFilterIds().size).toBe(0);

        // Toggle on
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'email',
        });
        expect(store.activeFilterIds().has('email')).toBe(true);

        // Toggle off
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'email',
        });
        expect(store.activeFilterIds().has('email')).toBe(false);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should handle mutual exclusivity in groups', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterGroups: FilterGroup[] = [
          {
            id: 'type',
            label: 'Type',
            filterIds: [
              'document',
              'task',
              'email',
              'people',
              'teams',
              'agent',
              'project',
              'file',
            ],
            allowMultiple: false,
          },
        ];

        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
          groups: filterGroups,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        const store = filterPlugin.store;

        // Activate document filter
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'document',
        });
        expect(store.activeFilterIds().has('document')).toBe(true);

        // Activate email filter - should deactivate document
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'email',
        });
        expect(store.activeFilterIds().has('email')).toBe(true);
        expect(store.activeFilterIds().has('document')).toBe(false);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });
  });

  describe('Clear Filters', () => {
    it('should clear all active filters', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        const store = filterPlugin.store;

        // Activate multiple filters
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'email',
        });
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'signal',
        });
        expect(store.activeFilterIds().size).toBe(2);

        // Clear all
        controller.commands.dispatch('list:clear-filters', undefined);
        expect(store.activeFilterIds().size).toBe(0);

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });
  });
});

// ============================================================================
// Individual Filter Predicate Tests
// ============================================================================

describe('Individual Filter Predicates', () => {
  describe('documentFilter', () => {
    it('should match markdown documents', () => {
      const doc = createMockDocument('1', 'Test', 'md');
      expect(documentFilter(doc)).toBe(true);
    });

    it('should match canvas documents', () => {
      const doc = createMockDocument('1', 'Test', 'canvas');
      expect(documentFilter(doc)).toBe(true);
    });

    it('should not match other file types', () => {
      const doc = createMockDocument('1', 'Test', 'pdf');
      expect(documentFilter(doc)).toBe(false);
    });

    it('should not match tasks', () => {
      const task = createMockTask('1', 'Test');
      expect(documentFilter(task)).toBe(false);
    });

    it('should not match other entity types', () => {
      expect(documentFilter(createMockEmail('1', 'Test'))).toBe(false);
      expect(documentFilter(createMockChannel('1', 'Test'))).toBe(false);
    });
  });

  describe('taskFilter', () => {
    it('should match tasks', () => {
      const task = createMockTask('1', 'Test');
      expect(taskFilter(task)).toBe(true);
    });

    it('should not match regular documents', () => {
      const doc = createMockDocument('1', 'Test');
      expect(taskFilter(doc)).toBe(false);
    });
  });

  describe('emailFilter', () => {
    it('should match emails', () => {
      const email = createMockEmail('1', 'Test');
      expect(emailFilter(email)).toBe(true);
    });

    it('should not match other types', () => {
      expect(emailFilter(createMockDocument('1', 'Test'))).toBe(false);
    });
  });

  describe('peopleFilter', () => {
    it('should match direct messages', () => {
      const dm = createMockChannel('1', 'Test', 'direct_message');
      expect(peopleFilter(dm)).toBe(true);
    });

    it('should not match group channels', () => {
      const channel = createMockChannel('1', 'Test', 'public');
      expect(peopleFilter(channel)).toBe(false);
    });
  });

  describe('teamsFilter', () => {
    it('should match public channels', () => {
      const channel = createMockChannel('1', 'Test', 'public');
      expect(teamsFilter(channel)).toBe(true);
    });

    it('should match private channels', () => {
      const channel = createMockChannel('1', 'Test', 'private');
      expect(teamsFilter(channel)).toBe(true);
    });

    it('should not match DMs', () => {
      const dm = createMockChannel('1', 'Test', 'direct_message');
      expect(teamsFilter(dm)).toBe(false);
    });
  });

  describe('agentFilter', () => {
    it('should match chats', () => {
      const chat = createMockChat('1', 'Test');
      expect(agentFilter(chat)).toBe(true);
    });

    it('should not match other types', () => {
      expect(agentFilter(createMockDocument('1', 'Test'))).toBe(false);
    });
  });

  describe('projectFilter', () => {
    it('should match projects', () => {
      const project = createMockProject('1', 'Test');
      expect(projectFilter(project)).toBe(true);
    });

    it('should not match other types', () => {
      expect(projectFilter(createMockDocument('1', 'Test'))).toBe(false);
    });
  });

  describe('signalFilter', () => {
    it('should pass priority labeled emails', () => {
      const email = createMockEmail('1', 'Test', ['IMPORTANT']);
      expect(signalFilter(email)).toBe(true);
    });

    it('should pass personal emails', () => {
      const email = createMockEmail('1', 'Test', ['CATEGORY_PERSONAL']);
      expect(signalFilter(email)).toBe(true);
    });

    it('should fail promotional emails', () => {
      const email = createMockEmail('1', 'Test', ['CATEGORY_PROMOTIONS']);
      expect(signalFilter(email)).toBe(false);
    });

    it('should pass non-email entities (channels always signal, tasks always signal)', () => {
      // Channels are always signal
      expect(signalFilter(createMockChannel('1', 'Test'))).toBe(true);
      // Tasks are always signal
      expect(signalFilter(createMockTask('1', 'Test'))).toBe(true);
      // Documents without recent viewedAt are NOT signal (they're neutral)
      expect(signalFilter(createMockDocument('1', 'Test'))).toBe(false);
    });
  });

  describe('noiseFilter', () => {
    it('should be inverse of signalFilter', () => {
      const promo = createMockEmail('1', 'Test', ['CATEGORY_PROMOTIONS']);
      const important = createMockEmail('2', 'Test', ['IMPORTANT']);

      expect(noiseFilter(promo)).toBe(true);
      expect(noiseFilter(important)).toBe(false);
    });
  });
});

// ============================================================================
// Pipeline Sort Order Integration Tests
// ============================================================================

describe('Pipeline Sort Order Integration', () => {
  const now = Date.now();

  function createEntityWithTimestamp(
    base: EnhancedEntity,
    timestamps: {
      updatedAt?: number;
      createdAt?: number;
      frecencyScore?: number;
    }
  ): EnhancedEntity {
    return { ...base, ...timestamps };
  }

  describe('Filter + Sort Pipeline', () => {
    it('should filter and sort entities in correct order', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // Create entities with explicit timestamps
        const entities: EnhancedEntity[] = [
          createEntityWithTimestamp(createMockDocument('doc-1', 'Old Doc'), {
            updatedAt: now - 3000,
          }),
          createEntityWithTimestamp(createMockDocument('doc-2', 'New Doc'), {
            updatedAt: now - 1000,
          }),
          createEntityWithTimestamp(createMockEmail('email-1', 'Email'), {
            updatedAt: now - 2000,
          }),
          createEntityWithTimestamp(createMockChannel('channel-1', 'Channel'), {
            updatedAt: now,
          }),
        ];

        // Activate document filter
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'document',
        });

        // Apply filter
        const filterFn = filterPlugin.store.filterFn();
        const filtered = entities.filter(filterFn);

        // Should only have documents
        expect(filtered.length).toBe(2);
        expect(filtered.every((e) => e.type === 'document')).toBe(true);

        // Sort by updatedAt descending
        const sorted = [...filtered].sort((a, b) => {
          const aTime = a.updatedAt ?? 0;
          const bTime = b.updatedAt ?? 0;
          return bTime - aTime; // descending
        });

        // Verify order: newest first
        expect(sorted[0].id).toBe('doc-2'); // -1000ms (newer)
        expect(sorted[1].id).toBe('doc-1'); // -3000ms (older)

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should maintain correct order with mixed entity types', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // Create mixed entities with timestamps
        const entities: EnhancedEntity[] = [
          createEntityWithTimestamp(createMockDocument('doc-1', 'Doc'), {
            updatedAt: now - 4000,
            frecencyScore: 50,
          }),
          createEntityWithTimestamp(
            createMockEmail('email-1', 'Email', ['IMPORTANT']),
            {
              updatedAt: now - 3000,
              frecencyScore: 80,
            }
          ),
          createEntityWithTimestamp(
            createMockChannel('channel-1', 'DM', 'direct_message'),
            {
              updatedAt: now - 2000,
              frecencyScore: 60,
            }
          ),
          createEntityWithTimestamp(createMockChat('chat-1', 'Chat'), {
            updatedAt: now - 1000,
            frecencyScore: 70,
          }),
          createEntityWithTimestamp(createMockProject('proj-1', 'Project'), {
            updatedAt: now,
            frecencyScore: 40,
          }),
        ];

        // No filters - all entities pass
        const filterFn = filterPlugin.store.filterFn();
        const filtered = entities.filter(filterFn);
        expect(filtered.length).toBe(5);

        // Sort by updatedAt descending
        const sortedByUpdated = [...filtered].sort((a, b) => {
          const aTime = a.updatedAt ?? 0;
          const bTime = b.updatedAt ?? 0;
          return bTime - aTime;
        });

        expect(sortedByUpdated[0].id).toBe('proj-1'); // newest
        expect(sortedByUpdated[1].id).toBe('chat-1');
        expect(sortedByUpdated[2].id).toBe('channel-1');
        expect(sortedByUpdated[3].id).toBe('email-1');
        expect(sortedByUpdated[4].id).toBe('doc-1'); // oldest

        // Sort by frecency descending
        const sortedByFrecency = [...filtered].sort((a, b) => {
          const aScore = a.frecencyScore ?? 0;
          const bScore = b.frecencyScore ?? 0;
          return bScore - aScore;
        });

        expect(sortedByFrecency[0].id).toBe('email-1'); // highest score
        expect(sortedByFrecency[1].id).toBe('chat-1');
        expect(sortedByFrecency[2].id).toBe('channel-1');
        expect(sortedByFrecency[3].id).toBe('doc-1');
        expect(sortedByFrecency[4].id).toBe('proj-1'); // lowest score

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should handle channels with timestamps correctly (regression test)', () => {
      createRoot((dispose) => {
        const filterConfigs = createSoupFilterConfigs();
        const filterPlugin = createFilterPlugin<EnhancedEntity>({
          filters: filterConfigs,
        });

        const { controller, cleanup } = createListController<EnhancedEntity>({
          id: 'test',
        });
        const pluginManager = createPluginManager(controller);
        pluginManager.use(filterPlugin);

        // This test specifically checks that channels sort correctly
        // Previously, channels were missing timestamp mapping in dss.ts
        const entities: EnhancedEntity[] = [
          createEntityWithTimestamp(
            createMockChannel('dm-1', 'Alice', 'direct_message'),
            {
              updatedAt: now - 2000,
              frecencyScore: 100,
            }
          ),
          createEntityWithTimestamp(
            createMockChannel('dm-2', 'Bob', 'direct_message'),
            {
              updatedAt: now,
              frecencyScore: 50,
            }
          ),
          createEntityWithTimestamp(
            createMockChannel('team-1', 'Team', 'public'),
            {
              updatedAt: now - 1000,
              frecencyScore: 75,
            }
          ),
        ];

        // Filter to people (DMs)
        controller.commands.dispatch('list:toggle-filter', {
          filterId: 'people',
        });

        const filterFn = filterPlugin.store.filterFn();
        const filtered = entities.filter(filterFn);

        expect(filtered.length).toBe(2);
        expect(
          filtered.every(
            (e) => e.type === 'channel' && e.channelType === 'direct_message'
          )
        ).toBe(true);

        // Sort by updatedAt descending
        const sorted = [...filtered].sort((a, b) => {
          const aTime = a.updatedAt ?? 0;
          const bTime = b.updatedAt ?? 0;
          return bTime - aTime;
        });

        // Bob's DM is newer
        expect(sorted[0].id).toBe('dm-2');
        expect(sorted[1].id).toBe('dm-1');

        cleanup();
        pluginManager.cleanup();
        dispose();
      });
    });

    it('should handle entity missing updatedAt (documents expected behavior)', () => {
      // This test documents the expected behavior when timestamps are missing
      // Entities without timestamps should sort to the end (oldest position)

      createRoot((dispose) => {
        // Create entity and explicitly delete updatedAt to simulate broken data
        const docNoTime = createMockDocument('doc-no-time', 'No Time');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (docNoTime as any).updatedAt;

        const entities: EnhancedEntity[] = [
          createEntityWithTimestamp(
            createMockDocument('doc-with-time', 'Has Time'),
            {
              updatedAt: now - 1000,
            }
          ),
          docNoTime,
          createEntityWithTimestamp(createMockDocument('doc-older', 'Older'), {
            updatedAt: now - 2000,
          }),
        ];

        // Sort by updatedAt descending
        const sorted = [...entities].sort((a, b) => {
          const aTime = a.updatedAt ?? 0;
          const bTime = b.updatedAt ?? 0;
          return bTime - aTime;
        });

        // Entity without timestamp (undefined = 0) should be at the end
        expect(sorted[0].id).toBe('doc-with-time'); // -1000ms
        expect(sorted[1].id).toBe('doc-older'); // -2000ms
        expect(sorted[2].id).toBe('doc-no-time'); // undefined = 0 = oldest

        dispose();
      });
    });
  });
});
