import type { EntityData } from '../../types/entity';
import type { WithNotification } from '../../types/notification';

export const validNotifications = (entity: WithNotification<EntityData>) => {
  return (
    entity?.notifications?.().filter(({ notificationEventType }) => {
      return notificationEventType !== 'channel_message_document';
    }) ?? []
  );
};

export const hasUnreads = (entity: WithNotification<EntityData>) => {
  const notifications = validNotifications(entity);
  console.log(notifications);
  return notifications.some(({ done }) => !done);
};
