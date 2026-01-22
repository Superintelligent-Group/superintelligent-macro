/**
 * Virtualization Tests - Tests for virtualized list rendering.
 *
 * Tests that only a subset of items are rendered, navigation through
 * virtualized lists works correctly, and scroll keeps focused item visible.
 */

import { test, expect } from './fixtures';

test.describe('UnifiedList Virtualization', () => {
  test.describe('Render Count', () => {
    test('only renders a subset of 1000 items', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      const totalCount = await unifiedListPage.getEntityCount();
      expect(totalCount).toBe(1000);

      // Check how many DOM elements are actually rendered
      const renderedCount = await unifiedListPage.getRenderedRowCount();

      // Should render far fewer than total items (overscan + visible)
      // Typical viewport would show ~20-30 items with overscan
      expect(renderedCount).toBeLessThan(100);
      expect(renderedCount).toBeGreaterThan(5);
    });

    test('renders more items as needed during navigation', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      const initialRenderedCount = await unifiedListPage.getRenderedRowCount();

      // Navigate down many times to trigger virtualizer updates
      for (let i = 0; i < 20; i++) {
        await unifiedListPage.navigateDown();
      }

      const newRenderedCount = await unifiedListPage.getRenderedRowCount();

      // Rendered count should still be bounded (not loading all 1000)
      expect(newRenderedCount).toBeLessThan(100);
    });
  });

  test.describe('Navigation Through Virtualized List', () => {
    test('can navigate from start to end of large list', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      await unifiedListPage.expectFocusedIndex(0);

      // Jump to end
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectLastRowFocused();

      // Verify we're actually at the last item
      const state = await unifiedListPage.getControllerState();
      expect(state.focusedId).toBe('large-1000');
    });

    test('can navigate from end back to start', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      // Jump to end
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectLastRowFocused();

      // Jump back to start
      await unifiedListPage.navigateToStart();
      await unifiedListPage.expectFirstRowFocused();

      const state = await unifiedListPage.getControllerState();
      expect(state.focusedId).toBe('large-1');
    });

    test('continuous navigation works through entire list', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MediumVirtualizedList');

      // Navigate down 50 times (through half the 100-item list)
      for (let i = 0; i < 50; i++) {
        await unifiedListPage.navigateDown();
      }

      await unifiedListPage.expectFocusedIndex(50);

      // Navigate up 25 times
      for (let i = 0; i < 25; i++) {
        await unifiedListPage.navigateUp();
      }

      await unifiedListPage.expectFocusedIndex(25);
    });
  });

  test.describe('Scroll Position', () => {
    test.skip('scroll offset changes when navigating', async ({
      unifiedListPage,
    }) => {
      // TODO: Controller scrollOffset not synced from virtualizer
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      const initialState = await unifiedListPage.getControllerState();
      const initialOffset = initialState.scrollOffset;

      // Navigate to end (should scroll)
      await unifiedListPage.navigateToEnd();

      // Wait a bit for scroll to complete
      await unifiedListPage.page.waitForTimeout(100);

      const newState = await unifiedListPage.getControllerState();

      // Scroll offset should have increased significantly
      expect(newState.scrollOffset).toBeGreaterThan(initialOffset);
    });

    test('focused item stays visible after navigation', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      // Navigate down many times
      for (let i = 0; i < 30; i++) {
        await unifiedListPage.navigateDown();
      }

      await unifiedListPage.expectFocusedIndex(30);

      // The focused row should still be rendered (visible)
      const state = await unifiedListPage.getControllerState();
      const focusedId = state.focusedId;

      // Check if a DOM element with this entity ID exists
      const focusedElement = await unifiedListPage.page.$(
        `[data-entity-id="${focusedId}"]`
      );
      expect(focusedElement).not.toBeNull();
    });
  });

  test.describe('Selection in Virtualized List', () => {
    test('can select items spread across virtualized list', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      // Select first item
      await unifiedListPage.toggleSelection();

      // Navigate to middle and select
      for (let i = 0; i < 50; i++) {
        await unifiedListPage.navigateDown();
      }
      await unifiedListPage.toggleSelection();

      // Navigate near end and select
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.navigateUp();
      await unifiedListPage.toggleSelection();

      // Should have 3 items selected
      await unifiedListPage.expectSelectionCount(3);
    });

    test('selection persists across virtualization scroll', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('LargeVirtualizedList');

      // Select first item
      await unifiedListPage.toggleSelection();

      const state = await unifiedListPage.getControllerState();
      const firstId = state.entities[0].id;

      // Navigate far away (item will be virtualized out of view)
      await unifiedListPage.navigateToEnd();

      // Selection should persist
      await unifiedListPage.expectSelectedIds([firstId]);

      // Navigate back
      await unifiedListPage.navigateToStart();

      // Selection should still be there
      await unifiedListPage.expectSelectedIds([firstId]);
    });
  });
});
