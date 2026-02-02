import type { NotificationStack } from '@notifications';
import type { UnifiedNotification } from '@notifications';
import { getAllNotificationsFromGroup } from '@notifications';
import { useGlobalNotificationSource } from '@app/component/GlobalAppState';

interface NotificationActionsProps {
  /** The notification stack to perform actions on */
  stack: NotificationStack;
  /** Optional callback invoked after marking notifications as done */
  onMarkAsDone?: () => void;
  /** Optional callback invoked after marking notifications as read */
  onMarkAsRead?: () => void;
}

interface SingleNotificationActionsProps {
  /** The notification to perform actions on */
  notification: UnifiedNotification;
  /** Optional callback invoked after marking notification as done */
  onMarkAsDone?: () => void;
  /** Optional callback invoked after marking notification as read */
  onMarkAsRead?: () => void;
}

/**
 * Hook that provides methods to mark all notifications in a stack as done or read.
 *
 * @example
 * ```tsx
 * function MyComponent(props: { stack: NotificationStack }) {
 *   const { markStackAsDone, markStackAsRead } = useNotificationStackActions({ stack: props.stack });
 *
 *   return (
 *     <div>
 *       <button onClick={markStackAsRead}>Mark as Read</button>
 *       <button onClick={markStackAsDone}>Mark as Done</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @param props - Configuration for the notification stack actions
 * @returns Object with markStackAsDone and markStackAsRead methods
 */
export function useNotificationStackActions(props: NotificationActionsProps) {
  const notificationSource = useGlobalNotificationSource();

  const markStackAsDone = async () => {
    const notifications = getAllNotificationsFromGroup(props.stack);
    await notificationSource.bulkMarkAsDone(notifications);
    props.onMarkAsDone?.();
  };

  const markStackAsRead = async () => {
    const notifications = getAllNotificationsFromGroup(props.stack);
    await notificationSource.bulkMarkAsRead(notifications);
    props.onMarkAsRead?.();
  };

  return {
    markStackAsDone,
    markStackAsRead,
  };
}

/**
 * Hook that provides methods to mark a single notification as done or read.
 *
 * @example
 * ```tsx
 * function MyComponent(props: { notification: UnifiedNotification }) {
 *   const { markAsDone, markAsRead } = useNotificationActions({ notification: props.notification });
 *
 *   return (
 *     <div>
 *       <button onClick={markAsRead}>Mark as Read</button>
 *       <button onClick={markAsDone}>Mark as Done</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @param props - Configuration for the notification actions
 * @returns Object with markAsDone and markAsRead methods
 */
export function useNotificationActions(props: SingleNotificationActionsProps) {
  const notificationSource = useGlobalNotificationSource();

  const markAsDone = async () => {
    await notificationSource.markAsDone(props.notification);
    props.onMarkAsDone?.();
  };

  const markAsRead = async () => {
    await notificationSource.markAsRead(props.notification);
    props.onMarkAsRead?.();
  };

  return {
    markAsDone,
    markAsRead,
  };
}
