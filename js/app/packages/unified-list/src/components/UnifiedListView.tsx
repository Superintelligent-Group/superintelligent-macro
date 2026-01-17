/**
 * UnifiedListView - THE composable list component.
 *
 * Design principles:
 * - ONE component that handles virtualization, scrolling, infinite load internally
 * - Plugins for behavior (filter, sort, navigation, hotkeys, etc.)
 * - Composition for UI (children, slots) - no hardcoded toolbars
 * - Consumer never deals with virtualizer directly
 *
 * Uses virtua for smooth, flicker-free virtualization with proper handling of
 * data changes during scroll (shift mode).
 *
 * @example
 * ```tsx
 * // Simple usage
 * <UnifiedListView entities={entities} />
 *
 * // With plugins
 * <UnifiedListView
 *   entities={entities}
 *   plugins={[
 *     createFilterPlugin({ filters }),
 *     createNavigationPlugin(),
 *   ]}
 *   renderRow={(entity, state) => <MyRow entity={entity} {...state} />}
 * />
 *
 * // With composed UI
 * <UnifiedListView entities={entities} plugins={plugins}>
 *   <UnifiedListView.Toolbar>
 *     <FilterButtons />
 *   </UnifiedListView.Toolbar>
 * </UnifiedListView>
 * ```
 */

