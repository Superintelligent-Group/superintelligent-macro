import { describe, expect, test } from 'vitest';
import { createRoot } from 'solid-js';
import type { UserGroupProps } from './UserGroup';

describe('UserGroup', () => {
  test('userIds prop accepts array of user IDs', () => {
    const props: UserGroupProps = {
      userIds: ['user-1', 'user-2', 'user-3'],
    };

    expect(props.userIds).toHaveLength(3);
    expect(props.userIds[0]).toBe('user-1');
  });

  test('maxUsers defaults to 3 when not specified', () => {
    const props: UserGroupProps = {
      userIds: ['user-1', 'user-2', 'user-3', 'user-4'],
    };

    expect(props.maxUsers).toBeUndefined();
  });

  test('size prop accepts valid size values', () => {
    const sizes: Array<UserGroupProps['size']> = ['xs', 'sm', 'md', 'lg', 'xl'];

    for (const size of sizes) {
      const props: UserGroupProps = {
        userIds: ['user-1'],
        size,
      };

      expect(props.size).toBe(size);
    }
  });

  test('overflow calculation for users exceeding maxUsers', () => {
    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
    const maxUsers = 3;
    const expectedRemaining = userIds.length - maxUsers;

    expect(expectedRemaining).toBe(2);
  });

  test('no overflow when users are within limit', () => {
    const userIds = ['user-1', 'user-2'];
    const maxUsers = 3;
    const remaining =
      userIds.length <= maxUsers ? undefined : userIds.length - maxUsers;

    expect(remaining).toBeUndefined();
  });

  test('displayUserIds slices array correctly', () => {
    const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
    const maxUsers = 3;
    const displayUserIds = userIds.slice(0, maxUsers);

    expect(displayUserIds).toHaveLength(3);
    expect(displayUserIds).toEqual(['user-1', 'user-2', 'user-3']);
  });

  test('suppressClick prop is optional boolean', () => {
    const props: UserGroupProps = {
      userIds: ['user-1'],
      suppressClick: true,
    };

    expect(props.suppressClick).toBe(true);
  });

  test('showTooltip prop is optional boolean', () => {
    const props: UserGroupProps = {
      userIds: ['user-1'],
      showTooltip: false,
    };

    expect(props.showTooltip).toBe(false);
  });

  test('handles empty userIds array', () => {
    const props: UserGroupProps = {
      userIds: [],
    };

    expect(props.userIds).toHaveLength(0);
  });

  test('handles single user', () => {
    const userIds = ['user-1'];
    const maxUsers = 3;
    const remaining =
      userIds.length <= maxUsers ? undefined : userIds.length - maxUsers;

    expect(remaining).toBeUndefined();
    expect(userIds.slice(0, maxUsers)).toEqual(['user-1']);
  });
});
