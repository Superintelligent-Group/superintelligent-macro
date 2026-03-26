import { createMemo, type Accessor } from 'solid-js';
import type { NotificationSource } from '@notifications/notification-source';
import { getUnreadMessageIdFromNotification } from '@notifications/components/MarkMessageNotifications';

export function createUnreadChannelMessageIds(
  channelId: string,
  notificationSource: NotificationSource
): Accessor<Set<string> | undefined> {
  return createMemo(() => {
    if (notificationSource.isLoading()) return undefined;
    const ids = new Set<string>();
    for (const n of notificationSource.notifications()) {
      const messageId = getUnreadMessageIdFromNotification(n, channelId);
      if (messageId) ids.add(messageId);
    }
    return ids;
  });
}
