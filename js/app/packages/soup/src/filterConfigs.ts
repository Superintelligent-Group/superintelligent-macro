/**
 * Soup Filter Configurations
 *
 * Filter configs for the Soup component's filter plugin.
 * Uses signal/noise filters from @soup/filters for focus classification.
 */

import type { EntityData, WithNotification } from '@macro-entity';
import type { FilterConfig } from '@unified-list';
import { signalFilter, noiseFilter } from './filters';

type EnhancedEntity = WithNotification<EntityData>;

// ============================================================================
// Notification Filters
// ============================================================================

/** Unread filter - entity has unread content */
function unreadFilter(entity: EnhancedEntity): boolean {
  if (entity.type === 'email') {
    return !entity.isRead;
  }
  return entity.notifications?.()?.some((n) => !n.viewedAt) ?? false;
}

// ============================================================================
// Entity Type Filters
// ============================================================================

/** Document filter (markdown, canvas) - excludes tasks */
function documentFilter(entity: EntityData): boolean {
  if (entity.type !== 'document') return false;
  if (entity.subType?.type === 'task') return false;
  const fileType = entity.fileType ?? '';
  return fileType === 'md' || fileType === 'canvas';
}

/** Task filter */
function taskFilter(entity: EntityData): boolean {
  return entity.type === 'document' && entity.subType?.type === 'task';
}

/** Email filter */
function emailFilter(entity: EntityData): boolean {
  return entity.type === 'email';
}

/** People filter (direct messages) */
function peopleFilter(entity: EntityData): boolean {
  return entity.type === 'channel' && entity.channelType === 'direct_message';
}

/** Teams filter (group channels) */
function teamsFilter(entity: EntityData): boolean {
  return entity.type === 'channel' && entity.channelType !== 'direct_message';
}

/** Chat/agent filter */
function agentFilter(entity: EntityData): boolean {
  return entity.type === 'chat';
}

/** Project/folder filter */
function projectFilter(entity: EntityData): boolean {
  return entity.type === 'project';
}

/** File filter (non-markdown documents) */
function fileFilter(entity: EntityData): boolean {
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
      active: false,
      group: 'focus',
    },
    {
      id: 'noise',
      label: 'Other',
      predicate: noiseFilter,
      active: false,
      group: 'focus',
    },

    // Notification filters
    {
      id: 'unread',
      label: 'Unread',
      predicate: unreadFilter,
      active: false,
    },

    // Entity type filters (mutually exclusive)
    {
      id: 'document',
      label: 'Docs',
      predicate: documentFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'task',
      label: 'Tasks',
      predicate: taskFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'email',
      label: 'Mail',
      predicate: emailFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'people',
      label: 'People',
      predicate: peopleFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'teams',
      label: 'Teams',
      predicate: teamsFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'agent',
      label: 'Agents',
      predicate: agentFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'project',
      label: 'Folders',
      predicate: projectFilter,
      active: false,
      group: 'type',
    },
    {
      id: 'file',
      label: 'Files',
      predicate: fileFilter,
      active: false,
      group: 'type',
    },
  ];
}

/** Create filter groups */
export function createSoupFilterGroups() {
  return [
    {
      id: 'focus',
      label: 'Focus',
      allowMultiple: false, // Mutually exclusive
    },
    {
      id: 'type',
      label: 'Type',
      allowMultiple: false, // Mutually exclusive
    },
  ];
}
