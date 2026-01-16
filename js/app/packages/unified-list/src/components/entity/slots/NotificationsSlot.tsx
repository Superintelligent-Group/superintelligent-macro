/**
 * Notifications Slot - Unrolled notifications display.
 */

import { Show, For, createSignal, type JSX, type ParentProps } from 'solid-js';
import type { EntityData, Notification } from '@macro-entity';
import type {
  SlotProps,
  SlotRenderer,
  NotificationClickHandler,
} from '../types';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from '@core/component/LexicalMarkdown/theme';
import { tryMacroId, useDisplayName } from '@core/user';
import { UserIcon } from '@core/component/UserIcon';
import { tryToTypedNotification } from '@notifications';
import { formatTimestamp } from './TimestampSlot';

export type NotificationsSlotConfig = {
  maxVisible?: number;
  collapsible?: boolean;
  onNotificationClick?: NotificationClickHandler<EntityData>;
  /** Called when expand/collapse state changes - use to trigger virtualizer re-measurement */
  onToggleExpand?: () => void;
};

/** Thread border connector line */
function ThreadBorder(): JSX.Element {
  return (
    <div
      class="absolute left-[calc(0.5rem+1px)] w-[1px] border-l border-edge-muted -top-0.75"
      style={{ height: '6px' }}
    />
  );
}

/** Collapsible list row wrapper */
function CollapsibleListRow(
  props: ParentProps<{
    onClick?: (e: MouseEvent) => void;
    classList?: Record<string, boolean>;
    showThreadBorder?: boolean;
  }>
): JSX.Element {
  return (
    <div
      class="relative flex gap-1 items-center min-w-0 h-8 transition-all"
      classList={{
        'hover:bg-hover/50 hover:opacity-85': !!props.onClick,
        ...props.classList,
      }}
      onClick={(e) => props.onClick?.(e)}
    >
      <Show when={props.showThreadBorder}>
        <ThreadBorder />
      </Show>
      {props.children}
    </div>
  );
}

/** Single notification row */
function NotificationRow(props: {
  notification: Notification;
  onClick?: NotificationClickHandler<EntityData>;
  entity: EntityData;
}): JSX.Element {
  const [userName] = useDisplayName(
    tryMacroId(props.notification.senderId ?? '')
  );

  const ActionContent = () => {
    if (
      props.notification.notificationEventType === 'document_mention' ||
      props.notification.notificationEventType === 'channel_message_document'
    ) {
      return 'shared';
    }
    if (props.notification.notificationEventType === 'task_assigned') {
      return 'assigned to you';
    }

    const metadata = tryToTypedNotification(
      props.notification
    )?.notificationMetadata;
    if (!metadata || !('messageContent' in metadata)) return '';

    return 'message';
  };

  const MessageContent = () => {
    if (
      props.notification.notificationEventType === 'document_mention' ||
      props.notification.notificationEventType === 'channel_message_document'
    ) {
      return '';
    }

    const metadata = tryToTypedNotification(
      props.notification
    )?.notificationMetadata;
    if (
      !metadata ||
      !('messageContent' in metadata) ||
      metadata.messageContent === undefined
    )
      return '';

    return (
      <Show
        when={metadata.messageContent.trim()}
        fallback={<span class="italic text-ink-disabled">Attached items</span>}
      >
        {(content) => (
          <StaticMarkdown
            markdown={content()}
            theme={unifiedListMarkdownTheme}
            singleLine={true}
          />
        )}
      </Show>
    );
  };

  return (
    <CollapsibleListRow
      showThreadBorder
      onClick={
        props.onClick
          ? (e) => {
              props.onClick?.({
                type: 'entity',
                entity: {
                  ...props.entity,
                  notification: props.notification,
                } as EntityData & { notification: Notification },
                event: e,
              });
            }
          : undefined
      }
      classList={{
        'opacity-70': props.notification.viewedAt !== null,
      }}
    >
      <div class="flex size-5 shrink-0 items-center justify-center mr-1">
        <UserIcon id={props.notification.senderId!} size="xs" />
      </div>
      <div class="flex gap-1 text-sm w-full min-w-0 overflow-hidden items-baseline">
        <div class="text-sm w-[20cqw] shrink-0 truncate min-w-0">
          {userName()}{' '}
          <span class="opacity-70 uppercase font-mono text-[0.625rem] ml-2">
            {ActionContent()}
          </span>
        </div>
        <MessageContent />
      </div>
      <div class="shrink-0 font-mono text-xs uppercase text-ink-extra-muted ml-2">
        {formatTimestamp(props.notification.createdAt)}
      </div>
    </CollapsibleListRow>
  );
}

/** Collapsible list component */
function CollapsibleList<T>(props: {
  items: T[];
  visibleCount?: number;
  children: (item: T) => JSX.Element;
  onToggleExpand?: () => void;
}): JSX.Element {
  const [showAll, setShowAll] = createSignal(false);
  const visibleCount = () => props.visibleCount ?? 3;

  const visibleItems = () => {
    if (props.items.length <= visibleCount() || showAll()) {
      return props.items;
    }
    return props.items.slice(0, visibleCount());
  };

  const hasMore = () => props.items.length > visibleCount();

  const handleToggle = (e: MouseEvent) => {
    e.stopPropagation();
    setShowAll((prev) => !prev);
    // Notify parent that height may have changed
    props.onToggleExpand?.();
  };

  return (
    <>
      <For each={visibleItems()}>{(item) => props.children(item)}</For>
      <Show when={hasMore()}>
        <div class="h-5">
          <ThreadBorder />
          <button
            class="block w-fit px-2 py-0.5 text-[10px] border border-edge uppercase font-mono hover:font-medium"
            onClick={handleToggle}
            data-blocks-navigation
          >
            <Show when={!showAll()} fallback={<>Collapse</>}>
              + {props.items.length - visibleCount()} More
            </Show>
          </button>
        </div>
      </Show>
    </>
  );
}

/** Notifications slot component */
export function NotificationsSlot<T extends EntityData>(
  props: SlotProps<T> & NotificationsSlotConfig
): JSX.Element {
  const hasNotifications = () =>
    !!props.entity.notifications && props.entity.notifications().length > 0;

  const notDoneNotifications = () => {
    const notifications = props.entity.notifications?.();
    if (!notifications) return [];
    return notifications.filter(({ done }) => !done);
  };

  return (
    <Show when={hasNotifications() && notDoneNotifications().length > 0}>
      <div class="relative col-2 col-end-4 pb-2 @max-md/uList:col-auto @max-md/uList:w-full @max-md/uList:mt-1">
        <CollapsibleList
          items={notDoneNotifications()}
          visibleCount={props.maxVisible ?? 3}
          onToggleExpand={props.onToggleExpand}
        >
          {(notification) => (
            <NotificationRow
              notification={notification}
              onClick={props.onNotificationClick}
              entity={props.entity}
            />
          )}
        </CollapsibleList>
      </div>
    </Show>
  );
}

/** Factory function to create notifications slot renderer */
export function createNotificationsSlot<T extends EntityData>(
  config: NotificationsSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <NotificationsSlot
      {...props}
      maxVisible={config.maxVisible ?? 3}
      collapsible={config.collapsible ?? true}
      onNotificationClick={config.onNotificationClick}
      onToggleExpand={config.onToggleExpand}
    />
  );
}
