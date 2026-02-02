import type { NotificationStack } from '@notifications';
import { NotificationIcon } from '../extractors-notification/notification-icon';
import { NotificationSenderIcon } from '../extractors-notification/notification-sender-icon';
import { NotificationContent } from '../extractors-notification/notification-content';
import { NotificationDescription } from '../extractors-notification/notification-description';

interface StackedNotificationRowRefactoredProps {
  stack: NotificationStack;
}

/**
 * Example refactored version of StackedNotificationRow using the new extractors
 * This shows how the original component could be simplified using the extractor pattern
 */
export function StackedNotificationRowRefactored(
  props: StackedNotificationRowRefactoredProps
) {
  return (
    <div class="flex items-start gap-3 w-full">
      {/* Left side: user icon(s) */}
      <div class="shrink-0">
        <NotificationSenderIcon stack={props.stack} size="sm" />
      </div>

      {/* Right side: stacked description and message preview */}
      <div class="flex-1 min-w-0 flex flex-col gap-1">
        {/* Description line with icon and combined sender/action info */}
        <div class="flex items-center gap-2 text-xs text-ink-muted">
          <NotificationIcon stack={props.stack} />
          <div class="flex items-center gap-1">
            <NotificationDescription stack={props.stack} />
          </div>
        </div>

        {/* Message preview */}
        <div class="text-sm text-ink">
          <NotificationContent stack={props.stack} />
        </div>
      </div>
    </div>
  );
}
