import { Show } from 'solid-js';
import { stackNotifications, type NotificationStack } from '@notifications';
import type { WithNotification } from '../../types/notification';
import type { EntityData } from '../../types/entity';
import { CollapsibleList } from '../components/CollapsibleList';
import {
  filterValidNotifications,
  filterNotDoneNotifications,
} from '../utils/notification-display';
import type { RowClickEvent } from '../components/CollapsibleListRow';
import { StackedNotificationRow } from '../components-notification';
import { match } from 'ts-pattern';
import BellIcon from '@icon/regular/bell.svg';
import ArrowBendUpLeftIcon from '@icon/regular/arrow-bend-up-left.svg';
import AtIcon from '@icon/regular/at.svg';
import ShareIcon from '@icon/regular/share.svg';
import EnvelopeIcon from '@icon/regular/envelope.svg';
import type { JSX } from 'solid-js';

interface ExtractorNotificationRowsProps {
  entity: WithNotification<EntityData>;
  onClick?: (e: RowClickEvent) => void;
  visibleCount?: number;
}

/**
 * Gets the appropriate icon for a notification type
 */
function getNotificationIcon(
  type: NotificationStack['type']
): (props: { class?: string }) => JSX.Element {
  return match(type)
    .with('channel_mention', () => AtIcon)
    .with('channel_message_reply', () => ArrowBendUpLeftIcon)
    .with('channel_message_send', () => BellIcon)
    .with('document_mention', () => AtIcon)
    .with('item_shared_user', () => ShareIcon)
    .with('item_shared_organization', () => ShareIcon)
    .with('new_email', () => EnvelopeIcon)
    .otherwise(() => BellIcon);
}

function NotificationStackRow(props: { stack: NotificationStack }) {
  const icon = () => getNotificationIcon(props.stack.type);

  return (
    <div class="flex items-center py-4 border-b border-edge-muted">
      <StackedNotificationRow
        notifications={props.stack.notifications}
        icon={icon()}
      />
    </div>
  );
}

/**
 * Extractor component for notification rows
 * Filters, stacks, and renders notifications in a collapsible list
 */
export function ExtractorNotificationRows(
  props: ExtractorNotificationRowsProps
) {
  const notifications = () => props.entity.notifications?.() ?? [];
  const validNotifications = () =>
    filterNotDoneNotifications(filterValidNotifications(notifications()));

  const stacks = () => stackNotifications(validNotifications());

  return (
    <Show when={stacks().length > 0}>
      <div class="">
        <CollapsibleList
          items={stacks()}
          visibleCount={props.visibleCount ?? 3}
        >
          {(stack) => <NotificationStackRow stack={stack} />}
        </CollapsibleList>
      </div>
    </Show>
  );
}
