import { onMount } from 'solid-js';
import type { JSXElement } from 'solid-js';
import { useGlobalNotificationSource } from '@app/component/GlobalAppState';
import type { UnifiedNotification } from '../types';

/** Returns the messageId if the notification is an unread channel message for channelId, otherwise undefined. */
export function getUnreadMessageIdFromNotification(
  n: UnifiedNotification,
  channelId: string
): string | undefined {
  if (n.viewed_at || n.done) return undefined;
  if (n.entity_id !== channelId) return undefined;
  const meta = n.notification_metadata;
  if (
    meta.tag === 'channel_mention' ||
    meta.tag === 'channel_message_send' ||
    meta.tag === 'channel_message_reply'
  ) {
    return meta.content.messageId;
  }
  return undefined;
}

export function MarkMessaageNotifications(props: {
  messageId: string;
  channelId: string;
  children: JSXElement;
}) {
  const notificationSource = useGlobalNotificationSource();

  onMount(() => {
    const toMark = notificationSource.notifications().filter((n) => {
      return (
        getUnreadMessageIdFromNotification(n, props.channelId) ===
        props.messageId
      );
    });
    if (toMark.length > 0) {
      notificationSource.bulkMarkAsRead(toMark);
    }
  });

  return <>{props.children}</>;
}
