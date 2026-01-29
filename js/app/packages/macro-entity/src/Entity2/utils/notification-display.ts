/**
 * Pure utility functions for handling notification display logic
 */

import type { Notification } from '../../types/notification';
import type { TypedNotification } from '@notifications';

/**
 * Filters out invalid notification types that shouldn't be displayed
 * Currently filters out 'channel_message_document' notifications
 */
export function filterValidNotifications(
  notifications: Notification[] | undefined
): Notification[] {
  if (!notifications) return [];

  return notifications.filter((n) => {
    // Filter out channel_message_document notifications
    // These are handled separately or not displayed in the list
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
