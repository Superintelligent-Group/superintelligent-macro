import { Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import type { TypedNotification } from '@notifications';
import { DisplayName } from '../components/DisplayName';
import { UserIcon } from '@core/component/UserIcon';
import { match } from 'ts-pattern';

interface StackedNotificationRowProps {
  notifications: TypedNotification[];
  icon: (props: { class?: string }) => JSX.Element;
}

/**
 * Data structure for formatted notification description
 */
interface NotificationDescriptionData {
  type:
    | 'single'
    | 'single-new-message'
    | 'multiple-single-sender'
    | 'multiple-multi-sender';
  count: number;
  firstSenderId: string;
  additionalSenders: number;
  actionVerb?: string;
  typeNoun?: string;
}

/**
 * Extracts unique sender IDs from notifications
 */
function getUniqueSenderIds(notifications: TypedNotification[]): string[] {
  const senderIds = new Set<string>();
  for (const notification of notifications) {
    if (notification.senderId) {
      senderIds.add(notification.senderId);
    }
  }
  return Array.from(senderIds);
}

/**
 * Gets the action verb for a notification type
 */
function getActionVerb(
  type: TypedNotification['notificationEventType']
): string {
  return match(type)
    .with('channel_mention', () => 'mentioned you')
    .with('document_mention', () => 'mentioned you')
    .with('channel_message_reply', () => 'replied')
    .with('channel_message_send', () => 'new message')
    .with('item_shared_user', () => 'shared')
    .with('item_shared_organization', () => 'shared')
    .with('new_email', () => 'emailed')
    .otherwise(() => 'notified');
}

/**
 * Gets a noun for the notification type (for multi-sender descriptions)
 */
function getTypeNoun(
  type: TypedNotification['notificationEventType'],
  count: number
): string {
  return match(type)
    .with('channel_message_reply', () => (count === 1 ? 'reply' : 'replies'))
    .with('channel_message_send', () => (count === 1 ? 'message' : 'messages'))
    .with('channel_mention', () => (count === 1 ? 'mention' : 'mentions'))
    .with('document_mention', () => (count === 1 ? 'mention' : 'mentions'))
    .with('item_shared_user', () => (count === 1 ? 'share' : 'shares'))
    .with('item_shared_organization', () => (count === 1 ? 'share' : 'shares'))
    .with('new_email', () => (count === 1 ? 'email' : 'emails'))
    .otherwise(() => (count === 1 ? 'notification' : 'notifications'));
}

/**
 * Extracts message content from a notification
 */
function extractMessageContent(notification: TypedNotification): string {
  const metadata = notification?.notificationMetadata;
  if (metadata && 'messageContent' in metadata) {
    return metadata.messageContent?.trim() ?? '';
  }
  return '';
}

/**
 * Formats notification data for display
 * Returns structured data that describes how to render the notification
 */
function formatNotificationData(
  notifications: TypedNotification[]
): NotificationDescriptionData {
  const senderIds = getUniqueSenderIds(notifications);
  const count = notifications.length;
  const type = notifications[0]?.notificationEventType;
  const singleSender = senderIds.length === 1;

  if (singleSender && count === 1) {
    // Special case for new message: just show "new message" without sender name
    if (type === 'channel_message_send') {
      return {
        type: 'single-new-message',
        count,
        firstSenderId: senderIds[0],
        additionalSenders: 0,
        actionVerb: getActionVerb(type),
      };
    }

    // Single notification: "Evan mentioned you"
    return {
      type: 'single',
      count,
      firstSenderId: senderIds[0],
      additionalSenders: 0,
      actionVerb: getActionVerb(type),
    };
  }

  if (singleSender && count > 1) {
    // Multiple notifications, one sender: "3 replies from Evan"
    return {
      type: 'multiple-single-sender',
      count,
      firstSenderId: senderIds[0],
      additionalSenders: 0,
      typeNoun: getTypeNoun(type, count),
    };
  }

  // Multiple senders: "14 messages from Peter +2"
  return {
    type: 'multiple-multi-sender',
    count,
    firstSenderId: senderIds[0],
    additionalSenders: Math.max(0, senderIds.length - 1),
    typeNoun: getTypeNoun(type, count),
  };
}

/**
 * Stacked notification display component
 * Groups multiple notifications of the same type/context
 * Shows personalized descriptions like "Evan mentioned you" or "14 messages from Peter +2"
 */
export function StackedNotificationRow(props: StackedNotificationRowProps) {
  const mostRecent = () => props.notifications[0];
  const descriptionData = () => formatNotificationData(props.notifications);
  const content = () => extractMessageContent(mostRecent());

  const descriptionSlot = () => {
    const data = descriptionData();

    if (data.type === 'single-new-message') {
      // Just show "new message" without sender name
      return <span>{data.actionVerb}</span>;
    }

    if (data.type === 'single') {
      // Single notification: "Evan mentioned you"
      return (
        <>
          <DisplayName id={data.firstSenderId} format="firstName" />
          <span class="">{data.actionVerb}</span>
        </>
      );
    }

    if (data.type === 'multiple-single-sender') {
      // Multiple notifications, one sender: "3 replies from Evan"
      return (
        <>
          <span>{data.count}</span>
          <span class="">{data.typeNoun}</span>
          <span class="">from</span>
          <span class="">
            <DisplayName id={data.firstSenderId} format="firstName" />
          </span>
        </>
      );
    }

    // Multiple senders: "14 messages from Peter +2"
    return (
      <span>
        {data.count} {data.typeNoun} from{' '}
        <DisplayName id={data.firstSenderId} format="firstName" />
        <Show when={data.additionalSenders > 0}>
          <span class="">+{data.additionalSenders}</span>
        </Show>
      </span>
    );
  };

  return (
    <div class="flex items-start gap-3 w-full">
      {/* Left side: user icon */}
      <Show when={mostRecent()?.senderId}>
        {(senderId) => (
          <div class="shrink-0">
            <UserIcon id={senderId()} size="xs" isDeleted={false} />
          </div>
        )}
      </Show>

      {/* Right side: stacked description and message preview */}
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        {/* Description line with icon */}
        <div class="flex items-center gap-2 text-xs text-ink-muted">
          <Dynamic
            component={props.icon}
            class="size-4 text-ink-extra-muted shrink-0"
          />
          <span class="flex items-center gap-1">{descriptionSlot()}</span>
        </div>

        {/* Message preview */}
        <Show when={content()}>
          {(content) => (
            <Show
              when={content()}
              fallback={
                <span class="text-xs italic text-ink-disabled">
                  Attached items
                </span>
              }
            >
              {(trimmedContent) => (
                <div class="text-sm text-ink">
                  <StaticMarkdown
                    markdown={trimmedContent()}
                    theme={unifiedListMarkdownTheme}
                    singleLine={true}
                  />
                </div>
              )}
            </Show>
          )}
        </Show>
      </div>
    </div>
  );
}
