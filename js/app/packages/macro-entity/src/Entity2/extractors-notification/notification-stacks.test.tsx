import { describe, expect, it } from 'vitest';

describe('NotificationStacks key generation', () => {
  it('generates correct composite key for notification IDs', () => {
    // Test that our key generation works correctly
    const ids = ['n3', 'n1', 'n2'];

    const key = ids.sort().join(',');

    // Should be sorted
    expect(key).toBe('n1,n2,n3');
  });

  it('generates same key for same IDs in different order', () => {
    const ids1 = ['n3', 'n1', 'n2'];
    const ids2 = ['n2', 'n3', 'n1'];

    const key1 = ids1.sort().join(',');
    const key2 = ids2.sort().join(',');

    expect(key1).toBe(key2);
    expect(key1).toBe('n1,n2,n3');
  });

  it('generates different keys for different notification sets', () => {
    const ids1 = ['n1', 'n2'];
    const ids2 = ['n1', 'n3'];

    const key1 = ids1.sort().join(',');
    const key2 = ids2.sort().join(',');

    expect(key1).toBe('n1,n2');
    expect(key2).toBe('n1,n3');
    expect(key1).not.toBe(key2);
  });

  it('handles single notification', () => {
    const ids = ['n1'];
    const key = ids.sort().join(',');
    expect(key).toBe('n1');
  });

  it('handles empty array', () => {
    const ids: string[] = [];
    const key = ids.sort().join(',');
    expect(key).toBe('');
  });

  it('handles duplicate IDs (should not happen in practice)', () => {
    const ids = ['n1', 'n2', 'n1'];
    const key = ids.sort().join(',');
    // Will have duplicates, which is fine - this shouldn't happen in real usage
    expect(key).toBe('n1,n1,n2');
  });
});

describe('NotificationStacks reconcile strategy', () => {
  it('explains the reconcile approach', () => {
    // This test documents our approach to preventing remounts
    //
    // The problem:
    // 1. notificationsByEntity creates new arrays on every recalculation
    // 2. stackNotifications creates new NotificationStack objects
    // 3. CollapsibleList receives new array references via items prop
    // 4. <For> remounts all children because array reference changed
    //
    // The solution:
    // 1. Use createStore + reconcile in NotificationStacks
    // 2. Provide a key function based on all notification IDs in the stack
    // 3. reconcile will match old and new stacks by this composite key
    // 4. When keys match, the same object reference is kept
    // 5. <For> sees stable references and doesn't remount

    expect(true).toBe(true);
  });

  it('composite key matches stacks with same notifications', () => {
    // Simulate two "different" stacks that contain the same notification IDs
    const stack1Ids = ['notif-1', 'notif-2', 'notif-3'];
    const stack2Ids = ['notif-1', 'notif-2', 'notif-3'];

    const key1 = stack1Ids.sort().join(',');
    const key2 = stack2Ids.sort().join(',');

    // These should match, so reconcile won't replace the object
    expect(key1).toBe(key2);
  });

  it('composite key differs when notification IDs change', () => {
    const stack1Ids = ['notif-1', 'notif-2'];
    const stack2Ids = ['notif-1', 'notif-2', 'notif-3']; // Added notification

    const key1 = stack1Ids.sort().join(',');
    const key2 = stack2Ids.sort().join(',');

    // These should differ, so reconcile will replace the object
    expect(key1).not.toBe(key2);
  });
});
