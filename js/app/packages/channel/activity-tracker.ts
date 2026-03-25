import { createMemo, createSignal, type Accessor } from 'solid-js';
import {
  isNewMessage as isNewMessagePure,
  type NewMessageCheckable,
} from './Channel/util';
import type { DateValue } from '@core/util/date';

export type ActivityTracker = {
  newMessagesDismissed: Accessor<boolean>;
  dismissNewMessages: () => void;
  isNewMessage: (message: NewMessageCheckable) => boolean;
};

type ActivityTrackerOptions = {
  unreadMessageIds: Accessor<Set<string>>;
  lastViewedAt: Accessor<DateValue | undefined | null>;
  userId: Accessor<string | undefined>;
};

export function createActivityTracker(
  props: ActivityTrackerOptions
): ActivityTracker {
  const [newMessagesDismissed, setNewMessagesDismissed] =
    createSignal<boolean>(false);

  const openedChannelAt = createMemo<Date>((prev) => prev ?? new Date());

  // Freeze both the unread IDs and lastViewedAt at the point the channel opens.
  // Without this, scrolling (which marks notifications read) or the activity
  // mutation on mount (which resets viewed_at to now) would immediately clear
  // the "New" indicators.
  const frozenUnreadMessageIds = props.unreadMessageIds();

  const frozenLastViewedAt = createMemo<DateValue | undefined | null>((prev) =>
    prev !== undefined ? prev : props.lastViewedAt()
  );

  const isNewMessage = (message: NewMessageCheckable) =>
    isNewMessagePure(message, {
      dismissed: newMessagesDismissed(),
      unreadMessageIds: frozenUnreadMessageIds,
      lastViewedAt: frozenLastViewedAt(),
      openedAt: openedChannelAt(),
      userId: props.userId(),
    });

  const dismissNewMessages = () => {
    setNewMessagesDismissed(true);
  };

  return {
    isNewMessage,
    newMessagesDismissed,
    dismissNewMessages,
  };
}
