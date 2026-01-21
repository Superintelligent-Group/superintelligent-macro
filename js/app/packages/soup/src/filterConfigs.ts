/**
 * Soup Filter Configurations
 *
 * Filter configs for the Soup component's filter plugin.
 * Uses signal/noise filters from @soup/filters for focus classification.
 */

import type { EntityData, WithNotification } from '@macro-entity';
import { type FilterConfig, unreadFilter } from '@unified-list';
import { signalFilter, noiseFilter } from './filters';

type EnhancedEntity = WithNotification<EntityData>;

// ============================================================================
// Entity Type Filters
// ============================================================================

/** Document filter (markdown, canvas) - excludes tasks */
export function documentFilter(entity: EntityData): boolean {
  if (entity.type !== 'document') return false;
  if (entity.subType?.type === 'task') return false;
  const fileType = entity.fileType ?? '';
  return fileType === 'md' || fileType === 'canvas';
}

/** Task filter */
export function taskFilter(entity: EntityData): boolean {
  return entity.type === 'document' && entity.subType?.type === 'task';
}

/** Email filter */
export function emailFilter(entity: EntityData): boolean {
  return entity.type === 'email';
}

/** People filter (direct messages) */
export function peopleFilter(entity: EntityData): boolean {
  return entity.type === 'channel' && entity.channelType === 'direct_message';
}

/** Teams filter (group channels) */
export function teamsFilter(entity: EntityData): boolean {
  return entity.type === 'channel' && entity.channelType !== 'direct_message';
}

/** Chat/agent filter */
export function agentFilter(entity: EntityData): boolean {
  return entity.type === 'chat';
}

/** Project/folder filter */
export function projectFilter(entity: EntityData): boolean {
  return entity.type === 'project';
}

/** File filter (non-markdown documents) */
export function fileFilter(entity: EntityData): boolean {
  if (entity.type !== 'document') return false;
  const fileType = entity.fileType ?? '';
  return !['md', 'canvas'].includes(fileType);
}

// ============================================================================
// Filter Configurations
// ============================================================================

/** Create filter configs for Soup's filter plugin */
export function createSoupFilterConfigs(): FilterConfig<EnhancedEntity>[] {
  return [
    // Focus filters (mutually exclusive)
    {
      id: 'signal',
      label: 'Inbox',
      predicate: signalFilter,
      group: 'focus',
    },
    {
      id: 'noise',
      label: 'Other',
      predicate: noiseFilter,
      group: 'focus',
    },

    // Notification filters
    {
      id: 'unread',
      label: 'Unread',
      predicate: unreadFilter,
    },

    // Entity type filters (mutually exclusive)
    {
      id: 'document',
      label: 'Docs',
      predicate: documentFilter,
      group: 'type',
    },
    {
      id: 'task',
      label: 'Tasks',
      predicate: taskFilter,
      group: 'type',
    },
    {
      id: 'email',
      label: 'Mail',
      predicate: emailFilter,
      group: 'type',
    },
    {
      id: 'people',
      label: 'People',
      predicate: peopleFilter,
      group: 'type',
    },
    {
      id: 'teams',
      label: 'Teams',
      predicate: teamsFilter,
      group: 'type',
    },
    {
      id: 'agent',
      label: 'Agents',
      predicate: agentFilter,
      group: 'type',
    },
    {
      id: 'project',
      label: 'Folders',
      predicate: projectFilter,
      group: 'type',
    },
    {
      id: 'file',
      label: 'Files',
      predicate: fileFilter,
      group: 'type',
    },
  ];
}

