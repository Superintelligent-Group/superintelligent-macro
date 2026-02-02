import { match } from 'ts-pattern';
import type { Notification } from '../../types/notification';
import type { NotificationStack } from '@notifications';
import { tryMacroId, useDisplayNameParts } from '@core/user';

interface NotificationDescriptionProps {
  notification?: Notification;
  stack?: NotificationStack;
}

/**
 * Gets unique sender IDs from a notification stack
 */
function getUniqueSenderIds(notifications: Notification[]): string[] {
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
function getActionVerb(type: Notification['notificationEventType']): string {
  return match(type)
    .with('channel_mention', () => 'mentioned you')
    .with('document_mention', () => 'mentioned you')
    .with('channel_message_reply', () => 'replied')
    .with('channel_message_send', () => 'sent a message')
    .with('item_shared_user', () => 'shared')
    .with('item_shared_organization', () => 'shared')
    .with('new_email', () => 'sent an email')
    .otherwise(() => 'notified you');
}

/**
 * Gets a noun for the notification type (for multi-notification descriptions)
 */
function getTypeNoun(
  type: Notification['notificationEventType'],
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
 * Displays a complete description of the notification including sender(s) and action
 *
 * Formats:
 * - Single notification: "Peter mentioned you"
 * - Stack with one sender: "Peter: 13 messages"
 * - Stack with multiple senders: "13 messages from Peter +5"
 */
export function NotificationDescription(props: NotificationDescriptionProps) {
  const isSingleNotification = () => {
    return Boolean(
      props.notification ||
        (props.stack && props.stack.notifications.length === 1)
    );
  };

  const notificationType = () => {
    if (props.notification) return props.notification.notificationEventType;
    if (props.stack) return props.stack.type;
    return undefined;
  };

  const count = () => {
    if (props.stack) return props.stack.notifications.length;
    return 1;
  };

  const primarySenderId = () => {
    if (props.notification?.senderId) {
      return props.notification.senderId;
    }
    if (props.stack) {
      const senderIds = getUniqueSenderIds(props.stack.notifications);
      return senderIds[0];
    }
    return undefined;
  };

  const senderIds = () => {
    if (!props.stack) return [];
    return getUniqueSenderIds(props.stack.notifications);
  };

  const additionalSenderCount = () => {
    if (!props.stack) return 0;
    return Math.max(0, senderIds().length - 1);
  };

  const hasMultipleSenders = () => additionalSenderCount() > 0;

  const primarySenderNameParts = useDisplayNameParts(
    tryMacroId(primarySenderId() ?? '')
  );

  const primarySenderFirstName = () => {
    const firstName = primarySenderNameParts.firstName();
    return firstName || primarySenderNameParts.fullName();
  };

  const secondarySenderNameParts = useDisplayNameParts(
    tryMacroId(senderIds()[1] ?? '')
  );

  const secondarySenderFirstName = () => {
    const firstName = secondarySenderNameParts.firstName();
    return firstName || secondarySenderNameParts.fullName();
  };

  const description = () => {
    const type = notificationType();
    const senderId = primarySenderId();

    if (!type) return '';

    // Single notification: "Peter mentioned you"
    if (isSingleNotification()) {
      if (senderId) {
        return `${primarySenderFirstName()} ${getActionVerb(type)}`;
      }
      return getActionVerb(type);
    }

    // Stack with multiple senders
    if (hasMultipleSenders()) {
      if (senderId) {
        const senderCount = senderIds().length;
        // Two senders: "13 messages from Peter and Jane"
        if (senderCount === 2) {
          return `${count()} ${getTypeNoun(type, count())} from ${primarySenderFirstName()} and ${secondarySenderFirstName()}`;
        }
        // Three or more senders: "13 messages from Peter and 5 others"
        return `${count()} ${getTypeNoun(type, count())} from ${primarySenderFirstName()} and ${additionalSenderCount()} ${additionalSenderCount() === 1 ? 'other' : 'others'}`;
      }
      return `${count()} ${getTypeNoun(type, count())}`;
    }

    // Stack with single sender: "Peter: 13 messages"
    if (senderId) {
      return `${primarySenderFirstName()}: ${count()} ${getTypeNoun(type, count())}`;
    }
    return `${count()} ${getTypeNoun(type, count())}`;
  };

  return <>{description()}</>;
}
