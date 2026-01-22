/**
 * Navigation Tests - Tests for keyboard navigation in UnifiedList.
 *
 * Tests j/k navigation, g/G to start/end, arrow keys, page up/down,
 * and boundary handling.
 */

import { test, expect } from './fixtures';

test.describe('UnifiedList Navigation', () => {
  test.describe('j/k Navigation', () => {
    test('j moves focus down one row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      // Should start focused on first item
      await unifiedListPage.expectFocusedIndex(0);

      // Press j to move down
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(1);

      // Press j again
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(2);
    });

    test('k moves focus up one row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      // Move to 3rd item first
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(2);

      // Press k to move up
      await unifiedListPage.navigateUp();
      await unifiedListPage.expectFocusedIndex(1);

      // Press k again
      await unifiedListPage.navigateUp();
      await unifiedListPage.expectFocusedIndex(0);
    });
  });

  test.describe('Arrow Key Navigation', () => {
    test('ArrowDown moves focus down', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      await unifiedListPage.expectFocusedIndex(0);

      await unifiedListPage.arrowDown();
      await unifiedListPage.expectFocusedIndex(1);
    });

    test('ArrowUp moves focus up', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      // Move down first
      await unifiedListPage.arrowDown();
      await unifiedListPage.arrowDown();
      await unifiedListPage.expectFocusedIndex(2);

      // Move up
      await unifiedListPage.arrowUp();
      await unifiedListPage.expectFocusedIndex(1);
    });
  });

  test.describe('Jump Navigation', () => {
    test('g jumps to the first row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      // Move down several items
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(3);

      // Press g to jump to start
      await unifiedListPage.navigateToStart();
      await unifiedListPage.expectFirstRowFocused();
    });

    test('Shift+G jumps to the last row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      await unifiedListPage.expectFocusedIndex(0);

      // Press Shift+G to jump to end
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectLastRowFocused();
    });
  });

  test.describe('Boundary Handling', () => {
    test('cannot navigate past the first row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('NavigationBoundaries');

      await unifiedListPage.expectFocusedIndex(0);

      // Try to go up from the first item
      await unifiedListPage.navigateUp();
      await unifiedListPage.expectFocusedIndex(0); // Should stay at 0

      // Try with arrow key
      await unifiedListPage.arrowUp();
      await unifiedListPage.expectFocusedIndex(0); // Should stay at 0
    });

    test('cannot navigate past the last row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('NavigationBoundaries');

      // Jump to end
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectLastRowFocused();

      const state = await unifiedListPage.getControllerState();
      const lastIndex = state.entities.length - 1;

      // Try to go down from the last item
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(lastIndex); // Should stay at last

      // Try with arrow key
      await unifiedListPage.arrowDown();
      await unifiedListPage.expectFocusedIndex(lastIndex); // Should stay at last
    });
  });

  test.describe('Page Navigation', () => {
    test('PageDown navigates multiple rows', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MediumVirtualizedList');

      await unifiedListPage.expectFocusedIndex(0);

      // Press PageDown
      await unifiedListPage.pageDown();

      // Should have moved down more than 1 row
      const state = await unifiedListPage.getControllerState();
      const focusedIndex = state.entities.findIndex(
        (e) => e.id === state.focusedId
      );
      expect(focusedIndex).toBeGreaterThan(1);
    });

    test('PageUp navigates multiple rows', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MediumVirtualizedList');

      // Go to the end first
      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectLastRowFocused();

      const state = await unifiedListPage.getControllerState();
      const lastIndex = state.entities.length - 1;

      // Press PageUp
      await unifiedListPage.pageUp();

      // Should have moved up more than 1 row
      const newState = await unifiedListPage.getControllerState();
      const newFocusedIndex = newState.entities.findIndex(
        (e) => e.id === newState.focusedId
      );
      expect(newFocusedIndex).toBeLessThan(lastIndex - 1);
    });
  });

  test.describe('Edge Cases', () => {
    test('single item list - navigation does nothing', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('SingleItem');

      await unifiedListPage.expectFocusedIndex(0);
      await unifiedListPage.expectRowCount(1);

      // Try all navigation directions
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(0);

      await unifiedListPage.navigateUp();
      await unifiedListPage.expectFocusedIndex(0);

      await unifiedListPage.navigateToEnd();
      await unifiedListPage.expectFocusedIndex(0);

      await unifiedListPage.navigateToStart();
      await unifiedListPage.expectFocusedIndex(0);
    });

    test('empty list - no focused item', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('EmptyList');

      await unifiedListPage.expectRowCount(0);

      const focusedId = await unifiedListPage.getFocusedId();
      expect(focusedId).toBeNull();
    });

    test('autoSelectFirst focuses first item on load', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      // First item should be focused immediately after load
      await unifiedListPage.expectFocusedIndex(0);
    });
  });
});
