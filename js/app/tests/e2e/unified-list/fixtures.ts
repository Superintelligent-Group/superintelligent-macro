/**
 * Playwright Test Fixtures for Unified List Testing.
 *
 * Extends the base Playwright test with the UnifiedListPage fixture
 * for convenient access in all test files.
 */

import { test as base } from '@playwright/test';
import { UnifiedListPage } from './UnifiedListPage';

// ============================================================================
// Extended Test Fixture
// ============================================================================

type UnifiedListFixtures = {
  unifiedListPage: UnifiedListPage;
};

/**
 * Extended test with UnifiedListPage fixture.
 *
 * Usage:
 * ```ts
 * import { test, expect } from './fixtures';
 *
 * test('navigation test', async ({ unifiedListPage }) => {
 *   await unifiedListPage.gotoStory('BasicNavigation');
 *   await unifiedListPage.navigateDown();
 *   await unifiedListPage.expectFocusedIndex(1);
 * });
 * ```
 */
export const test = base.extend<UnifiedListFixtures>({
  unifiedListPage: async ({ page }, use) => {
    const unifiedListPage = new UnifiedListPage(page);
    await use(unifiedListPage);
  },
});

export { expect } from '@playwright/test';

// ============================================================================
// Test Utility Functions
// ============================================================================

/**
 * Helper to run a test against multiple stories.
 * Useful for testing the same behavior across different configurations.
 */
export function testMultipleStories(
  stories: string[],
  testFn: (unifiedListPage: UnifiedListPage, storyName: string) => Promise<void>
): void {
  for (const story of stories) {
    test(`${story}`, async ({ unifiedListPage }) => {
      await unifiedListPage.gotoStory(story);
      await testFn(unifiedListPage, story);
    });
  }
}

/**
 * Helper to wait for an entity to be focused with retry.
 * Useful for tests where focus may take time to update.
 */
export async function waitForFocusedEntity(
  page: UnifiedListPage,
  expectedId: string,
  maxRetries = 5
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const focusedId = await page.getFocusedId();
    if (focusedId === expectedId) {
      return;
    }
    await page.waitForStateUpdate();
  }
  // Final assertion to fail the test with a clear message
  await page.expectFocusedRow(expectedId);
}
