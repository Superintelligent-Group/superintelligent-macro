/**
 * Playwright config for Unified List Storybook tests.
 *
 * These tests run against Storybook for isolated component testing
 * without needing the main app or authentication.
 *
 * Usage:
 *   bunx playwright test --config tests/e2e/unified-list/playwright.config.ts
 *
 * Or start Storybook manually first:
 *   cd packages/ui && bun run storybook
 *   bunx playwright test --config tests/e2e/unified-list/playwright.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

// Resolve paths relative to this config file
const configDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(configDir, '../../..');

export default defineConfig({
  testDir: configDir,
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list', { printSteps: true }], ['html']]
    : 'list',

  use: {
    // Base URL for Storybook
    baseURL: 'http://localhost:6006',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run Storybook dev server before tests
  webServer: {
    command: 'bun run storybook --ci',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Storybook can take time to start
    cwd: path.join(rootDir, 'packages/ui'),
  },
});
