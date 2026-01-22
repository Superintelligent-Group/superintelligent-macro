/**
 * UnifiedListPage - Playwright Page Object for testing UnifiedList components.
 *
 * Provides helper methods for navigation, selection, and state assertions
 * using the window.__TEST_CONTROLLER__ and window.__TEST_STORES__ interfaces
 * exposed by TestHarness.
 */

import { type Page, expect } from '@playwright/test';

// ============================================================================
// Types from TestHarness
// ============================================================================

type TestCommands = {
  dispatch: (command: string, payload?: unknown) => boolean;
  navigateUp: () => boolean;
  navigateDown: () => boolean;
  navigateStart: () => boolean;
  navigateEnd: () => boolean;
  toggleSelection: () => boolean;
  selectAll: () => boolean;
  clearSelection: () => boolean;
  extendSelectionUp: () => boolean;
  extendSelectionDown: () => boolean;
};

type TestControllerState = {
  focusedId: string | null;
  selectedIds: string[];
  entityCount: number;
  entities: Array<{ id: string; name: string }>;
  isLoading: boolean;
  hasMore: boolean;
  scrollOffset: number;
  visibleEntityIds: string[] | null;
};

type TestStoresState = {
  filter?: {
    activeFilterIds: string[];
  };
  sort?: {
    activeSortId: string | null;
    sortOrder: 'ascending' | 'descending';
  };
  selection?: {
    mode: string;
    selectedIds: string[];
    anchorId: string | null;
  };
  search?: {
    searchText: string;
    isActive: boolean;
    isSearching: boolean;
  };
  groupBy?: {
    enabled: boolean;
    collapsedGroups: string[];
  };
};

/** Extended window interface for testing */
declare global {
  interface Window {
    __TEST_CONTROLLER__: {
      getState: () => TestControllerState;
      commands: TestCommands;
    };
    __TEST_STORES__: {
      getState: () => TestStoresState;
    };
  }
}

// ============================================================================
// Page Object
// ============================================================================

