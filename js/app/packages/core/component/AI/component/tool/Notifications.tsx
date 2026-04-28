import { Entity, type EntityData } from '@entity';
import CaretRight from '@icon/regular/caret-right.svg?component-solid';
import Check from '@phosphor-icons/core/regular/check.svg';
import List from '@phosphor-icons/core/regular/list.svg';
import {
  getMostRecentNotification,
  stackNotifications,
  type NotificationStack,
  type UnifiedNotification,
} from '@notifications';
import type {
  ListNotifications as ListNotificationsTool,
  ListNotificationsResponse,
} from '@service-cognition/generated/tools/types';
import { createSignal, For, Show } from 'solid-js';
import { BaseTool } from './BaseTool';
import { createToolRenderer } from './ToolRenderer';

type NotificationItem = ListNotificationsResponse['notifications'][number];
type NotificationFilterType = NonNullable<
  ListNotificationsTool['includeTypes']
>[number];

const NOTIFICATION_TYPE_LABELS: Record<NotificationFilterType, string> = {
  email: 'emails',
  message: 'messages',
  channel: 'channels',
  document: 'documents',
  project: 'projects',
  chat: 'chats',
  call: 'calls',
  task: 'tasks',
};

const formatList = (items: string[]) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
};

const formatNotificationFilters = (filters: ListNotificationsTool) => {
  const statusFilters = [filters.done ? 'done' : 'not done'];
  if (filters.seen !== null) {
    statusFilters.push(filters.seen ? 'seen' : 'unseen');
  }

  let text = `filtered by ${formatList(statusFilters)}`;

  if (filters.includeTypes?.length) {
    text += ` in ${formatList(
      filters.includeTypes.map((type) => NOTIFICATION_TYPE_LABELS[type])
    )}`;
  }

  if (filters.entities?.length) {
    text += ` for ${filters.entities.length} ${
      filters.entities.length === 1 ? 'entity' : 'entities'
    }`;
  }

  if (filters.importantEmailsOnly) {
    text += ' with important emails only';
  }

  return text;
};

const toUnifiedNotification = (
  notification: NotificationItem
): UnifiedNotification => {
  const metadata = notification.metadata;
  const notificationMetadata =
    metadata &&
    typeof metadata === 'object' &&
    'tag' in metadata &&
    'content' in metadata
      ? metadata
      : {
          tag: notification.eventType,
          content: metadata,
        };

  return {
    id: notification.id,
    entity_id: notification.entityId,
    entity_type: notification.entityType,
    created_at: notification.createdAt,
    updated_at: notification.createdAt,
    viewed_at: notification.seen ? notification.createdAt : undefined,
    done: notification.done,
    sent: true,
    notification_event_type: notification.eventType,
    notification_metadata: notificationMetadata,
    sender_id: notification.senderId ?? undefined,
  } as UnifiedNotification;
};

const toNotificationEntity = (stack: NotificationStack): EntityData => {
  const notification = getMostRecentNotification(stack);

  return {
    id: notification.entity_id,
    name: notification.notification_event_type,
    ownerId: '',
    type: 'document',
  } as EntityData;
};

const listNotificationsHandler = createToolRenderer({
  name: 'ListNotifications',
  render: (ctx) => {
    const [isExpanded, setIsExpanded] = createSignal(false);
    const notifications = () => ctx.response?.data.notifications ?? [];
    const stacks = () =>
      stackNotifications(notifications().map(toUnifiedNotification));
    const count = () => notifications().length;
    const statusText = () => {
      if (!ctx.response) return undefined;
      if (count() === 0) return 'No notifications';
      if (count() === 1) return '1 notification';
      return `${count()} notifications`;
    };

    return (
      <BaseTool
        icon={List}
        renderContext={ctx.renderContext}
        type="call"
        response={
          count() > 0 && isExpanded() ? (
            <div class="flex max-h-64 flex-col overflow-auto pr-2 text-xs">
              <For each={stacks()}>
                {(stack) => (
                  <Entity.Notification.StackRow
                    stack={stack}
                    entity={toNotificationEntity(stack)}
                    showMarkDone={false}
                  />
                )}
              </For>
            </div>
          ) : undefined
        }
      >
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="flex min-w-0 items-center justify-between gap-3">
            <span>List notifications</span>
            <div class="flex shrink-0 items-center gap-1">
              <Show when={statusText()}>
                {(text) => (
                  <span class="text-xs text-ink-extra-muted">{text()}</span>
                )}
              </Show>
              <Show when={count() > 0}>
                <button
                  type="button"
                  class="shrink-0 p-1 text-ink-muted hover:text-ink"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsExpanded((expanded) => !expanded);
                  }}
                >
                  <CaretRight
                    class="h-4 w-4 transition-transform"
                    classList={{
                      'rotate-90': isExpanded(),
                    }}
                  />
                </button>
              </Show>
            </div>
          </div>
          <div class="min-w-0 truncate text-xs text-ink-extra-muted">
            {formatNotificationFilters(ctx.tool.data)}
          </div>
        </div>
      </BaseTool>
    );
  },
});

const markNotificationsSeenHandler = createToolRenderer({
  name: 'MarkNotificationsSeen',
  render: (ctx) => (
    <BaseTool icon={Check} renderContext={ctx.renderContext} type="call">
      Mark{' '}
      <span class="text-accent">{ctx.tool.data.notificationIds.length}</span>{' '}
      notification{ctx.tool.data.notificationIds.length === 1 ? '' : 's'} seen
    </BaseTool>
  ),
});

const markNotificationsDoneHandler = createToolRenderer({
  name: 'MarkNotificationsDone',
  render: (ctx) => (
    <BaseTool icon={Check} renderContext={ctx.renderContext} type="call">
      Mark{' '}
      <span class="text-accent">{ctx.tool.data.notificationIds.length}</span>{' '}
      notification{ctx.tool.data.notificationIds.length === 1 ? '' : 's'}{' '}
      {ctx.tool.data.done ? 'done' : 'not done'}
    </BaseTool>
  ),
});

export {
  listNotificationsHandler,
  markNotificationsDoneHandler,
  markNotificationsSeenHandler,
};
