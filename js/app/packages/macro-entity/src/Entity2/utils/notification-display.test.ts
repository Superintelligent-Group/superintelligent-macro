import { describe, expect, it } from 'vitest';

// Minimal type definitions to avoid importing heavy dependencies
type MinimalNotification = {
  viewedAt: number | null;
  done: boolean;
  [key: string]: any;
};

type MinimalNotificationStack = {
  notifications: MinimalNotification[];
  [key: string]: any;
};

// Import only the function we're testing
// We'll test it with minimal compatible types
import { isNotificationUnread } from './notification-display';

// Helper to create a notification with specific read state
function createNotification(
  id: string,
  options: {
    viewedAt?: number | null;
    done?: boolean;
  } = {}
): MinimalNotification {
  return {
    id,
    viewedAt: options.viewedAt ?? null,
    done: options.done ?? false,
  };
}

// Helper to create a notification stack
function createNotificationStack(
  notifications: MinimalNotification[]
): MinimalNotificationStack {
  return {
    type: 'channel_message_send',
    notifications,
  };
}

describe('isNotificationUnread', () => {
  describe('single notification', () => {
    it('returns true when notification is unread (no viewedAt, not done)', () => {
      const notification = createNotification('n1', {
        viewedAt: null,
        done: false,
      });

      expect(isNotificationUnread(notification as any)).toBe(true);
    });

    it('returns false when notification has been viewed', () => {
      const notification = createNotification('n1', {
        viewedAt: Date.now(),
        done: false,
      });

      expect(isNotificationUnread(notification as any)).toBe(false);
    });

    it('returns false when notification is marked as done', () => {
      const notification = createNotification('n1', {
        viewedAt: null,
        done: true,
      });

      expect(isNotificationUnread(notification as any)).toBe(false);
    });

    it('returns false when notification is both viewed and done', () => {
      const notification = createNotification('n1', {
        viewedAt: Date.now(),
        done: true,
      });

      expect(isNotificationUnread(notification as any)).toBe(false);
    });
  });

  describe('notification stack', () => {
    it('returns true when all notifications are unread', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: null, done: false }),
        createNotification('n2', { viewedAt: null, done: false }),
        createNotification('n3', { viewedAt: null, done: false }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(true);
    });

    it('returns true when at least one notification is unread', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: Date.now(), done: false }),
        createNotification('n2', { viewedAt: null, done: false }), // Unread
        createNotification('n3', { viewedAt: null, done: true }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(true);
    });

    it('returns false when all notifications are viewed', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: Date.now(), done: false }),
        createNotification('n2', { viewedAt: Date.now(), done: false }),
        createNotification('n3', { viewedAt: Date.now(), done: false }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(false);
    });

    it('returns false when all notifications are done', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: null, done: true }),
        createNotification('n2', { viewedAt: null, done: true }),
        createNotification('n3', { viewedAt: null, done: true }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(false);
    });

    it('returns false when all notifications are either viewed or done', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: Date.now(), done: false }),
        createNotification('n2', { viewedAt: null, done: true }),
        createNotification('n3', { viewedAt: Date.now(), done: true }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(false);
    });

    it('returns false for empty notification stack', () => {
      const stack = createNotificationStack([]);

      expect(isNotificationUnread(stack as any)).toBe(false);
    });

    it('returns true for single-item stack with unread notification', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: null, done: false }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(true);
    });

    it('returns false for single-item stack with read notification', () => {
      const stack = createNotificationStack([
        createNotification('n1', { viewedAt: Date.now(), done: false }),
      ]);

      expect(isNotificationUnread(stack as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles viewedAt as 0 (falsy timestamp)', () => {
      const notification = createNotification('n1', {
        viewedAt: 0,
        done: false,
      });

      // viewedAt = 0 is falsy and treated as unread (not a valid timestamp in our use case)
      expect(isNotificationUnread(notification as any)).toBe(true);
    });

    it('treats undefined viewedAt same as null', () => {
      const notification = createNotification('n1', {
        viewedAt: undefined,
        done: false,
      });

      expect(isNotificationUnread(notification as any)).toBe(true);
    });
  });
});
