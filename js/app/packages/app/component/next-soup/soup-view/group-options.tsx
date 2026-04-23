import type { GroupConfig } from '@app/component/next-soup/create-soup-state';
import type { SoupEntity } from './soup-view-context';
import { isTaskEntity } from '@entity';
import {
  getTaskStatusOptionId,
  getTaskPriorityOptionId,
} from '@entity/utils/task-properties';
import type { TaskEntityWithProperties } from '@entity';
import { PROPERTY_OPTION_IDS } from '@core/component/Properties/constants';

export type GroupOptionId = 'type' | 'project' | 'status' | 'priority';

const TYPE_LABELS: Record<string, string> = {
  document: 'Documents',
  email: 'Emails',
  chat: 'Chats',
  channel: 'Channels',
  call: 'Calls',
  project: 'Projects',
  automation: 'Automations',
};

const STATUS_LABELS: Record<string, string> = {
  [PROPERTY_OPTION_IDS.STATUS.NOT_STARTED]: 'Not Started',
  [PROPERTY_OPTION_IDS.STATUS.IN_PROGRESS]: 'In Progress',
  [PROPERTY_OPTION_IDS.STATUS.IN_REVIEW]: 'In Review',
  [PROPERTY_OPTION_IDS.STATUS.COMPLETED]: 'Completed',
  [PROPERTY_OPTION_IDS.STATUS.CANCELED]: 'Canceled',
};

const PRIORITY_LABELS: Record<string, string> = {
  [PROPERTY_OPTION_IDS.PRIORITY.URGENT]: 'Urgent',
  [PROPERTY_OPTION_IDS.PRIORITY.HIGH]: 'High',
  [PROPERTY_OPTION_IDS.PRIORITY.MEDIUM]: 'Medium',
  [PROPERTY_OPTION_IDS.PRIORITY.LOW]: 'Low',
};

export const GROUP_CONFIGS: Record<GroupOptionId, GroupConfig<SoupEntity>> = {
  type: {
    id: 'type',
    label: 'Type',
    getValue: (e) => e.type,
    getLabel: (v) => TYPE_LABELS[v as string] ?? String(v),
  },
  project: {
    id: 'project',
    label: 'Project',
    getValue: (e) => ('projectId' in e ? (e.projectId ?? 'none') : 'none'),
    getLabel: (v) => (v === 'none' ? 'No Project' : String(v)),
  },
  status: {
    id: 'status',
    label: 'Status',
    getValue: (e) => {
      if (!isTaskEntity(e)) return 'non-task';
      const statusId = getTaskStatusOptionId(e as TaskEntityWithProperties);
      return statusId ?? 'none';
    },
    getLabel: (v) => {
      if (v === 'non-task') return 'Non-Tasks';
      if (v === 'none') return 'No Status';
      return STATUS_LABELS[v as string] ?? String(v);
    },
  },
  priority: {
    id: 'priority',
    label: 'Priority',
    getValue: (e) => {
      if (!isTaskEntity(e)) return 'non-task';
      const priorityId = getTaskPriorityOptionId(e as TaskEntityWithProperties);
      return priorityId ?? 'none';
    },
    getLabel: (v) => {
      if (v === 'non-task') return 'Non-Tasks';
      if (v === 'none') return 'No Priority';
      return PRIORITY_LABELS[v as string] ?? String(v);
    },
  },
};

export interface GroupOption {
  value: GroupOptionId | 'none';
  label: string;
}

export const GROUP_OPTIONS: GroupOption[] = [
  { value: 'none', label: 'None' },
  { value: 'type', label: 'Type' },
  { value: 'project', label: 'Project' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
];

export const TASK_GROUP_OPTIONS: GroupOption[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
];

export const DEFAULT_GROUP_OPTIONS: GroupOption[] = [
  { value: 'none', label: 'None' },
  { value: 'type', label: 'Type' },
  { value: 'project', label: 'Project' },
];
