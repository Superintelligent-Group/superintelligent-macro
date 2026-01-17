/**
 * UnifiedList Storybook Stories - Test scenarios for Playwright testing.
 *
 * Each story represents a specific test configuration that can be
 * navigated to via Storybook for isolated component testing.
 */

import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { TestHarness } from './TestHarness';
import {
  type TestEntity,
  FIXTURE_SMALL_LIST,
  FIXTURE_MIXED_TYPES,
  FIXTURE_GROUPED_LIST,
  createLargeList,
  TEST_FILTERS,
  TEST_SORTS,
  testPriorityGroupKeyFn,
  testPriorityGroupRegistry,
  testTypeGroupKeyFn,
  testTypeGroupRegistry,
  testLocalSearchFilter,
} from './fixtures';

// ============================================================================
// Meta
// ============================================================================

const meta = {
  title: 'Testing/UnifiedList',
  component: TestHarness,
  parameters: {
    layout: 'fullscreen',
    // Force dark theme for these test stories
    themes: {
      default: 'Macro Dark',
    },
  },
  decorators: [
    (Story) => (
      <div class="h-screen w-full bg-surface text-ink">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TestHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Basic Navigation Stories
// ============================================================================

/** Basic navigation with hotkeys - j/k, g/G, arrows */
export const BasicNavigation: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: false,
    hotkeys: true, // Use legacy document listener (no scopeId for Storybook)
  },
};

/** Navigation at boundaries - tests that you can't go past first/last */
export const NavigationBoundaries: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST.slice(0, 3),
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: false,
    hotkeys: true,
  },
};

// ============================================================================
// Selection Stories
// ============================================================================

/** Multi-selection with navigation */
export const MultiSelection: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
  },
};

/** Single selection mode */
export const SingleSelection: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'single' },
    hotkeys: true,
  },
};

/** Range selection mode */
export const RangeSelection: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'range' },
    hotkeys: true,
  },
};

// ============================================================================
// Filter Stories
// ============================================================================

/** List with entity type filters */
export const WithFilters: Story = {
  args: {
    entities: FIXTURE_MIXED_TYPES,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    filters: {
      filters: TEST_FILTERS,
    },
  },
};

// ============================================================================
// Sort Stories
// ============================================================================

/** List with sorting options */
export const WithSorting: Story = {
  args: {
    entities: FIXTURE_MIXED_TYPES,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    sorts: {
      sorts: TEST_SORTS,
      defaultSortId: 'updated_at',
      defaultOrder: 'descending',
    },
  },
};

// ============================================================================
// Search Stories
// ============================================================================

/** List with local search */
export const WithSearch: Story = {
  args: {
    entities: FIXTURE_MIXED_TYPES,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    search: {
      localFilter: testLocalSearchFilter,
    },
  },
};

// ============================================================================
// GroupBy Stories
// ============================================================================

/** List with priority grouping */
export const WithGroupByPriority: Story = {
  args: {
    entities: FIXTURE_GROUPED_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    groupBy: {
      groupKeyFn: testPriorityGroupKeyFn,
      groupRegistry: testPriorityGroupRegistry,
    },
  },
};

/** List with entity type grouping */
export const WithGroupByType: Story = {
  args: {
    entities: FIXTURE_MIXED_TYPES,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    groupBy: {
      groupKeyFn: testTypeGroupKeyFn,
      groupRegistry: testTypeGroupRegistry,
    },
  },
};

// ============================================================================
// Virtualization Stories
// ============================================================================

/** Large virtualized list (1000 items) */
export const LargeVirtualizedList: Story = {
  args: {
    entities: createLargeList(1000),
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    rowHeight: 40,
  },
};

/** Medium virtualized list (100 items) for quicker tests */
export const MediumVirtualizedList: Story = {
  args: {
    entities: createLargeList(100),
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    rowHeight: 40,
  },
};

// ============================================================================
// Edge Cases
// ============================================================================

/** Empty list */
export const EmptyList: Story = {
  args: {
    entities: [],
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
  },
};

/** Single item list */
export const SingleItem: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST.slice(0, 1),
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
  },
};

// ============================================================================
// Full Featured
// ============================================================================

/** Full-featured list with all plugins enabled */
export const FullFeatured: Story = {
  args: {
    entities: FIXTURE_MIXED_TYPES,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
    filters: {
      filters: TEST_FILTERS,
    },
    sorts: {
      sorts: TEST_SORTS,
      defaultSortId: 'updated_at',
    },
    search: {
      localFilter: testLocalSearchFilter,
    },
  },
};

// ============================================================================
// Hotkey Focus Stories
// ============================================================================

/** Hotkeys shouldn't fire when input is focused */
export const HotkeyFocusTest: Story = {
  args: {
    entities: FIXTURE_SMALL_LIST,
    navigation: { autoScroll: true, autoSelectFirst: true },
    selection: { mode: 'multi' },
    hotkeys: true,
  },
  render: (args: typeof HotkeyFocusTest.args) => (
    <div class="h-full flex flex-col">
      <div class="p-4 border-b border-border">
        <input
          type="text"
          placeholder="Type here - hotkeys should not fire"
          class="w-full px-3 py-2 bg-surface-raised border border-border rounded text-ink placeholder:text-ink-muted"
          data-testid="focus-input"
        />
      </div>
      <div class="flex-1">
        <TestHarness {...args} />
      </div>
    </div>
  ),
};
