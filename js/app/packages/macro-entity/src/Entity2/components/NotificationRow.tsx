import {
  isChannelMessageReply,
  tryToTypedNotification,
  type NotificationStack,
  type TypedNotification,
} from '@notifications';
import { For, Match, Show, Switch, createMemo, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { tryMacroId, useDisplayName, useDisplayNameParts } from 'core/user';
import { UserIcon } from 'core/component/UserIcon';
import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import type { Notification } from '../../types/notification';
import type { EntityData } from '../../types/entity';
import { formatTimestamp } from '../utils/date-format';
import { extractNotificationSenderIds } from '../utils/notification-display';
import { CollapsibleListRow, type RowClickEvent } from './CollapsibleListRow';
import { SENDER_COLUMN_WIDTH } from '../../components/EntityMinimal';

// Import icons
import AtIcon from '@icon/regular/at.svg';
import ChatIcon from '@icon/regular/chat.svg';
import ArrowBendUpLeftIcon from '@icon/regular/arrow-bend-up-left.svg';

// Click handler types
export type NotificationClickHandler<T extends EntityData = EntityData> =
  (args: {
    type: 'entity';
    entity: T & { notification: Notification };
    event: RowClickEvent;
  }) => void;

export type StackedNotificationClickHandler<T extends EntityData = EntityData> =
  (args: { group: NotificationStack; entity: T; event: RowClickEvent }) => void;

/**
 * Single notification row display
 */
export function NotificationRow(props: {
  notification: Notification;
  onClick?: NotificationClickHandler;
  entity: EntityData;
  icon?: (props: { class?: string }) => JSX.Element;
}) {
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
    if (props.notification.notificationEventType === 'channel_mention') {
      return 'mentioned you';
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
                },
                event: e,
              });
            }
          : undefined
      }
    >
      <div class="flex size-5 shrink-0 items-center justify-center mr-1">
        <Show
          when={props.icon}
          fallback={<UserIcon id={props.notification.senderId!} size="xs" />}
        >
          <Dynamic component={props.icon} class="size-4 text-ink-muted" />
        </Show>
      </div>
      <div class="flex gap-1 w-full min-w-0 overflow-hidden items-baseline">
        <div
          class="shrink-0 truncate min-w-0"
          style={{ width: SENDER_COLUMN_WIDTH }}
        >
          {userName()}{' '}
          <span class="opacity-70 uppercase font-mono text-[0.625rem] ml-2">
            {ActionContent()}
          </span>
        </div>
        <MessageContent />
      </div>
      <div class="shrink-0 font-mono text-xs touch:mobile-width:text-sm uppercase text-ink-extra-muted ml-2">
        {formatTimestamp(props.notification.createdAt)}
      </div>
    </CollapsibleListRow>
  );
}

/**
 * Shared row component for stacked notifications (new messages and replies)
 * Base layout with count, avatars, sender info, and message content
 */
export function StackedNotificationRow(props: {
  notifications: TypedNotification[];
  title: JSX.Element;
  icon: (props: { class?: string }) => JSX.Element;
  onClick?: (e: RowClickEvent) => void;
}) {
  const mostRecent = () => props.notifications[0];

  // Get up to 3 unique sender IDs for avatar display
  const senderIds = createMemo(() =>
    extractNotificationSenderIds(props.notifications, 3)
  );

  // Get the sender of the most recent message
  const mostRecentSenderId = () => {
    const metadata = mostRecent()?.notificationMetadata;
    if (
      metadata &&
      'senderId' in metadata &&
      typeof metadata.senderId === 'string'
    ) {
      return metadata.senderId;
    }
    return '';
  };

  const [mostRecentSenderName] = useDisplayName(
    tryMacroId(mostRecentSenderId())
  );

  const messageContent = createMemo(() => {
    const metadata = mostRecent()?.notificationMetadata;
    if (metadata && 'messageContent' in metadata) {
      return metadata.messageContent?.trim() ?? '';
    }
    return '';
  });

  return (
    <CollapsibleListRow showThreadBorder onClick={props.onClick}>
      <div class="flex size-5 shrink-0 items-center justify-center mr-1">
        <props.icon class="size-4 text-ink-muted" />
      </div>
      <div class="flex gap-1 w-full overflow-hidden items-baseline">
        {/* Count + Stacked avatars */}
        <div
          class="shrink-0 flex items-center gap-1"
          style={{ 'min-width': SENDER_COLUMN_WIDTH }}
        >
          <span>{props.title}</span>
          <div class="flex shrink-0 items-center">
            <For each={senderIds()}>
              {(id, index) => (
                <div
                  class="flex size-5 items-center justify-center"
                  classList={{ '-ml-2': index() > 0 }}
                >
                  <UserIcon id={id} size="xs" />
                </div>
              )}
            </For>
          </div>
        </div>
        {/* Sender avatar + name + message content */}
        <Show when={mostRecentSenderId()}>
          <div class="flex items-center gap-1 flex-1 min-w-0">
            <span class="shrink-0 font-medium">{mostRecentSenderName()}</span>
            <Show when={messageContent()}>
              {(content) => (
                <div class="text-ink-muted truncate flex items-center flex-1 min-w-0">
                  <StaticMarkdown
                    markdown={content()}
                    theme={unifiedListMarkdownTheme}
                    singleLine={true}
                  />
                </div>
              )}
            </Show>
          </div>
        </Show>
      </div>
      <div class="shrink-0 font-mono text-xs touch:mobile-width:text-sm uppercase text-ink-extra-muted ml-2">
        {formatTimestamp(mostRecent().createdAt)}
      </div>
    </CollapsibleListRow>
  );
}

