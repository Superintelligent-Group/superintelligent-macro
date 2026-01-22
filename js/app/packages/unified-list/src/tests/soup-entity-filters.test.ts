/**
 * Tests for Soup Entity Type Filters
 *
 * Tests the entity type filter predicates from @soup/filterConfigs.
 * These filters are the authoritative source for entity classification.
 *
 * Note: We import directly from the source file rather than @soup
 * to avoid WASM module resolution issues in the test environment.
 */

import { describe, it, expect } from 'vitest';
import {
  documentFilter,
  taskFilter,
  emailFilter,
  peopleFilter,
  teamsFilter,
  agentFilter,
  projectFilter,
  fileFilter,
  createSoupFilterConfigs,
} from '@soup/filterConfigs';

// ============================================================================
// Test Entity Factories
// ============================================================================

import type { EntityData } from '@macro-entity';

/**
 * Minimal test entity for unit testing filter predicates.
 * Cast to EntityData since filters only check specific properties.
 */
type TestEntity = {
  id: string;
  type: 'document' | 'email' | 'channel' | 'chat' | 'project';
  name: string;
  subType?: { type: string };
  fileType?: string;
  channelType?: 'direct_message' | 'group' | 'channel';
};

/** Cast test entity to EntityData for filter testing */
const asEntity = (entity: TestEntity): EntityData =>
  entity as unknown as EntityData;

const createDocument = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'doc-1',
    type: 'document',
    name: 'Test Document',
    fileType: 'md',
    ...overrides,
  });

const createTask = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'task-1',
    type: 'document',
    name: 'Test Task',
    subType: { type: 'task' },
    fileType: 'md',
    ...overrides,
  });

const createEmail = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'email-1',
    type: 'email',
    name: 'Test Email',
    ...overrides,
  });

const createChannel = (
  channelType: 'direct_message' | 'group' | 'channel' = 'channel',
  overrides: Partial<TestEntity> = {}
): EntityData =>
  asEntity({
    id: 'channel-1',
    type: 'channel',
    name: 'Test Channel',
    channelType,
    ...overrides,
  });

const createChat = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'chat-1',
    type: 'chat',
    name: 'Test Chat',
    ...overrides,
  });

const createProject = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'project-1',
    type: 'project',
    name: 'Test Project',
    ...overrides,
  });

const createFile = (overrides: Partial<TestEntity> = {}): EntityData =>
  asEntity({
    id: 'file-1',
    type: 'document',
    name: 'Test File',
    fileType: 'pdf',
    ...overrides,
  });

// ============================================================================
// Entity Type Filter Tests
// ============================================================================

describe('Soup Entity Type Filters', () => {
  describe('documentFilter', () => {
    it('returns true for markdown documents', () => {
      expect(documentFilter(createDocument({ fileType: 'md' }))).toBe(true);
    });

    it('returns true for canvas documents', () => {
      expect(documentFilter(createDocument({ fileType: 'canvas' }))).toBe(true);
    });

    it('returns false for tasks', () => {
      expect(documentFilter(createTask())).toBe(false);
    });

    it('returns false for non-document types', () => {
      expect(documentFilter(createEmail())).toBe(false);
      expect(documentFilter(createChannel())).toBe(false);
    });

    it('returns false for non-md/canvas documents', () => {
      expect(documentFilter(createDocument({ fileType: 'pdf' }))).toBe(false);
    });
  });

  describe('taskFilter', () => {
    it('returns true for tasks', () => {
      expect(taskFilter(createTask())).toBe(true);
    });

    it('returns false for regular documents', () => {
      expect(taskFilter(createDocument())).toBe(false);
    });

    it('returns false for non-document types', () => {
      expect(taskFilter(createEmail())).toBe(false);
    });
  });

  describe('emailFilter', () => {
    it('returns true for emails', () => {
      expect(emailFilter(createEmail())).toBe(true);
    });

    it('returns false for non-emails', () => {
      expect(emailFilter(createDocument())).toBe(false);
      expect(emailFilter(createChannel())).toBe(false);
    });
  });

  describe('peopleFilter', () => {
    it('returns true for direct message channels', () => {
      expect(peopleFilter(createChannel('direct_message'))).toBe(true);
    });

    it('returns false for group channels', () => {
      expect(peopleFilter(createChannel('group'))).toBe(false);
    });

    it('returns false for non-channels', () => {
      expect(peopleFilter(createEmail())).toBe(false);
    });
  });

  describe('teamsFilter', () => {
    it('returns true for group channels', () => {
      expect(teamsFilter(createChannel('group'))).toBe(true);
    });

    it('returns true for regular channels', () => {
      expect(teamsFilter(createChannel('channel'))).toBe(true);
    });

    it('returns false for direct message channels', () => {
      expect(teamsFilter(createChannel('direct_message'))).toBe(false);
    });

    it('returns false for non-channels', () => {
      expect(teamsFilter(createEmail())).toBe(false);
    });
  });

  describe('agentFilter', () => {
    it('returns true for chats', () => {
      expect(agentFilter(createChat())).toBe(true);
    });

    it('returns false for non-chats', () => {
      expect(agentFilter(createEmail())).toBe(false);
      expect(agentFilter(createDocument())).toBe(false);
    });
  });

  describe('projectFilter', () => {
    it('returns true for projects', () => {
      expect(projectFilter(createProject())).toBe(true);
    });

    it('returns false for non-projects', () => {
      expect(projectFilter(createDocument())).toBe(false);
      expect(projectFilter(createEmail())).toBe(false);
    });
  });

  describe('fileFilter', () => {
    it('returns true for non-md/canvas documents', () => {
      expect(fileFilter(createFile({ fileType: 'pdf' }))).toBe(true);
      expect(fileFilter(createFile({ fileType: 'jpg' }))).toBe(true);
    });

    it('returns false for markdown documents', () => {
      expect(fileFilter(createDocument({ fileType: 'md' }))).toBe(false);
    });

    it('returns false for canvas documents', () => {
      expect(fileFilter(createDocument({ fileType: 'canvas' }))).toBe(false);
    });

    it('returns false for non-documents', () => {
      expect(fileFilter(createEmail())).toBe(false);
    });
  });
});

// ============================================================================
// Filter Config Tests
// ============================================================================

describe('createSoupFilterConfigs', () => {
  it('returns all expected filter configs', () => {
    const configs = createSoupFilterConfigs();

    const ids = configs.map((c) => c.id);
    expect(ids).toContain('signal');
    expect(ids).toContain('noise');
    expect(ids).toContain('unread');
    expect(ids).toContain('document');
    expect(ids).toContain('task');
    expect(ids).toContain('email');
    expect(ids).toContain('people');
    expect(ids).toContain('teams');
    expect(ids).toContain('agent');
    expect(ids).toContain('project');
    expect(ids).toContain('file');
  });

  it('assigns correct groups to filters', () => {
    const configs = createSoupFilterConfigs();

    const focusFilters = configs.filter((c) => c.group === 'focus');
    expect(focusFilters.map((c) => c.id)).toEqual(['signal', 'noise']);

    const typeFilters = configs.filter((c) => c.group === 'type');
    expect(typeFilters.length).toBe(8);
  });

  it('all filter predicates are functions', () => {
    const configs = createSoupFilterConfigs();

    for (const config of configs) {
      expect(typeof config.predicate).toBe('function');
    }
  });
});