import {
  createSignal,
  createEffect,
  createRenderEffect,
  createContext,
  useContext,
  onCleanup,
  onMount,
  Show,
  mapArray,
  children as resolveChildren,
  type JSX,
  type Accessor,
  type ParentProps,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { type VirtualizerHandle as VirtuaHandle, VList } from 'virtua/solid';
import type { ListController, Plugin, CleanupFn } from '../types';
import type { VirtualizerHandle } from '../types';
import { createListController } from '../core/controller';
import { createPluginManager } from '../core/pluginManager';
import type {
  GroupStore,
  DisplayItem,
  GroupHeaderRenderer,
} from '../types/groupBy';
import { isHeaderItem } from '../types/groupBy';
import { GroupHeader, GROUP_HEADER_HEIGHT } from './GroupHeader';

// ============================================================================
// Types
// ============================================================================

/** Row render state passed to renderRow */
export type RowRenderState = {
  index: number;
  focused: boolean;
  selected: boolean;
  checked: boolean;
  /** Trigger virtualizer to re-measure (call when row content expands/collapses) */
  triggerMeasure: () => void;
};

/** Props for UnifiedListView */
export type UnifiedListViewProps<T extends { id: string }> = {
  /** Unique ID for this list instance */
  id?: string;

  /** Entities to display (reactive) */
  entities: Accessor<T[]>;

  /** Loading state */
  isLoading?: Accessor<boolean>;

  /** Has more data for infinite scroll */
  hasMore?: Accessor<boolean>;

  /** Fetch more callback */
  onFetchMore?: () => void | Promise<void>;

  /** Is currently fetching more */
  isFetchingNextPage?: Accessor<boolean>;

  /** Plugins to register */
  plugins?: Plugin<T>[];

  /** Row height in pixels */
  rowHeight?: number;

  /** Overscan count (items to render outside viewport) */
  overscan?: number;

  /** Custom row renderer */
  renderRow: (entity: T, state: RowRenderState) => JSX.Element;

  /** Empty state content */
  emptyState?: JSX.Element;

  /** Loading state content */
  loadingState?: JSX.Element;

  /** Container class name */
  class?: string;

  /** Children for composed UI (toolbar, footer, etc.) */
  children?: JSX.Element;

  /** Initial focused entity ID */
  initialFocusedId?: string;

  /** Callback when entities in the list change (after filter/sort) */
  onEntitiesChange?: (entities: T[]) => void;

  /** Key that triggers re-measurement when changed (e.g., when row content expands/collapses) */
  measurementKey?: string | number | boolean;

  /** Group store from GroupByPlugin (enables grouping when provided + enabled) */
  groupStore?: GroupStore<T>;

  /** Custom group header renderer (optional, defaults to GroupHeader) */
  renderGroupHeader?: GroupHeaderRenderer;

  /** Group header row height (default: 36) */
  groupHeaderHeight?: number;
};

// ============================================================================
// Context
// ============================================================================

export type UnifiedListContextValue<T extends { id: string }> = {
  controller: ListController<T>;
  entities: Accessor<readonly T[]>;
  isLoading: Accessor<boolean>;
  hasMore: Accessor<boolean>;
  isFetchingNextPage: Accessor<boolean>;
  /** Trigger virtualizer to re-measure all items (e.g., after expand/collapse) */
  triggerMeasure: () => void;
};

// Use unknown for context to allow generic types
// biome-ignore lint/suspicious/noExplicitAny: Required for generic context
const UnifiedListContext = createContext<UnifiedListContextValue<any>>();

/** Hook to access the list controller from child components */
export function useUnifiedList<
  T extends { id: string },
>(): UnifiedListContextValue<T> {
  const context = useContext(UnifiedListContext);
  if (!context) {
    throw new Error('useUnifiedList must be used within UnifiedListView');
  }
  return context;
}

// ============================================================================
// Main Component
// ============================================================================

export function UnifiedListView<T extends { id: string }>(
  props: UnifiedListViewProps<T>
): JSX.Element {
  const listId =
    props.id ?? `unified-list-${Math.random().toString(36).slice(2)}`;

  // Resolve defaults
  const rowHeight = () => props.rowHeight ?? 40;
  const isLoading = () => props.isLoading?.() ?? false;
  const hasMore = () => props.hasMore?.() ?? false;
  const isFetchingNextPage = () => props.isFetchingNextPage?.() ?? false;

  // Create controller
  const { controller, cleanup: controllerCleanup } = createListController<T>({
    id: listId,
    initialFocusedId: props.initialFocusedId ?? null,
    onFetchMore: props.onFetchMore,
  });

  // Register plugins
  const pluginManager = createPluginManager<T>(controller);
  const pluginCleanups: CleanupFn[] = [];

  createEffect(() => {
    // Cleanup previous plugins
    pluginCleanups.forEach((cleanup) => cleanup());
    pluginCleanups.length = 0;

    // Register new plugins
    const plugins = props.plugins ?? [];
    plugins.forEach((plugin) => {
      const cleanup = plugin(controller);
      pluginCleanups.push(cleanup);
    });
  });

  // Create a stable store for entities using reconcile to prevent jumpy scrolling
  // This keeps entity references stable when data changes, preventing unnecessary DOM updates
  const [stableEntitiesStore, setStableEntitiesStore] = createStore<T[]>([]);

  // Track if data is being PREPENDED for virtua's shift mode
  // shift mode is only needed when items are added to the BEGINNING of the list
  // For infinite scroll (appending to end), shift is not needed
  const [isShifting, setIsShifting] = createSignal(false);
  let previousFirstId: string | undefined;

  // Sync entities to stable store using reconcile (key by id for stable references)
  // Also detect prepends by checking if the first item changed
  createRenderEffect(() => {
    const newEntities = props.entities();
    const newFirstId = newEntities[0]?.id;

    // Detect prepend: first item changed AND we had items before AND new list is longer
    const wasPrepend =
      previousFirstId !== undefined &&
      newFirstId !== previousFirstId &&
      newEntities.length > stableEntitiesStore.length;

    if (wasPrepend) {
      setIsShifting(true);
    }

    setStableEntitiesStore(reconcile(newEntities as T[], { key: 'id' }));
    previousFirstId = newFirstId;
  });

  // Disable shift mode after display items are computed (data settled)
  createEffect(() => {
    stableEntityItems(); // Track when items are processed
    setIsShifting(false);
  });

  // Sync stable entities to controller state
  createRenderEffect(() => {
    const entities = stableEntitiesStore;
    controller.setters.setEntities(entities);
    props.onEntitiesChange?.(entities);
  });

  // Sync loading state
  createEffect(() => {
    controller.setters.setIsLoading(isLoading());
  });

  // Sync hasMore state
  createEffect(() => {
    controller.setters.setHasMore(hasMore());
  });

  // Grouping support
  const groupHeaderHeight = () =>
    props.groupHeaderHeight ?? GROUP_HEADER_HEIGHT;

  // Create stable display items using mapArray to prevent re-renders
  // mapArray preserves object identity when items are added/removed
  // This is critical for virtualization - VList uses these references for component reuse
  const stableEntityItems = mapArray(
    () => stableEntitiesStore,
    (entity): DisplayItem<T> => ({
      type: 'entity' as const,
      entity,
      groupId: '',
    })
  );

  // For grouped items, also use mapArray for stability
  const stableGroupedItems = mapArray(
    () => {
      const groupStore = props.groupStore;
      if (!groupStore || !groupStore.enabled()) return [];
      return groupStore.createDisplayItems(stableEntitiesStore);
    },
    (item) => item // Identity - items from groupStore should already be unique
  );

  // Choose between stable entity items or stable grouped items
  // Using a simple accessor, not createMemo, to avoid breaking reference stability
  const displayItems = (): DisplayItem<T>[] => {
    const groupStore = props.groupStore;
    if (!groupStore || !groupStore.enabled()) {
      return stableEntityItems();
    }
    return stableGroupedItems();
  };

  // Update visible entity IDs for navigation when grouping changes
  createEffect(() => {
    const items = displayItems();
    const groupStore = props.groupStore;

    // If no grouping active, clear visible entity IDs (navigation uses entities directly)
    if (!groupStore || !groupStore.enabled()) {
      controller.setters.setVisibleEntityIds(null);
      return;
    }

    // Extract entity IDs from display items (excluding headers)
    const visibleIds = items
      .filter(
        (item): item is typeof item & { type: 'entity' } =>
          item.type === 'entity'
      )
      .map((item) => item.entity.id);

    controller.setters.setVisibleEntityIds(visibleIds);
  });

  // Container ref and size tracking
  const [containerRef, setContainerRef] = createSignal<HTMLDivElement | null>(
    null
  );
  const [containerHeight, setContainerHeight] = createSignal(0);

  // Update controller container ref
  createEffect(() => {
    const ref = containerRef();
    controller.setContainerRef(ref);
  });

  // Track container size
  onMount(() => {
    const container = containerRef();
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(container);
    onCleanup(() => observer.disconnect());
  });

  // Virtua handle for scroll control
  const [virtuaHandle, setVirtuaHandle] = createSignal<VirtuaHandle | null>(
    null
  );

  // Update controller with virtualizer handle (adapter for our interface)
  createEffect(() => {
    const handle = virtuaHandle();
    if (!handle) {
      controller.setVirtualizerHandle(null);
      return;
    }

    const adaptedHandle: VirtualizerHandle = {
      scrollToIndex: (index, options) => {
        handle.scrollToIndex(index, options);
      },
      scrollToOffset: (offset) => {
        handle.scrollTo(offset);
      },
      scrollOffset: handle.scrollOffset,
      getTotalSize: () => handle.scrollSize,
      getVirtualItems: () => {
        // virtua doesn't expose virtual items the same way, but we can approximate
        // This is mainly used for navigation plugin
        const items = displayItems();
        const viewportSize = containerHeight();
        const itemSize = rowHeight();
        const visibleCount = Math.ceil(viewportSize / itemSize);
        const startIndex = Math.floor(handle.scrollOffset / itemSize);
        const endIndex = Math.min(startIndex + visibleCount, items.length);

        return Array.from({ length: endIndex - startIndex }, (_, i) => ({
          index: startIndex + i,
          start: (startIndex + i) * itemSize,
          size: itemSize,
          end: (startIndex + i + 1) * itemSize,
          key: startIndex + i,
          lane: 0,
        }));
      },
    };
    controller.setVirtualizerHandle(adaptedHandle);
  });

  // Aggressive pre-fetching configuration
  // We want to always have content ahead - user should never hit empty space
  const PREFETCH_BUFFER_ITEMS = 50; // Always try to maintain 50 items ahead of viewport
  const PREFETCH_SCROLL_THRESHOLD = 0.5; // Start fetching at 50% scroll

  // Infinite scroll - fetch more when near bottom
  const fetchMore = () => {
    if (hasMore() && !isFetchingNextPage() && !isLoading()) {
      props.onFetchMore?.();
    }
  };

  // Debounced version for scroll events
  const debouncedFetchMore = createDebouncedFn(fetchMore, 50);

  // Check if we need more data based on current scroll position and buffer
  const shouldFetchMore = (): boolean => {
    const handle = virtuaHandle();
    if (!handle) return false;
    if (!hasMore() || isFetchingNextPage() || isLoading()) return false;

    const items = displayItems();
    const totalItems = items.length;
    if (totalItems === 0) return true;

    const viewportHeight = containerHeight();
    const itemSize = rowHeight();
    const viewportItems = Math.ceil(viewportHeight / itemSize);

    // Calculate how many items are visible and how many are ahead
    const scrollOffset = handle.scrollOffset;
    const currentIndex = Math.floor(scrollOffset / itemSize);
    const itemsAhead = totalItems - currentIndex - viewportItems;

    // Fetch if we don't have enough buffer ahead
    if (itemsAhead < PREFETCH_BUFFER_ITEMS) {
      return true;
    }

    // Also fetch based on scroll progress as a fallback
    const scrollProgress =
      scrollOffset / Math.max(handle.scrollSize - viewportHeight, 1);
    if (scrollProgress >= PREFETCH_SCROLL_THRESHOLD) {
      return true;
    }

    return false;
  };

  // Handle scroll to trigger infinite load - called during scroll, not just at end
  const handleScroll = () => {
    if (shouldFetchMore()) {
      debouncedFetchMore();
    }
  };

  // Also check on scroll end for any missed fetches
  const handleScrollEnd = () => {
    if (shouldFetchMore()) {
      fetchMore(); // Immediate, no debounce
    }
  };

  // Auto-fetch if filtered results don't fill viewport or don't have enough buffer
  createEffect(() => {
    const entityCount = stableEntitiesStore.length;
    const viewportCount = Math.ceil(containerHeight() / rowHeight());

    // Always try to have a buffer, not just fill viewport
    const minItems = viewportCount + PREFETCH_BUFFER_ITEMS;

    if (entityCount >= minItems) return;
    if (isLoading() || isFetchingNextPage()) return;
    if (!hasMore()) return;

    // Use immediate fetch for initial load / buffer building
    fetchMore();
  });

  // Chain fetches - when a fetch completes, check if we need more
  createEffect(() => {
    // Track when fetching state changes from true to false (fetch completed)
    const fetching = isFetchingNextPage();
    if (!fetching && hasMore()) {
      // Small delay to let data settle, then check if we need more
      setTimeout(() => {
        if (shouldFetchMore()) {
          fetchMore();
        }
      }, 100);
    }
  });

  // Cleanup
  onCleanup(() => {
    pluginCleanups.forEach((cleanup) => cleanup());
    pluginManager.cleanup();
    controllerCleanup();
  });

  // Trigger re-measurement (exposed via context for child components)
  // Note: virtua handles this automatically, but we expose for compatibility
  const triggerMeasure = () => {
    // virtua auto-measures, no-op
  };

  // Context value
  const contextValue: UnifiedListContextValue<T> = {
    controller,
    entities: controller.state.entities,
    isLoading,
    hasMore,
    isFetchingNextPage,
    triggerMeasure,
  };

  // Resolve children to separate toolbar/footer from list content
  const resolved = resolveChildren(() => props.children);

  return (
    <UnifiedListContext.Provider value={contextValue}>
      <div class={`h-full flex flex-col ${props.class ?? ''}`}>
        {/* Composed children (toolbars, etc.) rendered above/around list */}
        {resolved()}

        {/* Main list container */}
        <div
          ref={setContainerRef}
          class="flex-1 overflow-hidden outline-none"
          tabIndex={0}
          data-unified-list-container
        >
          {/* Loading state (initial load) */}
          <Show when={isLoading() && controller.state.entities().length === 0}>
            {props.loadingState ?? (
              <div class="flex items-center justify-center h-full">
                <div class="animate-pulse text-ink-muted">Loading...</div>
              </div>
            )}
          </Show>

          {/* Empty state */}
          <Show when={!isLoading() && controller.state.entities().length === 0}>
            {props.emptyState ?? (
              <div class="flex items-center justify-center h-full text-ink-muted">
                No items
              </div>
            )}
          </Show>

          {/* Virtualized list using virtua */}
          <Show when={displayItems().length > 0}>
            <VList
              ref={setVirtuaHandle}
              data={displayItems()}
              style={{
                height: '100%',
                'overflow-y': 'auto',
                'overflow-x': 'hidden',
              }}
              class="scrollbar-hidden"
              itemSize={rowHeight()}
              shift={isShifting()}
              onScroll={handleScroll}
              onScrollEnd={handleScrollEnd}
            >
              {(item: DisplayItem<T>, index: () => number) => {
                // Handle header items
                if (isHeaderItem(item)) {
                  const header = item as DisplayItem<T> & { type: 'header' };
                  const HeaderComponent =
                    props.renderGroupHeader ?? GroupHeader;

                  return (
                    <div
                      data-index={index()}
                      data-group-header={header.groupId}
                      style={{ height: `${groupHeaderHeight()}px` }}
                    >
                      <HeaderComponent
                        groupId={header.groupId}
                        label={header.label}
                        icon={header.icon}
                        count={header.count}
                        collapsed={header.collapsed}
                        onToggle={props.groupStore!.toggleGroup}
                      />
                    </div>
                  );
                }

                // Handle entity items
                const entityItem = item as DisplayItem<T> & { type: 'entity' };
                const entity = entityItem.entity;
                const isFocused = () =>
                  controller.state.focusedId() === entity.id;
                const isSelected = () =>
                  controller.state.selectedIds().has(entity.id);

                return (
                  <div data-index={index()} data-entity-id={entity.id}>
                    {props.renderRow(entity, {
                      index: index(),
                      focused: isFocused(),
                      selected: isFocused(),
                      checked: isSelected(),
                      triggerMeasure,
                    })}
                  </div>
                );
              }}
            </VList>
          </Show>

          {/* Loading more indicator */}
          <Show when={isFetchingNextPage()}>
            <div class="flex items-center justify-center py-4">
              <div class="animate-pulse text-ink-muted text-sm">
                Loading more...
              </div>
            </div>
          </Show>
        </div>
      </div>
    </UnifiedListContext.Provider>
  );
}

// ============================================================================
// Compound Components
// ============================================================================

/** Toolbar slot - renders above the list */
function Toolbar(props: ParentProps<{ class?: string }>): JSX.Element {
  return <div class={`shrink-0 ${props.class ?? ''}`}>{props.children}</div>;
}

/** Footer slot - renders below the list */
function Footer(props: ParentProps<{ class?: string }>): JSX.Element {
  return <div class={`shrink-0 ${props.class ?? ''}`}>{props.children}</div>;
}

/** Status bar showing item count, etc. */
function StatusBar(props: { class?: string }): JSX.Element {
  // Lazily access context only during render, not during child resolution
  const context = () => {
    const ctx = useContext(UnifiedListContext);
    if (!ctx) return null;
    return ctx;
  };

  return (
    <Show when={context()}>
      {(ctx) => (
        <div
          class={`flex items-center justify-between p-2 border-t border-divider text-xs text-ink-muted ${props.class ?? ''}`}
        >
          <span>{ctx().entities().length} items</span>
          <Show when={ctx().isLoading()}>
            <span>Loading...</span>
          </Show>
          <Show when={ctx().hasMore() && !ctx().isLoading()}>
            <span>More available</span>
          </Show>
        </div>
      )}
    </Show>
  );
}

// Attach compound components
UnifiedListView.Toolbar = Toolbar;
UnifiedListView.Footer = Footer;
UnifiedListView.StatusBar = StatusBar;

// ============================================================================
// Utilities
// ============================================================================

function createDebouncedFn<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;

  return debouncedFn;
}
