/**
 * Soup - Self-contained entity list component.
 *
 * A fully isolated, top-level list component that manages all its own state:
 * - Filters (focus, type, notification state)
 * - Sorts (frecency, updated, created, viewed)
 * - Email view modes (all, inbox, sent, drafts, etc.)
 * - Preview mode
 * - Selection and navigation
 *
 * Uses UnifiedListView for virtualization and rendering.
 * All configuration is internal - no complex props required.
 */

import {
  createSignal,
  createMemo,
  Show,
  For,
  useContext,
  type JSX,
  type Accessor,
  type Setter,
} from 'solid-js';
import { type EntityData, isTaskEntity } from '@macro-entity';
import {
  useGlobalNotificationSource,
  useGlobalBlockOrchestrator,
} from '@app/component/GlobalAppState';
import { useSetPropertyStatusCompleteMutation } from '@queries/properties/entity';
import type { PropertiesEntityType } from '@service-properties/client';
import { useTaskProperties } from '@core/component/Properties/hooks';
import { toast } from '@core/component/Toast/Toast';
import { SplitPanelContext } from '@app/component/split-layout/context';
import { openEntityInSplitFromUnifiedList } from '@app/component/soupContextHelpers';

// Unified list imports
import {
  UnifiedListView,
  createUnifiedList,
  updatedAtSort,
  createdAtSort,
  viewedAtSort,
  frecencySort,
  EntityRow,
  ENTITY_HEIGHT,
  createDefaultEntityRowConfig,
  createGroupStore,
  type RowRenderState,
  type EnhancedEntity,
  type FilterGroup,
  type UnifiedListBuildResult,
  type GroupConfig,
  type GroupRegistry,
  type GroupStore,
} from '@unified-list';
import {
  SYSTEM_PROPERTY_IDS,
  PROPERTY_OPTION_IDS,
} from '@core/component/Properties/constants';
import type { Property } from '@core/component/Properties/types';

// Soup-specific imports
import { useSoupQuery } from './useSoupQuery';
import { SOUP_DEFAULTS, type SortMethod, type EmailView } from './defaults';
import { createSoupFilterConfigs } from './filterConfigs';
import { createPreviewPlugin } from './createPreviewPlugin';

// Debounce constants
const LOCAL_SEARCH_DEBOUNCE_MS = 20;
const SERVER_SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// Group By Configuration
// ============================================================================

/** Grouping mode options */
type GroupMode = 'none' | 'type' | 'status';

/** Get the group key for an entity (task is distinct from document) */
function getEntityTypeGroup(entity: EnhancedEntity): string {
  if (isTaskEntity(entity)) return 'task';
  return entity.type;
}

/** Registry of entity type groups for grouping */
const ENTITY_TYPE_GROUP_REGISTRY: GroupRegistry = new Map<string, GroupConfig>([
  ['task', { id: 'task', label: 'Tasks', order: 1 }],
  ['email', { id: 'email', label: 'Mail', order: 2 }],
  ['document', { id: 'document', label: 'Documents', order: 3 }],
  ['channel', { id: 'channel', label: 'Channels', order: 4 }],
  ['project', { id: 'project', label: 'Projects', order: 5 }],
  ['chat', { id: 'chat', label: 'Agents', order: 6 }],
]);

/** Registry of task status groups for grouping */
const STATUS_GROUP_REGISTRY: GroupRegistry = new Map<string, GroupConfig>([
  ['not-started', { id: 'not-started', label: 'To Do', order: 1 }],
  ['in-progress', { id: 'in-progress', label: 'In Progress', order: 2 }],
  ['in-review', { id: 'in-review', label: 'In Review', order: 3 }],
  ['completed', { id: 'completed', label: 'Done', order: 4 }],
  ['canceled', { id: 'canceled', label: 'Canceled', order: 5 }],
  ['no-status', { id: 'no-status', label: 'No Status', order: 6 }],
  ['non-task', { id: 'non-task', label: 'Other', order: 7 }],
]);

/** Map status option ID to group key */
const STATUS_OPTION_TO_GROUP: Record<string, string> = {
  [PROPERTY_OPTION_IDS.STATUS.NOT_STARTED]: 'not-started',
  [PROPERTY_OPTION_IDS.STATUS.IN_PROGRESS]: 'in-progress',
  [PROPERTY_OPTION_IDS.STATUS.IN_REVIEW]: 'in-review',
  [PROPERTY_OPTION_IDS.STATUS.COMPLETED]: 'completed',
  [PROPERTY_OPTION_IDS.STATUS.CANCELED]: 'canceled',
};

