/**
 * Unified List Package
 *
 * A composable, plugin-based list system for rendering entities.
 *
 * @example
 * ```tsx
 * import { createUnifiedListBuilder, UnifiedList } from '@unified-list';
 *
 * const list = createUnifiedListBuilder<MyEntity>('my-list')
 *   .withFilters({
 *     filters: [entityTypeFilter('docs', 'Documents', ['document'])],
 *   })
 *   .withSorts({
 *     sorts: [updatedAtSort(), createdAtSort()],
 *     defaultSortId: 'updated_at',
 *   })
 *   .withNavigation()
 *   .withSelection()
 *   .withHotkeys()
 *   .build();
 *
 * // In component:
 * <UnifiedList controller={list.controller} rowConfig={rowConfig} />
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export type {
  // Core types
  ListState,
  ListStateTransition,
  ReactiveListState,
  ListStateSetters,
  // Plugin types
  Plugin,
  PluginFactory,
  CleanupFn,
  // Command types
  CommandHandler,
  CommandPriorityValue,
  CommandSystem,
  // Controller types
  ListController,
  VirtualizerHandle,
  VirtualItem,
  // Filter types
  FilterConfig,
  FilterGroup,
  FilterState,
  // Sort types
  SortConfig,
  SortState,
  // Selection types
  SelectionMode,
  SelectionState,
  // Navigation types
  NavigationDirection,
  NavigationMode,
  NavigationInput,
  // Rendering types
  EntitySlot,
  SlotRenderer,
  EntityTemplate,
  // Query types
  QueryConfig,
  // Event types
  EntityClickType,
  EntityClickEvent,
  EntityAction,
  // Entity types (re-exported from macro-entity)
  EntityData,
  EntityType,
  ExpandedEntityType,
  EntityBase,
  ChannelEntity,
  ChatEntity,
  DocumentEntity,
  TaskEntity,
  EmailEntity,
  ProjectEntity,
  EntityMapper,
  EntityEnhancer,
  EntityFilter,
  EntitiesFilter,
  EntityComparator,
  EntityRenderer,
} from './types';

export { CommandPriority } from './types';

// ============================================================================
// Core
// ============================================================================

export {
  // State management
  createInitialListState,
  createReactiveListState,
  // State transitions
  setEntitiesTransition,
  setFocusedIdTransition,
  toggleSelectionTransition,
  selectRangeTransition,
  clearSelectionTransition,
  setLoadingTransition,
  setHasMoreTransition,
  setScrollOffsetTransition,
  navigateNextTransition,
  navigatePrevTransition,
  navigateFirstTransition,
  navigateLastTransition,
} from './core/state';

export {
  // Command system
  createCommandSystem,
  ListCommands,
  type ListCommandName,
  type ToggleFilterPayload,
  type ToggleSelectionPayload,
  type OpenEntityPayload,
} from './core/commands';

export {
  // Controller
  createListController,
  batchUpdates,
  createFocusedSelector,
  createSelectedSelector,
  type CreateControllerOptions,
} from './core/controller';

export {
  // Plugin manager
  createPluginManager,
  mergeRegister,
  composePlugins,
  conditionalPlugin,
  oncePlugin,
  type PluginManager,
} from './core/pluginManager';

// ============================================================================
// Plugins
// ============================================================================

export {
  // Filter plugin
  createFilterPlugin,
  createFilterStore,
  composeFilters,
  composeFiltersOr,
  negateFilter,
  createTypeFilter,
  createPropertyFilter,
  createTruthyFilter,
  entityTypeFilter,
  createFilterGroup,
  type FilterStore,
  type FilterPluginConfig,
} from './plugins/filterPlugin';

export {
  // Sort plugin
  createSortPlugin,
  createSortStore,
  createNumericSort,
  createStringSort,
  createDateSort,
  composeComparators,
  stableSort,
  updatedAtSort,
  createdAtSort,
  viewedAtSort,
  nameSort,
  frecencySort,
  type SortStore,
  type SortPluginConfig,
} from './plugins/sortPlugin';

export {
  // Navigation plugin
  createNavigationPlugin,
  calculateNavigationTarget,
  type NavigationPluginConfig,
} from './plugins/navigationPlugin';

export {
  // Selection plugin
  createSelectionPlugin,
  createSelectionStore,
  calculateRangeSelection,
  type SelectionStore,
  type SelectionPluginConfig,
} from './plugins/selectionPlugin';

export {
  // Hotkey plugin
  createHotkeyPlugin,
  defaultHotkeyBindings,
  createHotkey,
  formatHotkey,
  getHotkeyHelp,
  type HotkeyBinding,
  type HotkeyModifiers,
  type HotkeyPluginConfig,
} from './plugins/hotkeyPlugin';

export {
  // Search plugin
  createSearchPlugin,
  createSearchStore,
  fuzzyMatch,
  createLocalSearchFilter,
  highlightMatches,
  enhanceWithSearchHighlight,
  type SearchStore,
  type SearchPluginConfig,
  type SearchResult,
  type EnhancingSearchFilter,
} from './plugins/searchPlugin';

export {
  // Action plugin
  createActionPlugin,
  createActionRegistry,
  createMarkDoneAction,
  createDeleteAction,
  type ActionRegistry,
  type ActionPluginConfig,
} from './plugins/actionPlugin';

export {
  // GroupBy plugin
  createGroupByPlugin,
  createGroupStore,
  GroupByCommands,
  getEntityFromDisplayItem,
  findEntityDisplayIndex,
  getEntitiesFromDisplayItems,
  findNextEntityIndex,
  findPrevEntityIndex,
} from './plugins/groupByPlugin';

// GroupBy types
export type {
  GroupId,
  GroupKeyFn,
  GroupConfig,
  GroupRegistry,
  HeaderDisplayItem,
  EntityDisplayItem,
  DisplayItem,
  GroupStore,
  GroupByPluginConfig,
  GroupHeaderProps,
  GroupHeaderRenderer,
} from './types/groupBy';

export { isEntityItem, isHeaderItem, getDisplayItemKey } from './types/groupBy';

// GroupBy components
export {
  GroupHeader,
  GROUP_HEADER_HEIGHT,
  createGroupHeaderRenderer,
  createMinimalGroupHeader,
  createStickyGroupHeader,
} from './components/GroupHeader';

export {
  EntityRow,
  useEntityRowContext,
  createUnreadIndicatorSlot,
  createCheckboxSlot,
  createTimestampSlot,
  type EntityRowSlot,
  type SlotRenderProps,
  type SlotRenderer as EntitySlotRenderer,
  type EntityRowLayout,
  type EntityRowConfig,
  type EntityRowProps,
} from './components/EntityRow';

export {
  UnifiedList,
  createUnifiedListBuilder as createUnifiedListComponentBuilder,
  type UnifiedListProps,
  type UnifiedListBuilder as UnifiedListComponentBuilder,
} from './components/UnifiedList';

export {
  UnifiedListView,
  useUnifiedList,
  type UnifiedListViewProps,
  type UnifiedListContextValue,
  type RowRenderState,
} from './components/UnifiedListView';

// ============================================================================
// Builder
// ============================================================================

export {
  createUnifiedList as createUnifiedListBuilder2,
  createBasicList,
  type UnifiedListConfig,
  type UnifiedListBuildResult,
  type UnifiedListBuilder as UnifiedListBuilder2,
} from './builder';

// ============================================================================
// Factory
// ============================================================================

export {
  createUnifiedList,
  createUnifiedListBuilder,
  type UnifiedListInstance,
  type UnifiedListFactoryConfig,
  type UnifiedListBuilder,
} from './factory';

// ============================================================================
// Entity rendering
// ============================================================================

export {
  // Entity row components
  EntityRow as SoupEntityRow,
  createDefaultEntityRowConfig,
  ENTITY_HEIGHT,
  // Slot factories
  createIndicatorSlot,
  createIconSlot,
  createTitleSlot,
  createSubtitleSlot,
  createBadgesSlot,
  createTimestampSlot as createEntityTimestampSlot,
  createActionsSlot,
  createNotificationsSlot,
  createSearchHitsSlot,
  // Children slot system
  ChildrenSlot,
  CollapsibleChildList,
  ChildRow,
  ThreadBorder,
  // Types
  type EnhancedEntity,
  type EntityRowConfig as SoupEntityRowConfig,
  type EntityRowProps as SoupEntityRowProps,
  type EntitySlotName,
  type EntitySlots,
  type SlotProps,
  type SlotRenderer as EntitySlotRenderer2,
  type ChildrenSlotProps,
  type CollapsibleChildListProps,
  type ChildRowProps,
  type ChildRowConfig,
  type ChildRowSlots,
  type ChildRowSlotName,
  type ChildRowSlotProps,
  type ChildRowSlotRenderer,
  type ChildrenSlotConfig,
  type ChildItemId,
} from './components/entity';

// ============================================================================
// Filters (Generic entity type filters)
// NOTE: Signal/Noise filters have moved to @soup package
// ============================================================================

export {
  // Notification filters
  unreadFilter,
  notDoneFilter,
  // Entity type filters
  documentFilter,
  taskFilter,
  emailFilter,
  channelFilter,
  peopleFilter,
  teamsFilter,
  agentFilter,
  projectFilter,
  fileFilter,
} from './filters';