export class UnifiedListPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ==========================================================================
  // Navigation
  // ==========================================================================

  /** Navigate to a specific Storybook story by ID */
  async goto(storyId: string): Promise<void> {
    // Storybook story URL format: /iframe.html?id={storyId}&viewMode=story
    const url = `/iframe.html?id=${storyId}&viewMode=story`;
    await this.page.goto(url);

    // Wait for the test harness to be ready
    await this.waitForReady();
  }

  /** Navigate to a story in the Testing/UnifiedList category */
  async gotoStory(storyName: string): Promise<void> {
    // Convert story name to kebab-case for the URL
    const kebabName = storyName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    await this.goto(`testing-unifiedlist--${kebabName}`);
  }

  /** Wait for the test harness to be fully initialized */
  async waitForReady(): Promise<void> {
    await this.page.waitForFunction(
      () =>
        typeof window.__TEST_CONTROLLER__ !== 'undefined' &&
        typeof window.__TEST_CONTROLLER__.getState === 'function',
      { timeout: 10000 }
    );

    // Wait for at least one entity to be rendered (unless empty list)
    await this.page.waitForFunction(
      () => {
        const state = window.__TEST_CONTROLLER__.getState();
        return state.entityCount >= 0;
      },
      { timeout: 5000 }
    );
  }

  // ==========================================================================
  // Keyboard Navigation
  // ==========================================================================

  /** Press j to navigate down */
  async navigateDown(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('j');
    await this.waitForStateUpdate();
  }

  /** Press k to navigate up */
  async navigateUp(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('k');
    await this.waitForStateUpdate();
  }

  /** Press g to navigate to start */
  async navigateToStart(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('g');
    await this.waitForStateUpdate();
  }

  /** Press Shift+G to navigate to end */
  async navigateToEnd(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Shift+g');
    await this.waitForStateUpdate();
  }

  /** Press ArrowDown */
  async arrowDown(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('ArrowDown');
    await this.waitForStateUpdate();
  }

  /** Press ArrowUp */
  async arrowUp(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('ArrowUp');
    await this.waitForStateUpdate();
  }

  /** Press PageDown for page navigation */
  async pageDown(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('PageDown');
    await this.waitForStateUpdate();
  }

  /** Press PageUp for page navigation */
  async pageUp(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('PageUp');
    await this.waitForStateUpdate();
  }

  // ==========================================================================
  // Selection
  // ==========================================================================

  /** Press x to toggle selection */
  async toggleSelection(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('x');
    await this.waitForStateUpdate();
  }

  /** Press Meta+A to select all */
  async selectAll(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Meta+a');
    await this.waitForStateUpdate();
  }

  /** Press Escape to clear selection */
  async clearSelection(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Escape');
    await this.waitForStateUpdate();
  }

  /** Press Shift+J to extend selection down */
  async extendSelectionDown(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Shift+j');
    await this.waitForStateUpdate();
  }

  /** Press Shift+K to extend selection up */
  async extendSelectionUp(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Shift+k');
    await this.waitForStateUpdate();
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /** Press Enter to open entity */
  async openEntity(): Promise<void> {
    await this.focusList();
    await this.page.keyboard.press('Enter');
    await this.waitForStateUpdate();
  }

  // ==========================================================================
  // State Getters
  // ==========================================================================

  /** Get the current controller state */
  async getControllerState(): Promise<TestControllerState> {
    return await this.page.evaluate(() =>
      window.__TEST_CONTROLLER__.getState()
    );
  }

  /** Get the current stores state */
  async getStoresState(): Promise<TestStoresState> {
    return await this.page.evaluate(() => window.__TEST_STORES__.getState());
  }

  /** Get the currently focused entity ID */
  async getFocusedId(): Promise<string | null> {
    const state = await this.getControllerState();
    return state.focusedId;
  }

  /** Get the selected entity IDs */
  async getSelectedIds(): Promise<string[]> {
    const state = await this.getControllerState();
    return state.selectedIds;
  }

  /** Get the entity count */
  async getEntityCount(): Promise<number> {
    const state = await this.getControllerState();
    return state.entityCount;
  }

  /** Get all entities */
  async getEntities(): Promise<Array<{ id: string; name: string }>> {
    const state = await this.getControllerState();
    return state.entities;
  }

  // ==========================================================================
  // Assertions
  // ==========================================================================

  /** Assert that the specified row is focused */
  async expectFocusedRow(id: string): Promise<void> {
    const focusedId = await this.getFocusedId();
    expect(focusedId).toBe(id);
  }

  /** Assert that the focused row is at a specific index */
  async expectFocusedIndex(index: number): Promise<void> {
    const state = await this.getControllerState();
    const expectedId = state.entities[index]?.id;
    expect(state.focusedId).toBe(expectedId);
  }

  /** Assert that specific IDs are selected */
  async expectSelectedIds(ids: string[]): Promise<void> {
    const selectedIds = await this.getSelectedIds();
    expect(selectedIds.sort()).toEqual(ids.sort());
  }

  /** Assert selection count */
  async expectSelectionCount(count: number): Promise<void> {
    const selectedIds = await this.getSelectedIds();
    expect(selectedIds.length).toBe(count);
  }

  /** Assert entity count */
  async expectRowCount(count: number): Promise<void> {
    const entityCount = await this.getEntityCount();
    expect(entityCount).toBe(count);
  }

  /** Assert no entities are selected */
  async expectNoSelection(): Promise<void> {
    const selectedIds = await this.getSelectedIds();
    expect(selectedIds.length).toBe(0);
  }

  /** Assert the first entity is focused */
  async expectFirstRowFocused(): Promise<void> {
    await this.expectFocusedIndex(0);
  }

  /** Assert the last entity is focused */
  async expectLastRowFocused(): Promise<void> {
    const state = await this.getControllerState();
    const lastIndex = state.entities.length - 1;
    await this.expectFocusedIndex(lastIndex);
  }

  /** Assert active filter IDs */
  async expectActiveFilters(filterIds: string[]): Promise<void> {
    const storesState = await this.getStoresState();
    expect(storesState.filter?.activeFilterIds.sort()).toEqual(
      filterIds.sort()
    );
  }

  /** Assert active sort */
  async expectActiveSort(
    sortId: string,
    order: 'ascending' | 'descending'
  ): Promise<void> {
    const storesState = await this.getStoresState();
    expect(storesState.sort?.activeSortId).toBe(sortId);
    expect(storesState.sort?.sortOrder).toBe(order);
  }

  // ==========================================================================
  // Command Dispatch
  // ==========================================================================

  /** Dispatch a command via the window interface */
  async dispatchCommand(command: string, payload?: unknown): Promise<boolean> {
    return await this.page.evaluate(
      ({ cmd, pl }) => window.__TEST_CONTROLLER__.commands.dispatch(cmd, pl),
      { cmd: command, pl: payload }
    );
  }

  /** Toggle a filter by ID */
  async toggleFilter(filterId: string): Promise<void> {
    await this.dispatchCommand('list:toggle-filter', { filterId });
    await this.waitForStateUpdate();
  }

  // ==========================================================================
  // Virtualization Helpers
  // ==========================================================================

  /** Get the number of rendered DOM elements (for virtualization testing) */
  async getRenderedRowCount(): Promise<number> {
    return await this.page.evaluate(() => {
      const container = document.querySelector('[data-unified-list-container]');
      if (!container) return 0;
      return container.querySelectorAll('[data-entity-id]').length;
    });
  }

  /** Scroll to a specific entity */
  async scrollToEntity(entityId: string): Promise<void> {
    const state = await this.getControllerState();
    const index = state.entities.findIndex((e) => e.id === entityId);
    if (index === -1) return;

    // Focus the entity to trigger scroll
    await this.page.evaluate(
      ({ id }) => {
        window.__TEST_CONTROLLER__.commands.dispatch('NAVIGATE_TO', { id });
      },
      { id: entityId }
    );
    await this.waitForStateUpdate();
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /** Focus the list container to ensure keyboard events are captured */
  async focusList(): Promise<void> {
    const container = this.page.locator('[data-unified-list-container]');
    await container.focus();
  }

  /** Wait for state to update after an action */
  async waitForStateUpdate(): Promise<void> {
    // Small delay to allow reactive updates to propagate
    await this.page.waitForTimeout(50);
  }

  /** Type in an input field (for testing hotkey focus prevention) */
  async focusInput(testId: string): Promise<void> {
    const input = this.page.getByTestId(testId);
    await input.focus();
  }

  /** Check if an input is focused */
  async isInputFocused(testId: string): Promise<boolean> {
    const input = this.page.getByTestId(testId);
    return await input.evaluate((el) => document.activeElement === el);
  }
}