/** Create a status group key function with access to task properties */
function createStatusGroupKeyFn(
  getTaskProperties: () => Record<string, Property[]>
): (entity: EnhancedEntity) => string {
  return (entity: EnhancedEntity): string => {
    // Non-tasks go to "other" group
    if (!isTaskEntity(entity)) return 'non-task';

    const properties = getTaskProperties()[entity.id];
    if (!properties) return 'no-status';

    // Find the status property
    const statusProp = properties.find(
      (p: Property) => p.propertyDefinitionId === SYSTEM_PROPERTY_IDS.STATUS
    );

    if (!statusProp || statusProp.valueType !== 'SELECT_STRING') {
      return 'no-status';
    }

    const statusValue = statusProp.value;
    if (!statusValue || statusValue.length === 0) return 'no-status';

    // Map the option ID to our group key
    const statusOptionId = statusValue[0];
    return STATUS_OPTION_TO_GROUP[statusOptionId] ?? 'no-status';
  };
}

// ============================================================================
// Types
// ============================================================================

export type SoupProps = {
  /** Entity click handler - called when an entity is selected/clicked */
  onEntityClick?: (entity: EntityData) => void;
  /** Entity double click handler - called when an entity is double-clicked */
  onEntityDoubleClick?: (entity: EntityData) => void;
};

// ============================================================================
// Helpers
// ============================================================================

/** Map entity type to properties entity type for mark done mutation */
function getPropertiesEntityType(
  entity: EntityData
): PropertiesEntityType | undefined {
  if (isTaskEntity(entity)) return 'TASK';
  if (entity.type === 'email') return 'THREAD';
  if (entity.type === 'document') return 'DOCUMENT';
  if (entity.type === 'project') return 'PROJECT';
  return undefined;
}

// ============================================================================
// Soup Component
// ============================================================================

