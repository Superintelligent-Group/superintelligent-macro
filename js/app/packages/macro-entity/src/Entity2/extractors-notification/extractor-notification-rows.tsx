import { Show } from 'solid-js';
import { stackNotifications, type NotificationStack } from '@notifications';
import type { WithNotification } from '../../types/notification';
import type { EntityData } from '../../types/entity';
import { CollapsibleList } from '../components/CollapsibleList';
import {
  filterValidNotifications,
  filterNotDoneNotifications,
  isNotificationUnread,
} from '../utils/notification-display';
import type { RowClickEvent } from '../components/CollapsibleListRow';
import { NotificationContent } from './notification-content';
import { NotificationIcon } from './notification-icon';
import { NotificationDescription } from './notification-description';
import { NotificationSenderIcon } from './notification-sender-icon';
import { NotificationTimestamp } from './notification-timestamp';
import { UnreadIndicator } from '../components/UnreadIndicator';

interface ExtractorNotificationRowsProps {
  entity: WithNotification<EntityData>;
  onClick?: (e: RowClickEvent) => void;
  visibleCount?: number;
}

function NotificationStackRow(props: { stack: NotificationStack }) {
  return (
    <div class="flex p-2 pr-0 my-1 border-l-2 border-edge-muted bg-edge/10 gap-4">
      <NotificationIcon stack={props.stack} class="size-4" />
      <div class="w-full">
        <div class="flex items-center gap-1 text-xs">
          <Show when={isNotificationUnread(props.stack)}>
            <UnreadIndicator active />
          </Show>
          <NotificationSenderIcon stack={props.stack} size="xs" />
          <NotificationDescription stack={props.stack} />
          <span class="text-ink-extra-muted/50">
            {' - '}
            <NotificationTimestamp stack={props.stack} />
          </span>
        </div>
        <div class="mt-1">
          <NotificationContent stack={props.stack} />
        </div>
      </div>
    </div>
  );
}

export function ExtractorNotificationRows(
  props: ExtractorNotificationRowsProps
) {
  const notifications = () => props.entity.notifications?.() ?? [];
  const validNotifications = () =>
    filterNotDoneNotifications(filterValidNotifications(notifications()));

  const stacks = () => stackNotifications(validNotifications());

  return (
    <Show when={stacks().length > 0}>
      <CollapsibleList items={stacks()} visibleCount={props.visibleCount ?? 3}>
        {(stack) => <NotificationStackRow stack={stack} />}
      </CollapsibleList>
    </Show>
  );
}
