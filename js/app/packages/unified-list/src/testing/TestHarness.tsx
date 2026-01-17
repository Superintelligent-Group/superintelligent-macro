/**
 * TestHarness - Configurable wrapper for testing UnifiedList components.
 *
 * Exposes controller and stores on window for Playwright assertions.
 * Used with Storybook stories for isolated component testing.
 */

import { createSignal, onCleanup, type JSX } from 'solid-js';
import {
  UnifiedListView,
  type RowRenderState,
} from '../components/UnifiedListView';
import type { Plugin, ListController, CleanupFn } from '../types';
import {
  createFilterPlugin,
  type FilterPluginConfig,
  type FilterStore,
} from '../plugins/filterPlugin';
import {
  createSortPlugin,
  type SortPluginConfig,
  type SortStore,
} from '../plugins/sortPlugin';
import {
  createNavigationPlugin,
  type NavigationPluginConfig,
} from '../plugins/navigationPlugin';
import {
  createSelectionPlugin,
  type SelectionPluginConfig,
  type SelectionStore,
} from '../plugins/selectionPlugin';
import {
  createHotkeyPlugin,
  type HotkeyPluginConfig,
} from '../plugins/hotkeyPlugin';
import {
  createSearchPlugin,
  type SearchPluginConfig,
  type SearchStore,
} from '../plugins/searchPlugin';
import type { GroupByPluginConfig, GroupStore } from '../types/groupBy';
import { createGroupStore } from '../plugins/groupByPlugin';
import type { TestEntity } from './fixtures';

// ============================================================================
// Window Interface Extension
// ============================================================================

/** Controller state exposed for Playwright assertions */
export type TestControllerState = {
  focusedId: string | null;
  selectedIds: string[];
  entityCount: number;
  entities: Array<{ id: string; name: string }>;
  isLoading: boolean;
  hasMore: boolean;
  scrollOffset: number;
  visibleEntityIds: readonly string[] | null;
};

/** Stores state exposed for Playwright assertions */
export type TestStoresState = {
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

/** Commands that can be dispatched via window */
export type TestCommands = {
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
// Test Harness Config
// ============================================================================

export type TestHarnessConfig<T extends { id: string }> = {
  /** Test entities to display */
  entities: T[];
  /** Enable navigation plugin */
  navigation?: NavigationPluginConfig | boolean;
  /** Enable selection plugin */
  selection?: SelectionPluginConfig | boolean;
  /** Enable hotkeys plugin */
  hotkeys?: HotkeyPluginConfig | boolean;
  /** Enable filter plugin */
  filters?: FilterPluginConfig<T>;
  /** Enable sort plugin */
  sorts?: SortPluginConfig<T>;
  /** Enable search plugin */
  search?: SearchPluginConfig<T>;
  /** Enable groupBy plugin */
  groupBy?: GroupByPluginConfig<T>;
  /** Row height in pixels */
  rowHeight?: number;
  /** Custom row renderer */
  renderRow?: (entity: T, state: RowRenderState) => JSX.Element;
  /** Initial focused entity ID */
  initialFocusedId?: string;
  /** Container class */
  class?: string;
};

// ============================================================================
// Default Row Renderer (styled to match app theme)
// ============================================================================

/** Get entity type icon based on type */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'document':
      return '📄';
    case 'task':
      return '✓';
    case 'email':
      return '✉️';
    case 'channel':
      return '#';
    default:
      return '•';
  }
}