export function Soup(props: SoupProps): JSX.Element {
  // ---------------------------------------------------------------------------
  // Internal State - All configuration managed here
  // ---------------------------------------------------------------------------

  // Get hotkey scope from split panel context (provided by SplitLayout)
  const splitPanelContext = useContext(SplitPanelContext);
  const hotkeyScope = splitPanelContext?.splitHotkeyScope;

  // Notification source from global context
  const notificationSource = useGlobalNotificationSource();

  // Block orchestrator for preview panel
  const orchestrator = useGlobalBlockOrchestrator();

  // Mark done mutation
  const setPropertyStatusCompleteMutation =
    useSetPropertyStatusCompleteMutation();

  /** Mark entities as done */
  const markDone = async (entitiesToMark: EntityData[]) => {
    const supportedEntities = entitiesToMark.filter(
      (e) => getPropertiesEntityType(e) !== undefined
    );

    if (supportedEntities.length === 0) return;

    for (const entity of supportedEntities) {
      const entityType = getPropertiesEntityType(entity);
      if (entityType) {
        setPropertyStatusCompleteMutation.mutate({
          entityType,
          entityId: entity.id,
        });
      }
    }

    toast.success(
      supportedEntities.length === 1
        ? 'Marked as done'
        : `Marked ${supportedEntities.length} items as done`
    );
  };

  // Filter state
  const [activeFilterIds, setActiveFilterIds] = createSignal<Set<string>>(
    new Set()
  );

  // Sort state
  const [sortMethod, setSortMethod] = createSignal<SortMethod>(
    SOUP_DEFAULTS.sortMethod
  );

  // Email view state (all, inbox, sent, drafts, etc.)
  const [emailView, setEmailView] = createSignal<EmailView>(
    SOUP_DEFAULTS.emailView
  );

  // Unroll notifications state
  const [unrollNotifications, setUnrollNotifications] = createSignal(false);

  // Group by mode state
  const [groupMode, setGroupMode] = createSignal<GroupMode>('none');

  // Focused entity ID - tracked via navigation plugin's onNavigate callback
  const [focusedId, setFocusedId] = createSignal<string | null>(null);

  // Search text state - managed by search plugin via stores.search
  // The plugin handles dual debouncing (20ms local, 300ms server) internally

  // ---------------------------------------------------------------------------
  // Data Fetching
  // Note: useSoupQuery is called after plugin setup below because we need
  // access to the search store's enhancingSearchFilter and isServerSearchActive
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Plugin Configuration
  // ---------------------------------------------------------------------------

  const filterConfigs = createSoupFilterConfigs();
  const filterGroups: FilterGroup[] = [
    {
      id: 'focus',
      label: 'Focus',
      filterIds: ['signal', 'noise'],
      allowMultiple: false,
    },
    {
      id: 'type',
      label: 'Type',
      filterIds: [
        'document',
        'task',
        'email',
        'people',
        'teams',
        'agent',
        'project',
        'file',
      ],
      allowMultiple: false,
    },
  ];

  const { plugins, stores } = createUnifiedList<EnhancedEntity>()
    .withFilters({
      filters: filterConfigs,
      groups: filterGroups,
      initialActive: new Set(),
      onFilterChange: setActiveFilterIds,
    })
    .withSorts({
      sorts: [
        updatedAtSort<EnhancedEntity>(),
        createdAtSort<EnhancedEntity>(),
        viewedAtSort<EnhancedEntity>(),
        frecencySort<EnhancedEntity>(),
      ],
      defaultSort: SOUP_DEFAULTS.sortMethod,
      defaultOrder: 'descending',
    })
    .withNavigation({
      autoScroll: true,
      autoSelectFirst: true,
      onNavigate: setFocusedId,
    })
    .withSelection({
      mode: 'multi',
    })
    .withHotkeys({
      scope: hotkeyScope,
    })
    .withSearch({
      useNameFuzzySearch: true,
      localDebounceMs: LOCAL_SEARCH_DEBOUNCE_MS,
      serverDebounceMs: SERVER_SEARCH_DEBOUNCE_MS,
    })
    .withActions({
      actions: [
        {
          id: 'mark_done',
          label: 'Mark as Done',
          hotkey: 'e',
          canExecute: (entities) =>
            entities.some((e) => getPropertiesEntityType(e) !== undefined),
          handler: async (selectedEntities) => {
            await markDone(selectedEntities as EntityData[]);
          },
        },
      ],
      onOpenEntity: (entity, options) => {
        if (options?.preview && !preview.enabled()) {
          preview.setEnabled(true);
        }
        // Use custom handler if provided, otherwise open in split
        if (props.onEntityClick) {
          props.onEntityClick(entity);
        } else if (splitPanelContext?.handle) {
          openEntityInSplitFromUnifiedList(entity, {
            openInNewSplit: options?.newSplit,
            splitHandle: splitPanelContext.handle,
          });
        }
      },
    })
    .build();

  // ---------------------------------------------------------------------------
  // Setup isServerSearchActive Override
  // Server search should be disabled when signal/noise focus filters are active
  // ---------------------------------------------------------------------------

  // Create the override accessor: valid search terms AND no focus filters
  const isServerSearchActiveOverride = createMemo(() => {
    const hasSignalOrNoise =
      activeFilterIds().has('signal') || activeFilterIds().has('noise');
    const validTerms = (stores.search?.serverDebouncedText()?.length ?? 0) >= 3;
    return validTerms && !hasSignalOrNoise;
  });

  // Set the override on the search store
  stores.search?.setIsServerSearchActiveOverride(isServerSearchActiveOverride);

  // ---------------------------------------------------------------------------
  // Data Fetching (after plugin setup to access search store)
  // ---------------------------------------------------------------------------

  const { entities, isLoading, hasMore, fetchNextPage, isFetchingNextPage } =
    useSoupQuery({
      activeFilterIds,
      sortMethod,
      emailView: () => emailView(),
      serverSearchText: stores.search?.serverDebouncedText, // Server-debounced from plugin
      enhancingSearchFilter: stores.search?.enhancingSearchFilter, // Local fuzzy from plugin
      isServerSearchActive: stores.search?.isServerSearchActive, // Considers focus filters
      notificationSource,
    });

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  // Entities are already enhanced by useSoupQuery with local fuzzy search
  // Just apply sort from sort plugin
  const processedEntities = createMemo(() => {
    let result: EnhancedEntity[] = entities();

    // Apply sort from sort plugin
    const sortFn = stores.sort?.sortFn();
    if (sortFn) {
      result = [...result].sort(sortFn);
    }

    return result;
  });

  // Track if search is active (for UI state, uses raw search text from plugin)
  const isSearchActive = createMemo(
    () => (stores.search?.searchText()?.length ?? 0) > 0
  );

  // Fetch task properties for the displayed entities
  const taskPropertiesStore = useTaskProperties(processedEntities);

  // ---------------------------------------------------------------------------
  // Group By Stores
  // ---------------------------------------------------------------------------

  // Create group store for entity type grouping
  const typeGroupStore = createGroupStore<EnhancedEntity>(
    getEntityTypeGroup,
    ENTITY_TYPE_GROUP_REGISTRY,
    new Set(),
    true // enabled by default when this store is active
  );

  // Create group store for status grouping (needs task properties)
  const statusGroupStore = createGroupStore<EnhancedEntity>(
    createStatusGroupKeyFn(taskPropertiesStore),
    STATUS_GROUP_REGISTRY,
    new Set(),
    true // enabled by default when this store is active
  );

  // Get the active group store based on mode
  const activeGroupStore = createMemo(
    (): GroupStore<EnhancedEntity> | undefined => {
      const mode = groupMode();
      if (mode === 'type') return typeGroupStore;
      if (mode === 'status') return statusGroupStore;
      return undefined;
    }
  );

  // ---------------------------------------------------------------------------
  // Preview Plugin
  // ---------------------------------------------------------------------------

  const preview = createPreviewPlugin({
    hotkeyScope: hotkeyScope!,
    splitPanelContext: splitPanelContext!,
    orchestrator,
    entities: processedEntities,
    focusedId,
  });

  // ---------------------------------------------------------------------------
  // Row Rendering
  // ---------------------------------------------------------------------------

  const rowConfig = createMemo(() =>
    createDefaultEntityRowConfig({
      showUnrollNotifications: unrollNotifications(),
      onClick: (event) => {
        // Let preview plugin handle click first
        if (!preview.handleEntityClick(event.entity)) {
          // Preview didn't consume, open entity
          props.onEntityClick?.(event.entity);
        }
      },
      onDoubleClick: (event) => props.onEntityDoubleClick?.(event.entity),
      onRowAction: async (entity, action) => {
        if (action === 'done') {
          await markDone([entity]);
        }
      },
    })
  );

  const renderRow = (entity: EnhancedEntity, state: RowRenderState) => {
    // Get properties for this entity (only tasks have properties)
    const properties = taskPropertiesStore()[entity.id] ?? [];

    return (
      <EntityRow
        entity={entity}
        index={state.index}
        focused={state.focused}
        selected={{ active: state.focused }}
        checked={state.checked}
        config={{
          ...rowConfig(),
          properties,
          onToggleExpand: state.triggerMeasure,
        }}
        searchActive={isSearchActive()}
      />
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div class="flex size-full">
      <SplitPanelContext.Provider
        value={{
          ...splitPanelContext!,
          halfSplitState: preview.halfSplitState,
        }}
      >
        <div
          class="h-full flex-1 min-w-0"
          classList={{ 'border-r border-edge-muted': preview.enabled() }}
        >
          <UnifiedListView
            id="soup"
            entities={processedEntities}
            isLoading={isLoading}
            hasMore={hasMore}
            isFetchingNextPage={isFetchingNextPage}
            onFetchMore={fetchNextPage}
            plugins={plugins}
            groupStore={activeGroupStore()}
            rowHeight={ENTITY_HEIGHT}
            measurementKey={`${unrollNotifications()}-${stores.search?.isServerSearchActive() ?? false}`}
            renderRow={renderRow}
            emptyState={
              <div class="flex items-center justify-center h-full text-ink-muted">
                No entities match your filters
              </div>
            }
          >
            {/* Main Toolbar */}
            <SoupToolbar
              stores={stores}
              sortMethod={sortMethod}
              setSortMethod={setSortMethod}
              emailView={emailView}
              setEmailView={setEmailView}
              previewEnabled={preview.enabled}
              onTogglePreview={preview.toggle}
              unrollNotifications={unrollNotifications}
              setUnrollNotifications={setUnrollNotifications}
              groupMode={groupMode}
              setGroupMode={setGroupMode}
              onFilterChange={setActiveFilterIds}
            />

            {/* Selection toolbar */}
            <Show when={(stores.selection?.selectedIds().size ?? 0) > 0}>
              <SelectionToolbar
                stores={stores}
                onMarkDone={markDone}
                entities={processedEntities}
              />
            </Show>

            {/* Status bar */}
            <UnifiedListView.StatusBar />
          </UnifiedListView>
        </div>
      </SplitPanelContext.Provider>
      <Show when={preview.enabled()}>
        <preview.Panel />
      </Show>
    </div>
  );
}

// ============================================================================
// Toolbar Components
// ============================================================================

// Sort options
const SORT_OPTIONS: { id: SortMethod; label: string }[] = [
  { id: 'updated_at', label: 'Updated' },
  { id: 'created_at', label: 'Created' },
  { id: 'viewed_at', label: 'Viewed' },
  { id: 'frecency', label: 'Frecency' },
];

// Email view options
const EMAIL_VIEW_OPTIONS: { id: EmailView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'important', label: 'Important' },
  { id: 'starred', label: 'Starred' },
  { id: 'other', label: 'Other' },
];

