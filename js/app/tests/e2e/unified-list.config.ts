/**
 * Playwright config for Unified List Storybook tests.
 *
 * These tests run against Storybook for isolated component testing
 * without needing the main app or authentication.
 *
 * Usage (from js/app):
 *   bunx playwright test --config tests/e2e/unified-list.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const configDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(configDir, '../..');
const testDir = path.join(rootDir, 'packages/unified-list/tests/e2e');

export default defineConfig({
  testDir,
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list', { printSteps: true }], ['html']]
    : 'list',

  use: {
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

  webServer: {
    command: 'bun run storybook --ci',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: path.join(rootDir, 'packages/ui'),
  },
});
