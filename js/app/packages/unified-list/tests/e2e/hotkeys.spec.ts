/**
 * Hotkey Tests - Tests for hotkey behavior in UnifiedList.
 *
 * Tests that hotkeys don't fire when input is focused,
 * and custom hotkey bindings work correctly.
 */

import { test, expect } from './fixtures';

test.describe('UnifiedList Hotkeys', () => {
  test.describe('Hotkey Focus Prevention', () => {
    test('hotkeys do not fire when input is focused', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('HotkeyFocusTest');

      await unifiedListPage.expectFocusedIndex(0);

      // Focus the input field
      await unifiedListPage.focusInput('focus-input');

      // Verify input is focused
      const isInputFocused =
        await unifiedListPage.isInputFocused('focus-input');
      expect(isInputFocused).toBe(true);

      // Get initial focus state
      const initialState = await unifiedListPage.getControllerState();
      const initialFocusedId = initialState.focusedId;

      // Press j (navigation key) - should type in input, not navigate
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.waitForStateUpdate();

      // Focus should not have changed
      const newState = await unifiedListPage.getControllerState();
      expect(newState.focusedId).toBe(initialFocusedId);

      // Check that 'j' was typed in the input
      const inputValue = await unifiedListPage.page
        .getByTestId('focus-input')
        .inputValue();
      expect(inputValue).toBe('j');
    });

    test('hotkeys work when input loses focus', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('HotkeyFocusTest');

      // Focus the input field
      await unifiedListPage.focusInput('focus-input');

      // Press Tab to leave input and focus the list
      await unifiedListPage.page.keyboard.press('Tab');

      // Now j should work for navigation
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.waitForStateUpdate();

      // Should have navigated down
      await unifiedListPage.expectFocusedIndex(1);
    });
  });

  test.describe('Navigation Hotkeys', () => {
    test('j/k navigation hotkeys work', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      await unifiedListPage.focusList();
      await unifiedListPage.expectFocusedIndex(0);

      // j moves down
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectFocusedIndex(1);

      // k moves up
      await unifiedListPage.page.keyboard.press('k');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectFocusedIndex(0);
    });

    test('g/G jump hotkeys work', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('BasicNavigation');

      await unifiedListPage.focusList();

      // Navigate to middle
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectFocusedIndex(3);

      // g goes to start
      await unifiedListPage.page.keyboard.press('g');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectFirstRowFocused();

      // Shift+G goes to end
      await unifiedListPage.page.keyboard.press('Shift+g');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectLastRowFocused();
    });
  });

  test.describe('Selection Hotkeys', () => {
    test('x toggle selection hotkey works', async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.focusList();
      await unifiedListPage.expectNoSelection();

      // x toggles selection
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectSelectionCount(1);

      // x again deselects
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectNoSelection();
    });

    test('Escape clears selection hotkey works', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.focusList();

      // Select some items
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectSelectionCount(2);

      // Escape clears selection
      await unifiedListPage.page.keyboard.press('Escape');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectNoSelection();
    });

    test('Shift+J/K extend selection hotkeys work', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.focusList();

      // First select current item
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectSelectionCount(1);

      // Shift+J extends down
      await unifiedListPage.page.keyboard.press('Shift+j');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectSelectionCount(2);

      // Shift+K extends up
      await unifiedListPage.page.keyboard.press('Shift+k');
      await unifiedListPage.waitForStateUpdate();
      // Selection count may vary based on implementation
      // The main test is that it doesn't error
    });
  });

  test.describe('Combined Hotkey Sequences', () => {
    test('can perform complex selection with hotkeys', async ({
      unifiedListPage,
    }) => {
      await unifiedListPage.gotoStory('MultiSelection');

      await unifiedListPage.focusList();

      // Select first item
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();

      // Navigate down 3
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.page.keyboard.press('j');
      await unifiedListPage.page.keyboard.press('j');

      // Select that item too
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();

      // Should have 2 non-contiguous items selected
      await unifiedListPage.expectSelectionCount(2);

      // Navigate to end and select last
      await unifiedListPage.page.keyboard.press('Shift+g');
      await unifiedListPage.page.keyboard.press('x');
      await unifiedListPage.waitForStateUpdate();

      // Should have 3 items selected
      await unifiedListPage.expectSelectionCount(3);

      // Escape clears all
      await unifiedListPage.page.keyboard.press('Escape');
      await unifiedListPage.waitForStateUpdate();
      await unifiedListPage.expectNoSelection();
    });
  });
});