function DefaultTestRow(props: {
  entity: TestEntity;
  state: RowRenderState;
}): JSX.Element {
  const baseClasses =
    'group flex items-center gap-2 px-2 h-10 cursor-pointer transition-colors';
  const focusClasses = props.state.focused
    ? 'bg-accent/10 outline outline-1 outline-accent/30 outline-offset-[-1px]'
    : 'hover:bg-hover/30';
  const checkedClasses = props.state.checked ? 'bg-accent/5' : '';

  return (
    <div
      class={`${baseClasses} ${focusClasses} ${checkedClasses}`}
      data-entity-id={props.entity.id}
      data-focused={props.state.focused}
      data-checked={props.state.checked}
    >
      {/* Checkbox/indicator column */}
      <div class="w-8 flex items-center justify-center shrink-0">
        {props.state.checked ? (
          <div class="w-4 h-4 rounded bg-accent flex items-center justify-center">
            <svg class="w-3 h-3 text-white" viewBox="0 0 12 12">
              <path
                fill="currentColor"
                d="M10.28 2.28a.75.75 0 0 0-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z"
              />
            </svg>
          </div>
        ) : (
          <div class="w-4 h-4 rounded border border-border-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Icon */}
      <div class="w-5 h-5 flex items-center justify-center text-ink-muted shrink-0">
        {getTypeIcon(props.entity.type)}
      </div>

      {/* Title */}
      <div class="flex-1 min-w-0 truncate text-ink">{props.entity.name}</div>

      {/* Type badge */}
      <div class="text-xs text-ink-faint px-1.5 py-0.5 rounded bg-surface-raised shrink-0">
        {props.entity.type}
      </div>

      {/* Priority indicator (for grouped items) */}
      {props.entity.priority && (
        <div
          class="w-2 h-2 rounded-full shrink-0"
          classList={{
            'bg-red-500': props.entity.priority === 'high',
            'bg-yellow-500': props.entity.priority === 'medium',
            'bg-green-500': props.entity.priority === 'low',
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Test Exposer Plugin - Exposes controller to window for Playwright
// ============================================================================

type TestExposerPluginConfig<T extends { id: string }> = {
  filterStore?: FilterStore<T>;
  sortStore?: SortStore<T>;
  selectionStore?: SelectionStore;
  searchStore?: SearchStore;
};

/**
 * Creates a plugin that exposes the controller and stores to window.
 * This plugin runs when the controller is ready, solving the context timing issue.
 */
function createTestExposerPlugin<T extends { id: string }>(
  config: TestExposerPluginConfig<T>
): Plugin<T> {
  return (controller: ListController<T>): CleanupFn => {
    // Expose controller state and commands on window
    window.__TEST_CONTROLLER__ = {
      getState: (): TestControllerState => ({
        focusedId: controller.state.focusedId(),
        selectedIds: Array.from(controller.state.selectedIds()),
        entityCount: controller.state.entities().length,
        entities: controller.state.entities().map((e) => ({
          id: e.id,
          name: (e as unknown as TestEntity).name ?? e.id,
        })),
        isLoading: controller.state.isLoading(),
        hasMore: controller.state.hasMore(),
        scrollOffset: controller.state.scrollOffset(),
        visibleEntityIds: controller.state.visibleEntityIds(),
      }),
      commands: {
        dispatch: (command: string, payload?: unknown) =>
          controller.commands.dispatch(command, payload),
        navigateUp: () =>
          controller.commands.dispatch('NAVIGATE_UP', undefined),
        navigateDown: () =>
          controller.commands.dispatch('NAVIGATE_DOWN', undefined),
        navigateStart: () =>
          controller.commands.dispatch('NAVIGATE_START', undefined),
        navigateEnd: () =>
          controller.commands.dispatch('NAVIGATE_END', undefined),
        toggleSelection: () =>
          controller.commands.dispatch('TOGGLE_SELECTION', undefined),
        selectAll: () => controller.commands.dispatch('SELECT_ALL', undefined),
        clearSelection: () =>
          controller.commands.dispatch('CLEAR_SELECTION', undefined),
        extendSelectionUp: () =>
          controller.commands.dispatch('EXTEND_SELECTION_UP', undefined),
        extendSelectionDown: () =>
          controller.commands.dispatch('EXTEND_SELECTION_DOWN', undefined),
      },
    };

    // Expose store states
    window.__TEST_STORES__ = {
      getState: (): TestStoresState => {
        const state: TestStoresState = {};

        if (config.filterStore) {
          state.filter = {
            activeFilterIds: Array.from(config.filterStore.activeFilterIds()),
          };
        }

        if (config.sortStore) {
          state.sort = {
            activeSortId: config.sortStore.activeSortId(),
            sortOrder: config.sortStore.sortOrder(),
          };
        }

        if (config.selectionStore) {
          state.selection = {
            mode: config.selectionStore.mode(),
            selectedIds: Array.from(config.selectionStore.selectedIds()),
            anchorId: config.selectionStore.anchorId(),
          };
        }

        if (config.searchStore) {
          state.search = {
            searchText: config.searchStore.searchText(),
            isActive: config.searchStore.isActive(),
            isSearching: config.searchStore.isSearching(),
          };
        }

        return state;
      },
    };

    // Return cleanup function
    return () => {
      // @ts-expect-error - Cleaning up test interface
      delete window.__TEST_CONTROLLER__;
      // @ts-expect-error - Cleaning up test interface
      delete window.__TEST_STORES__;
    };
  };
}

// ============================================================================
// Test Harness Component
// ============================================================================

export function TestHarness<T extends { id: string } = TestEntity>(
  props: TestHarnessConfig<T>
): JSX.Element {
  const [entities] = createSignal<T[]>(props.entities);

  // Build plugins array
  const plugins: Plugin<T>[] = [];

  // Track stores for exposing to window
  let filterStore: FilterStore<T> | undefined;
  let sortStore: SortStore<T> | undefined;
  let selectionStore: SelectionStore | undefined;
  let searchStore: SearchStore | undefined;

  // Configure navigation
  if (props.navigation !== false) {
    const navConfig =
      typeof props.navigation === 'object'
        ? props.navigation
        : { autoScroll: true, autoSelectFirst: true };
    plugins.push(createNavigationPlugin(navConfig));
  }

  // Configure selection
  if (props.selection !== false) {
    const selConfig =
      typeof props.selection === 'object'
        ? props.selection
        : { mode: 'multi' as const };
    const selectionPlugin = createSelectionPlugin<T>(selConfig);
    selectionStore = selectionPlugin.store;
    plugins.push(selectionPlugin);
  }

  // Configure hotkeys
  // Note: For Storybook testing, we use the legacy document listener (no scopeId)
  // because the app's hotkey scope system isn't available in isolation
  if (props.hotkeys !== false) {
    const hotkeyConfig = typeof props.hotkeys === 'object' ? props.hotkeys : {};
    plugins.push(createHotkeyPlugin(hotkeyConfig));
  }

  // Configure filters
  if (props.filters) {
    const filterPlugin = createFilterPlugin<T>(props.filters);
    filterStore = filterPlugin.store;
    plugins.push(filterPlugin);
  }

  // Configure sorts
  if (props.sorts) {
    const sortPlugin = createSortPlugin<T>(props.sorts);
    sortStore = sortPlugin.store;
    plugins.push(sortPlugin);
  }

  // Configure search
  if (props.search) {
    const searchPlugin = createSearchPlugin<T>(props.search);
    searchStore = searchPlugin.store;
    plugins.push(searchPlugin);
  }

  // Add the test exposer plugin - this exposes controller to window
  plugins.push(
    createTestExposerPlugin<T>({
      filterStore,
      sortStore,
      selectionStore,
      searchStore,
    })
  );

  // Create groupBy store if needed
  const groupByStore: GroupStore<T> | undefined = props.groupBy
    ? createGroupStore<T>(
        props.groupBy.groupKeyFn,
        props.groupBy.groupRegistry,
        props.groupBy.initialCollapsed,
        props.groupBy.initialEnabled ?? true
      )
    : undefined;

  const rowHeight = props.rowHeight ?? 40;
  const renderRow =
    props.renderRow ??
    ((entity: T, state: RowRenderState) => (
      <DefaultTestRow entity={entity as unknown as TestEntity} state={state} />
    ));

  // Cleanup on unmount
  onCleanup(() => {
    // @ts-expect-error - Cleaning up test interface
    delete window.__TEST_CONTROLLER__;
    // @ts-expect-error - Cleaning up test interface
    delete window.__TEST_STORES__;
  });

  return (
    <div class={`h-full ${props.class ?? ''}`} data-testid="test-harness">
      <UnifiedListView
        id="test-harness"
        entities={entities}
        plugins={plugins}
        renderRow={renderRow}
        rowHeight={rowHeight}
        initialFocusedId={props.initialFocusedId ?? props.entities[0]?.id}
        groupStore={groupByStore}
        emptyState={<div class="p-4 text-center text-gray-500">No items</div>}
      />
    </div>
  );
}

// ============================================================================
// Simplified Test Harnesses for Common Scenarios
// ============================================================================

/** Basic navigation-only test harness */
export function NavigationTestHarness(props: {
  entities: TestEntity[];
  class?: string;
}): JSX.Element {
  return (
    <TestHarness
      entities={props.entities}
      navigation={{ autoScroll: true, autoSelectFirst: true }}
      selection={false}
      hotkeys={{ scopeId: 'nav-test' }}
      class={props.class}
    />
  );
}

/** Navigation + selection test harness */
export function SelectionTestHarness(props: {
  entities: TestEntity[];
  mode?: 'single' | 'multi' | 'range';
  class?: string;
}): JSX.Element {
  return (
    <TestHarness
      entities={props.entities}
      navigation={{ autoScroll: true, autoSelectFirst: true }}
      selection={{ mode: props.mode ?? 'multi' }}
      hotkeys={{ scopeId: 'selection-test' }}
      class={props.class}
    />
  );
}

/** Full-featured test harness */
export function FullTestHarness(props: {
  entities: TestEntity[];
  filters?: FilterPluginConfig<TestEntity>;
  sorts?: SortPluginConfig<TestEntity>;
  class?: string;
}): JSX.Element {
  return (
    <TestHarness
      entities={props.entities}
      navigation={{ autoScroll: true, autoSelectFirst: true }}
      selection={{ mode: 'multi' }}
      hotkeys={{ scopeId: 'full-test' }}
      filters={props.filters}
      sorts={props.sorts}
      class={props.class}
    />
  );
}
