import Check from '@phosphor-icons/core/regular/check.svg';
import List from '@phosphor-icons/core/regular/list.svg';
import { For, Show } from 'solid-js';
import { BaseTool } from './BaseTool';
import { createToolRenderer } from './ToolRenderer';

const formatBoolFilter = (value: boolean | null, fallback: string) => {
  if (value === null) return fallback;
  return value ? 'yes' : 'no';
};

const listNotificationsHandler = createToolRenderer({
  name: 'ListNotifications',
  render: (ctx) => {
    const notifications = () => ctx.response?.data.notifications ?? [];
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
          count() > 0 ? (
            <div class="flex max-h-64 flex-col gap-2 overflow-auto pr-2">
              <For each={notifications()}>
                {(notification) => (
                  <div class="rounded border border-edge px-2 py-1 text-xs text-ink-muted">
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-ink">
                        {notification.eventType}
                      </span>
                      <span class="shrink-0">
                        {notification.seen ? 'seen' : 'unseen'} ·{' '}
                        {notification.done ? 'done' : 'open'}
                      </span>
                    </div>
                    <div class="truncate">
                      {notification.entityType}: {notification.entityId}
                    </div>
                  </div>
                )}
              </For>
            </div>
          ) : undefined
        }
      >
        <div class="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span>
            List notifications · done:{' '}
            <span class="text-accent">
              {formatBoolFilter(ctx.tool.data.done, 'open')}
            </span>{' '}
            · seen:{' '}
            <span class="text-accent">
              {formatBoolFilter(ctx.tool.data.seen, 'any')}
            </span>
            <Show when={ctx.tool.data.importantEmailsOnly}>
              <span>
                {' '}
                · <span class="text-accent">important email only</span>
              </span>
            </Show>
          </span>
          <Show when={statusText()}>
            {(text) => (
              <span class="shrink-0 text-xs text-ink-extra-muted">
                {text()}
              </span>
            )}
          </Show>
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
      <Show when={ctx.response}>
        {(response) => (
          <span class="text-ink-extra-muted">
            {' '}
            · updated {response().data.count}
          </span>
        )}
      </Show>
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
      <Show when={ctx.response}>
        {(response) => (
          <span class="text-ink-extra-muted">
            {' '}
            · updated {response().data.count}
          </span>
        )}
      </Show>
    </BaseTool>
  ),
});

export {
  listNotificationsHandler,
  markNotificationsDoneHandler,
  markNotificationsSeenHandler,
};
