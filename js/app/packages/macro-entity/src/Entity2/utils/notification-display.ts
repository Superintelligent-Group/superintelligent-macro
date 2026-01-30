import type { Notification } from '../../types/notification';
import type { TypedNotification } from '@notifications';
import {
  isChannelMention,
  isChannelMessageSend,
  isChannelMessageReply,
  isDocumentMention,
  isItemSharedUser,
  isItemSharedOrganization,
  isNewEmail,
  type UnifiedNotificationWithMetadata,
} from '@notifications';
import { match } from 'ts-pattern';

/**
 * Filters out invalid notification types that shouldn't be displayed
 * Currently filters out 'channel_message_document' notifications
 */
export function filterValidNotifications(
  notifications: Notification[] | undefined
): Notification[] {
  if (!notifications) return [];

  return notifications.filter((n) => {
    return (
      n.notificationEventType !== 'channel_message_document' &&
      n.notificationEventType !== undefined
    );
  });
}

/**
 * Filters out notifications that are marked as done
 */
export function filterNotDoneNotifications(
  notifications: Notification[]
): Notification[] {
  return notifications.filter((n) => !n.done);
}

/**
 * Extracts sender IDs from notifications up to a maximum count
 * Returns unique sender IDs in the order they appear
 */
export function extractNotificationSenderIds(
  notifications: TypedNotification[],
  maxCount: number = 3
): string[] {
  const senderIds = new Set<string>();

  for (const notification of notifications) {
    if (senderIds.size >= maxCount) break;

    // TypedNotification metadata can have senderId in different shapes
    // depending on the notification type - check if it exists
    const metadata = notification.notificationMetadata;
    if (
      metadata &&
      'senderId' in metadata &&
      typeof metadata.senderId === 'string' &&
      metadata.senderId
    ) {
      senderIds.add(metadata.senderId);
    }
  }

  return Array.from(senderIds);
}

/**
 * Gets a human-readable action text for a notification based on its type
 * Returns a short verb phrase like "mentioned", "replied", "shared", etc.
 */
export function getNotificationActionText(notification: Notification): string {
  const type = notification.notificationEventType;

  return match(type)
    .with('channel_mention', () => 'mentioned')
    .with('channel_message_send', () => 'sent')
    .with('channel_message_reply', () => 'replied')
    .with('document_mention', () => 'mentioned')
    .with('item_shared_user', () => 'shared')
    .with('item_shared_organization', () => 'shared')
    .with('channel_invite', () => 'invited')
    .with('new_email', () => 'emailed')
    .with('invite_to_team', () => 'invited')
    .with('reject_team_invite', () => 'declined')
    .with('task_assigned', () => 'assigned')
    .with('channel_message_document', () => 'notified')
    .exhaustive();
}

export function extractMessageContent(notification: Notification): string {
  const typed = notification as UnifiedNotificationWithMetadata;

  if (isChannelMention(typed)) {
    return typed.notificationMetadata.messageContent || '';
  }

  if (isChannelMessageSend(typed)) {
    return typed.notificationMetadata.messageContent || '';
  }

  if (isChannelMessageReply(typed)) {
    return typed.notificationMetadata.messageContent || '';
  }

  if (isDocumentMention(typed)) {
    return typed.notificationMetadata.documentName || '';
  }

  if (isItemSharedUser(typed)) {
    return typed.notificationMetadata.itemName || '';
  }

  if (isItemSharedOrganization(typed)) {
    return typed.notificationMetadata.itemName || '';
  }

  if (isNewEmail(typed)) {
    return typed.notificationMetadata.subject || '';
  }

  return '';
}
