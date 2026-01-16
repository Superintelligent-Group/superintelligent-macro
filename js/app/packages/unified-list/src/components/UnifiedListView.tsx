/**
 * UnifiedListView - THE composable list component.
 *
 * Design principles:
 * - ONE component that handles virtualization, scrolling, infinite load internally
 * - Plugins for behavior (filter, sort, navigation, hotkeys, etc.)
 * - Composition for UI (children, slots) - no hardcoded toolbars
 * - Consumer never deals with virtualizer directly
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
  createMemo,
  createEffect,
  createContext,
  useContext,
  onCleanup,
  onMount,
  on,
  Show,
  For,
  children as resolveChildren,
  type JSX,
  type Accessor,
  type ParentProps,
} from 'solid-js';
import { createVirtualizer } from '@tanstack/solid-virtual';
import type {
  ListController,
  Plugin,
  CleanupFn,
  VirtualizerHandle,
} from '../types';
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
  plugins?: Plugin<T, ListController<T>>[];

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
  entities: Accessor<T[]>;
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
  const overscan = () => props.overscan ?? 8;
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

  // Sync entities to controller state
  createEffect(() => {
    const entities = props.entities();
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

  // Compute display items - either grouped (headers + entities) or plain entities
  const displayItems = createMemo((): DisplayItem<T>[] => {
    const entities = controller.state.entities();
    const groupStore = props.groupStore;

    // No grouping or grouping disabled - wrap entities
    if (!groupStore || !groupStore.enabled()) {
      return entities.map((entity) => ({
        type: 'entity' as const,
        entity,
        groupId: '',
      }));
    }

    // Grouping enabled - use plugin's transform
    return groupStore.createDisplayItems(entities);
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

  // Dynamic overscan based on viewport
  const computedOverscan = createMemo(() => {
    const viewportItems = Math.ceil(containerHeight() / rowHeight());
    return Math.max(overscan(), Math.ceil(viewportItems * 0.5));
  });

  // Virtualizer - supports dynamic row heights via measureElement
  const virtualizer = createMemo(() => {
    const container = containerRef();
    if (!container) return null;

    const items = displayItems();

    return createVirtualizer({
      count: items.length,
      getScrollElement: () => container,
      estimateSize: (index) => {
        const item = items[index];
        // Headers have different height than entity rows
        return item?.type === 'header' ? groupHeaderHeight() : rowHeight();
      },
      overscan: computedOverscan(),
      // Enable dynamic row height measurement
      measureElement: (element) => element.getBoundingClientRect().height,
    });
  });

  // Update controller with virtualizer handle
  createEffect(() => {
    const v = virtualizer();
    if (!v) {
      controller.setVirtualizerHandle(null);
      return;
    }

    const handle: VirtualizerHandle = {
      scrollToIndex: (index, options) => v.scrollToIndex(index, options),
      scrollToOffset: (offset, options) => v.scrollToOffset(offset, options),
      scrollOffset: v.scrollOffset ?? 0,
      getTotalSize: () => v.getTotalSize(),
      getVirtualItems: () => v.getVirtualItems(),
    };
    controller.setVirtualizerHandle(handle);
  });

  // Re-measure all items when measurementKey changes (e.g., when unrollNotifications toggles)
  createEffect(
    on(
      () => props.measurementKey,
      () => {
        // Use queueMicrotask to ensure DOM has updated before measuring
        queueMicrotask(() => {
          const v = virtualizer();
          if (v) {
            v.measure();
          }
        });
      },
      { defer: true }
    )
  );

  // Infinite scroll - fetch more when near bottom
  const debouncedFetchMore = createDebouncedFn(() => {
    if (hasMore() && !isFetchingNextPage() && !isLoading()) {
      props.onFetchMore?.();
    }
  }, 50);

  createEffect(() => {
    const v = virtualizer();
    if (!v || !props.onFetchMore || !hasMore()) return;

    const items = v.getVirtualItems();
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    const totalCount = controller.state.entities().length;
    if (totalCount === 0) return;

    // Trigger at 90% scroll
    if (lastItem.index >= Math.floor(totalCount * 0.9)) {
      debouncedFetchMore();
    }
  });

  // Auto-fetch if filtered results don't fill viewport
  createEffect(() => {
    const entityCount = controller.state.entities().length;
    const viewportCount = Math.ceil(containerHeight() / rowHeight());

    if (entityCount >= viewportCount) return;
    if (isLoading() || isFetchingNextPage()) return;
    if (!hasMore()) return;

    debouncedFetchMore();
  });

  // Cleanup
  onCleanup(() => {
    pluginCleanups.forEach((cleanup) => cleanup());
    pluginManager.cleanup();
    controllerCleanup();
  });

  // Trigger re-measurement (exposed via context for child components)
  const triggerMeasure = () => {
    queueMicrotask(() => {
      virtualizer()?.measure();
    });
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
          class="flex-1 overflow-auto outline-none"
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

          {/* Virtualized list */}
          <Show when={displayItems().length > 0}>
            <div
              style={{
                height: `${virtualizer()?.getTotalSize() ?? 0}px`,
                position: 'relative',
              }}
            >
              <For each={virtualizer()?.getVirtualItems() ?? []}>
                {(virtualRow) => {
                  const item = () => displayItems()[virtualRow.index];

                  return (
                    <Show when={item()}>
                      {(displayItem) => {
                        // Handle header items
                        if (isHeaderItem(displayItem())) {
                          const header = displayItem() as ReturnType<
                            typeof displayItems
                          >[number] & { type: 'header' };
                          const HeaderComponent =
                            props.renderGroupHeader ?? GroupHeader;

                          return (
                            <div
                              ref={(el) => {
                                queueMicrotask(() =>
                                  virtualizer()?.measureElement(el)
                                );
                              }}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                              data-index={virtualRow.index}
                              data-group-header={header.groupId}
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
                        const entityItem = displayItem() as ReturnType<
                          typeof displayItems
                        >[number] & { type: 'entity' };
                        const entity = entityItem.entity;
                        const isFocused = () =>
                          controller.state.focusedId() === entity.id;
                        const isSelected = () =>
                          controller.state.selectedIds().has(entity.id);

                        return (
                          <div
                            ref={(el) => {
                              queueMicrotask(() =>
                                virtualizer()?.measureElement(el)
                              );
                            }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            data-index={virtualRow.index}
                            data-entity-id={entity.id}
                          >
                            {props.renderRow(entity, {
                              index: virtualRow.index,
                              focused: isFocused(),
                              selected: isFocused(),
                              checked: isSelected(),
                              triggerMeasure,
                            })}
                          </div>
                        );
                      }}
                    </Show>
                  );
                }}
              </For>
            </div>
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
