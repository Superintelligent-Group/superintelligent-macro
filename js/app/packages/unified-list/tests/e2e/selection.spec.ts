/**
 * Selection Tests - Tests for selection behavior in UnifiedList.
 *
 * Tests x to toggle selection, Escape to clear, Shift+J/K to extend,
 * and different selection modes (single, multi, range).
 */

import { test, expect } from './fixtures';

test.describe('UnifiedList Selection', () => {
  test.describe('Toggle Selection (x key)', () => {
    test('x toggles selection of focused row', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.expectFocusedIndex(0);
      await unifiedListPage.expectNoSelection();

      // Press x to select
      await unifiedListPage.toggleSelection();
      await unifiedListPage.expectSelectionCount(1);

      const state = await unifiedListPage.getControllerState();
      const firstId = state.entities[0].id;
      await unifiedListPage.expectSelectedIds([firstId]);
    });

    test('x toggles selection off if already selected', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Select the first item
      await unifiedListPage.toggleSelection();
      await unifiedListPage.expectSelectionCount(1);

      // Toggle again to deselect
      await unifiedListPage.toggleSelection();
      await unifiedListPage.expectNoSelection();
    });

    test('multiple items can be selected in multi mode', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Select first item
      await unifiedListPage.toggleSelection();

      // Move down and select second item
      await unifiedListPage.navigateDown();
      await unifiedListPage.toggleSelection();

      // Move down and select third item
      await unifiedListPage.navigateDown();
      await unifiedListPage.toggleSelection();

      await unifiedListPage.expectSelectionCount(3);
    });
  });

  test.describe('Clear Selection (Escape)', () => {
    test('Escape clears all selection', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Select multiple items
      await unifiedListPage.toggleSelection();
      await unifiedListPage.navigateDown();
      await unifiedListPage.toggleSelection();
      await unifiedListPage.navigateDown();
      await unifiedListPage.toggleSelection();

      await unifiedListPage.expectSelectionCount(3);

      // Press Escape to clear
      await unifiedListPage.clearSelection();
      await unifiedListPage.expectNoSelection();
    });

    test('Escape does not change focus', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Navigate to 3rd item
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(2);

      // Select and clear
      await unifiedListPage.toggleSelection();
      await unifiedListPage.clearSelection();

      // Focus should remain on 3rd item
      await unifiedListPage.expectFocusedIndex(2);
    });
  });

  test.describe('Extend Selection (Shift+J/K)', () => {
    test('Shift+J extends selection down', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // First select the current item
      await unifiedListPage.toggleSelection();
      await unifiedListPage.expectSelectionCount(1);

      // Extend selection down
      await unifiedListPage.extendSelectionDown();
      await unifiedListPage.expectSelectionCount(2);

      // Extend again
      await unifiedListPage.extendSelectionDown();
      await unifiedListPage.expectSelectionCount(3);
    });

    test('Shift+K extends selection up', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Navigate to 3rd item
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(2);

      // Select and extend up
      await unifiedListPage.toggleSelection();
      await unifiedListPage.extendSelectionUp();
      await unifiedListPage.expectSelectionCount(2);

      // Extend again
      await unifiedListPage.extendSelectionUp();
      await unifiedListPage.expectSelectionCount(3);
    });
  });

  test.describe('Single Selection Mode', () => {
    test.skip('only one item can be selected at a time', async ({
      unifiedListPage,
    }) => {
      // TODO: Selection plugin doesn't enforce single-mode deselection
      await unifiedListPage.gotoStory('SingleSelection');

      // Select first item
      await unifiedListPage.toggleSelection();
      await unifiedListPage.expectSelectionCount(1);

      const state = await unifiedListPage.getControllerState();
      const firstId = state.entities[0].id;
      await unifiedListPage.expectSelectedIds([firstId]);

      // Move and select second item
      await unifiedListPage.navigateDown();
      await unifiedListPage.toggleSelection();

      // Should only have one item selected (the second one)
      await unifiedListPage.expectSelectionCount(1);

      const newState = await unifiedListPage.getControllerState();
      const secondId = newState.entities[1].id;
      await unifiedListPage.expectSelectedIds([secondId]);
    });
  });

  test.describe('Select All', () => {
    test('Shift+A selects all items', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      const state = await unifiedListPage.getControllerState();
      const totalCount = state.entityCount;

      await unifiedListPage.selectAll();
      await unifiedListPage.expectSelectionCount(totalCount);
    });

    test('select all then Escape clears all', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.selectAll();
      const state = await unifiedListPage.getControllerState();
      expect(state.selectedIds.length).toBe(state.entityCount);

      await unifiedListPage.clearSelection();
      await unifiedListPage.expectNoSelection();
    });
  });

  test.describe('Selection Persistence During Navigation', () => {
    test('selection persists when navigating', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      // Select first item
      await unifiedListPage.toggleSelection();

      const state = await unifiedListPage.getControllerState();
      const firstId = state.entities[0].id;
      await unifiedListPage.expectSelectedIds([firstId]);

      // Navigate away
      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();
      await unifiedListPage.expectFocusedIndex(2);

      // Selection should persist
      await unifiedListPage.expectSelectedIds([firstId]);
    });

    test('can select items while navigating', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      const state = await unifiedListPage.getControllerState();
      const ids: string[] = [];

      // Select while navigating
      ids.push(state.entities[0].id);
      await unifiedListPage.toggleSelection();

      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();

      ids.push(state.entities[2].id);
      await unifiedListPage.toggleSelection();

      await unifiedListPage.navigateDown();
      await unifiedListPage.navigateDown();

      ids.push(state.entities[4].id);
      await unifiedListPage.toggleSelection();

      await unifiedListPage.expectSelectedIds(ids);
    });
  });
});
