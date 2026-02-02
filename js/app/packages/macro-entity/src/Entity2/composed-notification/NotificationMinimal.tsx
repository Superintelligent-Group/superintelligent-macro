import type { Notification } from '../../types/notification';
import type { NotificationStack } from '@notifications';
import { NotificationIcon } from '../extractors-notification/notification-icon';
import { NotificationSenderIcon } from '../extractors-notification/notification-sender-icon';
import { NotificationContent } from '../extractors-notification/notification-content';
import { NotificationTimestamp } from '../extractors-notification/notification-timestamp';
import { NotificationDescription } from '../extractors-notification/notification-description';

interface NotificationMinimalProps {
  notification?: Notification;
  stack?: NotificationStack;
}

/**
 * Minimal notification display component composed from extractors
 * Can display either a single notification or a notification stack
 * Follows the same pattern as EntityMinimal
 */
export function NotificationMinimal(props: NotificationMinimalProps) {
  return (
    <div class="flex items-start gap-3 w-full">
      {/* User icon(s) for sender(s) */}
      <div class="shrink-0">
        <NotificationSenderIcon
          notification={props.notification}
          stack={props.stack}
          size="sm"
        />
      </div>

      {/* Main content area */}
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        {/* Description line with icon and combined sender/action info */}
        <div class="flex items-center gap-2 text-xs text-ink-muted">
          <NotificationIcon
            notification={props.notification}
            stack={props.stack}
          />
          <div class="flex items-center gap-1">
            <NotificationDescription
              notification={props.notification}
              stack={props.stack}
            />
          </div>
        </div>

        {/* Message content preview */}
        <div class="text-sm text-ink">
          <NotificationContent
            notification={props.notification}
            stack={props.stack}
          />
        </div>
      </div>

      {/* Timestamp on the right */}
      <div class="shrink-0">
        <NotificationTimestamp
          notification={props.notification}
          stack={props.stack}
        />
      </div>
    </div>
  );
}