type SoupToolbarProps = {
  stores: UnifiedListBuildResult<EnhancedEntity>['stores'];
  sortMethod: Accessor<SortMethod>;
  setSortMethod: Setter<SortMethod>;
  emailView: Accessor<EmailView>;
  setEmailView: Setter<EmailView>;
  previewEnabled: Accessor<boolean>;
  onTogglePreview: () => void;
  unrollNotifications: Accessor<boolean>;
  setUnrollNotifications: Setter<boolean>;
  groupMode: Accessor<GroupMode>;
  setGroupMode: Setter<GroupMode>;
  onFilterChange: Setter<Set<string>>;
};

function SoupToolbar(props: SoupToolbarProps): JSX.Element {
  const filterStore = () => props.stores.filter;
  const searchStore = () => props.stores.search;
  const activeFilters = () => filterStore()?.activeFilterIds() ?? new Set();

  const toggleFilter = (filterId: string) => {
    const store = filterStore();
    if (!store) return;
    const current = store.activeFilterIds();
    const next = new Set<string>(current);

    if (next.has(filterId)) {
      // Deactivate filter
      next.delete(filterId);
    } else {
      // Activate filter - handle mutual exclusivity via groups
      const filterConfig = store.filters().get(filterId);
      if (filterConfig?.group) {
        const group = store.groups().get(filterConfig.group);
        if (group && !group.allowMultiple) {
          // Remove other filters in same group
          for (const otherId of group.filterIds) {
            if (otherId !== filterId) {
              next.delete(otherId);
            }
          }
        }
      }
      next.add(filterId);
    }

    // Update both the plugin store and the external state
    store.setActiveFilterIds(next);
    props.onFilterChange(next);
  };

  return (
    <UnifiedListView.Toolbar class="border-b border-divider">
      {/* Search */}
      <div class="p-2 border-b border-divider">
        <input
          type="text"
          placeholder="Search..."
          class="w-full px-3 py-2 rounded border border-divider bg-panel text-sm"
          value={searchStore()?.searchText() ?? ''}
          onInput={(e) => searchStore()?.setSearchText(e.currentTarget.value)}
        />
      </div>

      {/* Focus Filters */}
      <div class="flex gap-2 p-2 border-b border-divider">
        <FilterButton
          label="Inbox"
          active={activeFilters().has('signal')}
          onClick={() => toggleFilter('signal')}
        />
        <FilterButton
          label="Other"
          active={activeFilters().has('noise')}
          onClick={() => toggleFilter('noise')}
        />
        <div class="w-px bg-divider mx-1" />
        <FilterButton
          label="Unread"
          active={activeFilters().has('unread')}
          onClick={() => toggleFilter('unread')}
        />
      </div>

      {/* Type Filters */}
      <div class="flex gap-2 p-2 flex-wrap border-b border-divider">
        <FilterButton
          label="Docs"
          active={activeFilters().has('document')}
          onClick={() => toggleFilter('document')}
        />
        <FilterButton
          label="Tasks"
          active={activeFilters().has('task')}
          onClick={() => toggleFilter('task')}
        />
        <FilterButton
          label="Mail"
          active={activeFilters().has('email')}
          onClick={() => toggleFilter('email')}
        />
        <FilterButton
          label="People"
          active={activeFilters().has('people')}
          onClick={() => toggleFilter('people')}
        />
        <FilterButton
          label="Teams"
          active={activeFilters().has('teams')}
          onClick={() => toggleFilter('teams')}
        />
        <FilterButton
          label="Agents"
          active={activeFilters().has('agent')}
          onClick={() => toggleFilter('agent')}
        />
        <FilterButton
          label="Folders"
          active={activeFilters().has('project')}
          onClick={() => toggleFilter('project')}
        />
      </div>

      {/* Sort & View Controls */}
      <div class="flex items-center gap-4 p-2 border-b border-divider">
        {/* Sort Dropdown */}
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-muted">Sort:</span>
          <select
            class="px-2 py-1 rounded border border-divider bg-panel text-sm"
            value={props.sortMethod()}
            onChange={(e) =>
              props.setSortMethod(e.currentTarget.value as SortMethod)
            }
          >
            <For each={SORT_OPTIONS}>
              {(opt) => <option value={opt.id}>{opt.label}</option>}
            </For>
          </select>
        </div>

        {/* Email View Dropdown */}
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-muted">Email:</span>
          <select
            class="px-2 py-1 rounded border border-divider bg-panel text-sm"
            value={props.emailView()}
            onChange={(e) =>
              props.setEmailView(e.currentTarget.value as EmailView)
            }
          >
            <For each={EMAIL_VIEW_OPTIONS}>
              {(opt) => <option value={opt.id}>{opt.label}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* Display Options */}
      <div class="flex items-center gap-4 p-2">
        {/* Preview Toggle */}
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            class="rounded"
            checked={props.previewEnabled()}
            onChange={() => props.onTogglePreview()}
          />
          <span>Preview</span>
        </label>

        {/* Unroll Notifications Toggle */}
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            class="rounded"
            checked={props.unrollNotifications()}
            onChange={(e) =>
              props.setUnrollNotifications(e.currentTarget.checked)
            }
          />
          <span>Unroll Notifications</span>
        </label>

        {/* Group By Dropdown */}
        <div class="flex items-center gap-2">
          <span class="text-xs text-ink-muted">Group:</span>
          <select
            class="px-2 py-1 rounded border border-divider bg-panel text-sm"
            value={props.groupMode()}
            onChange={(e) =>
              props.setGroupMode(e.currentTarget.value as GroupMode)
            }
          >
            <option value="none">None</option>
            <option value="type">By Type</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>
    </UnifiedListView.Toolbar>
  );
}

function FilterButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      class="px-3 py-1 rounded text-sm transition-colors"
      classList={{
        'bg-accent text-white': props.active,
        'bg-panel hover:bg-hover': !props.active,
      }}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

type SelectionToolbarProps = {
  stores: UnifiedListBuildResult<EnhancedEntity>['stores'];
  onMarkDone: (entities: EntityData[]) => Promise<void>;
  entities: Accessor<EnhancedEntity[]>;
};

function SelectionToolbar(props: SelectionToolbarProps): JSX.Element {
  const selectedCount = () => props.stores.selection?.selectedIds().size ?? 0;

  const getSelectedEntities = () => {
    const selectedIds = props.stores.selection?.selectedIds() ?? new Set();
    return props.entities().filter((e) => selectedIds.has(e.id));
  };

  const handleMarkDone = async () => {
    const selected = getSelectedEntities();
    if (selected.length > 0) {
      await props.onMarkDone(selected as EntityData[]);
      // Clear selection after marking done
      props.stores.selection?.setSelectedIds(new Set<string>());
    }
  };

  return (
    <div class="flex items-center gap-4 p-2 bg-accent/10 border-b border-divider">
      <span class="text-sm">{selectedCount()} selected</span>
      <button
        type="button"
        class="px-3 py-1 rounded text-sm bg-accent text-white"
        onClick={handleMarkDone}
      >
        Mark Done
      </button>
      <button
        type="button"
        class="px-3 py-1 rounded text-sm bg-panel border border-divider"
        onClick={() => {
          props.stores.selection?.setSelectedIds(new Set<string>());
        }}
      >
        Clear
      </button>
    </div>
  );
}
