import { createMemo, type Accessor } from 'solid-js';
import type { NotificationSource } from '@notifications/notification-source';

export function createUnreadChannelMessageIds(
  channelId: string,
  notificationSource: NotificationSource
): Accessor<Set<string>> {
  return createMemo(() => {
    const ids = new Set<string>();
    for (const n of notificationSource.notifications()) {
      if (n.viewed_at || n.done) continue;
      if (n.entity_id !== channelId) continue;
      const meta = n.notification_metadata;
      if (
        meta.tag === 'channel_mention' ||
        meta.tag === 'channel_message_send' ||
        meta.tag === 'channel_message_reply'
      ) {
        ids.add(meta.content.messageId);
      }
    }
    return ids;
  });
}