/**
 * Row component for stacked new messages
 * Displays "N New Messages" with sender avatars
 */
export function StackedNewMessagesRow(props: {
  group: NotificationStack & { type: 'channel_message_send' };
  onClick?: StackedNotificationClickHandler;
  entity: EntityData;
}) {
  const count = () => props.group.notifications.length;

  return (
    <StackedNotificationRow
      notifications={props.group.notifications}
      title={<>{count()} New Messages</>}
      icon={ChatIcon}
      onClick={
        props.onClick
          ? (e) =>
              props.onClick?.({
                group: props.group,
                entity: props.entity,
                event: e,
              })
          : undefined
      }
    />
  );
}

/**
 * Row component for stacked replies to a thread
 * Displays "N Replies to [Name]" with sender avatars
 */
export function StackedRepliesRow(props: {
  group: NotificationStack & { type: 'channel_message_reply' };
  onClick?: StackedNotificationClickHandler;
  entity: EntityData;
}) {
  const count = () => props.group.notifications.length;

  // Derive thread parent sender ID from most recent notification
  const threadParentSenderId = () => {
    const notification = props.group.notifications[0];
    if (!notification) return '';
    const typed = tryToTypedNotification(notification);
    if (!typed || !isChannelMessageReply(typed) || !typed.notificationMetadata)
      return '';
    return typed.notificationMetadata.threadParentSenderId ?? '';
  };

  const { firstName } = useDisplayNameParts(tryMacroId(threadParentSenderId()));

  const title = () => (
    <>
      {count()} {count() === 1 ? 'Reply' : 'Replies'}
      <Show when={firstName()}>{(name) => <> to {name}</>}</Show>
    </>
  );

  return (
    <StackedNotificationRow
      notifications={props.group.notifications}
      title={title()}
      icon={ArrowBendUpLeftIcon}
      onClick={
        props.onClick
          ? (e) =>
              props.onClick?.({
                group: props.group,
                entity: props.entity,
                event: e,
              })
          : undefined
      }
    />
  );
}

/**
 * Renderer component that switches between different stacked notification types
 * Routes to the appropriate row component based on notification type
 */
export function StackedNotificationRenderer(props: {
  group: NotificationStack;
  onClick?: NotificationClickHandler;
  onClickStacked?: StackedNotificationClickHandler;
  entity: EntityData;
}) {
  return (
    <Switch>
      <Match when={props.group.type === 'channel_message_send' && props.group}>
        {(group) => (
          <StackedNewMessagesRow
            group={
              group() as NotificationStack & { type: 'channel_message_send' }
            }
            onClick={props.onClickStacked}
            entity={props.entity}
          />
        )}
      </Match>
      <Match when={props.group.type === 'channel_message_reply' && props.group}>
        {(group) => (
          <StackedRepliesRow
            group={
              group() as NotificationStack & { type: 'channel_message_reply' }
            }
            onClick={props.onClickStacked}
            entity={props.entity}
          />
        )}
      </Match>
      <Match when={props.group.type === 'channel_mention' && props.group}>
        {(group) => (
          <NotificationRow
            notification={group().notifications[0]}
            onClick={props.onClick}
            entity={props.entity}
            icon={AtIcon}
          />
        )}
      </Match>
      <Match
        when={
          props.group.type !== 'channel_message_send' &&
          props.group.type !== 'channel_message_reply' &&
          props.group.type !== 'channel_mention' &&
          props.group
        }
      >
        {(group) => (
          <NotificationRow
            notification={group().notifications[0]}
            onClick={props.onClick}
            entity={props.entity}
          />
        )}
      </Match>
    </Switch>
  );
}
