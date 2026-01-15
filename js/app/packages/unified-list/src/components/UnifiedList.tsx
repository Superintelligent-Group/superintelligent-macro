/**
 * Unified List - main list component.
 *
 * Brings together all plugins and provides the main rendering.
 */

import {
  type JSX,
  type Accessor,
  For,
  Show,
  createMemo,
  createEffect,
  onCleanup,
} from 'solid-js';
import { createVirtualizer, type Virtualizer } from '@tanstack/solid-virtual';
import type { ListController, VirtualizerHandle } from '../types';
import {
  EntityRow,
  type EntityRowConfig,
  type SlotRenderer,
} from './EntityRow';

// ============================================================================
// Unified List Types
// ============================================================================

export type UnifiedListProps<T extends { id: string }> = {
  /** List controller */
  controller: ListController<T>;
  /** Entity row configuration */
  rowConfig: EntityRowConfig<T>;
  /** Row height */
  rowHeight?: number;
  /** Overscan count */
  overscan?: number;
  /** Class name for container */
  class?: string;
  /** Loading indicator */
  loadingIndicator?: JSX.Element;
  /** Empty state */
  emptyState?: JSX.Element;
  /** Header slot */
  header?: JSX.Element;
  /** Footer slot */
  footer?: JSX.Element;
};

// ============================================================================
// Unified List Component
// ============================================================================

/** Main unified list component */
export function UnifiedList<T extends { id: string }>(
  props: UnifiedListProps<T>
): JSX.Element {
  const { controller, rowConfig, rowHeight = 40, overscan = 6 } = props;

  // Create virtualizer
  const virtualizer = createVirtualizer({
    get count() {
      return controller.state.entities().length;
    },
    getScrollElement: () => controller.containerRef(),
    estimateSize: () => rowHeight,
    overscan,
  });

  // Update controller with virtualizer handle
  createEffect(() => {
    const handle: VirtualizerHandle = {
      scrollToIndex: (index, options) =>
        virtualizer.scrollToIndex(index, options),
      scrollToOffset: (offset, options) =>
        virtualizer.scrollToOffset(offset, options),
      scrollOffset: virtualizer.scrollOffset ?? 0,
      getTotalSize: () => virtualizer.getTotalSize(),
      getVirtualItems: () => virtualizer.getVirtualItems(),
    };
    controller.setVirtualizerHandle(handle);
  });

  // Cleanup
  onCleanup(() => {
    controller.setVirtualizerHandle(null);
  });

  const entities = controller.state.entities;
  const focusedId = controller.state.focusedId;
  const selectedIds = controller.state.selectedIds;
  const isLoading = controller.state.isLoading;

  // Memoize virtual items
  const virtualItems = createMemo(() => virtualizer.getVirtualItems());

  return (
    <div class={`flex flex-col h-full ${props.class ?? ''}`}>
      {/* Header */}
      <Show when={props.header}>{props.header}</Show>

      {/* Loading state */}
      <Show when={isLoading() && entities().length === 0}>
        {props.loadingIndicator ?? (
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        )}
      </Show>

      {/* Empty state */}
      <Show when={!isLoading() && entities().length === 0}>
        {props.emptyState ?? (
          <div class="flex items-center justify-center py-8 text-ink-muted">
            No items found
          </div>
        )}
      </Show>

      {/* Virtualized list */}
      <Show when={entities().length > 0}>
        <div
          ref={(el) => controller.setContainerRef(el)}
          class="flex-1 overflow-auto"
          tabIndex={0}
        >
          <div
            class="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            <For each={virtualItems()}>
              {(virtualItem) => {
                const entity = entities()[virtualItem.index];
                if (!entity) return null;

                return (
                  <div
                    class="absolute top-0 left-0 w-full"
                    style={{
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <EntityRow
                      entity={entity}
                      index={virtualItem.index}
                      isFocused={focusedId() === entity.id}
                      isSelected={selectedIds().has(entity.id)}
                      config={rowConfig}
                    />
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Loading more indicator */}
      <Show when={isLoading() && entities().length > 0}>
        <div class="flex items-center justify-center py-2">
          <div class="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </Show>

      {/* Footer */}
      <Show when={props.footer}>{props.footer}</Show>
    </div>
  );
}

// ============================================================================
// List Builder
// ============================================================================

export type UnifiedListBuilder<T extends { id: string }> = {
  /** Set row height */
  withRowHeight: (height: number) => UnifiedListBuilder<T>;
  /** Set overscan */
  withOverscan: (overscan: number) => UnifiedListBuilder<T>;
  /** Add a slot renderer */
  withSlot: (
    slot: keyof EntityRowConfig<T>['slots'],
    renderer: SlotRenderer<T>
  ) => UnifiedListBuilder<T>;
  /** Set click handler */
  onClick: (handler: EntityRowConfig<T>['onClick']) => UnifiedListBuilder<T>;
  /** Set double click handler */
  onDoubleClick: (
    handler: EntityRowConfig<T>['onDoubleClick']
  ) => UnifiedListBuilder<T>;
  /** Set pointer down handler */
  onPointerDown: (
    handler: EntityRowConfig<T>['onPointerDown']
  ) => UnifiedListBuilder<T>;
  /** Set loading indicator */
  withLoadingIndicator: (element: JSX.Element) => UnifiedListBuilder<T>;
  /** Set empty state */
  withEmptyState: (element: JSX.Element) => UnifiedListBuilder<T>;
  /** Set header */
  withHeader: (element: JSX.Element) => UnifiedListBuilder<T>;
  /** Set footer */
  withFooter: (element: JSX.Element) => UnifiedListBuilder<T>;
  /** Build props */
  build: () => Omit<UnifiedListProps<T>, 'controller'>;
  /** Create component */
  createComponent: (controller: ListController<T>) => JSX.Element;
};

/** Create a unified list builder */
export function createUnifiedListBuilder<
  T extends { id: string },
>(): UnifiedListBuilder<T> {
  const config: {
    rowHeight: number;
    overscan: number;
    slots: EntityRowConfig<T>['slots'];
    onClick?: EntityRowConfig<T>['onClick'];
    onDoubleClick?: EntityRowConfig<T>['onDoubleClick'];
    onPointerDown?: EntityRowConfig<T>['onPointerDown'];
    loadingIndicator?: JSX.Element;
    emptyState?: JSX.Element;
    header?: JSX.Element;
    footer?: JSX.Element;
  } = {
    rowHeight: 40,
    overscan: 6,
    slots: {},
  };

  const builder: UnifiedListBuilder<T> = {
    withRowHeight(height) {
      config.rowHeight = height;
      return builder;
    },

    withOverscan(overscan) {
      config.overscan = overscan;
      return builder;
    },

    withSlot(slot, renderer) {
      config.slots[slot] = renderer;
      return builder;
    },

    onClick(handler) {
      config.onClick = handler;
      return builder;
    },

    onDoubleClick(handler) {
      config.onDoubleClick = handler;
      return builder;
    },

    onPointerDown(handler) {
      config.onPointerDown = handler;
      return builder;
    },

    withLoadingIndicator(element) {
      config.loadingIndicator = element;
      return builder;
    },

    withEmptyState(element) {
      config.emptyState = element;
      return builder;
    },

    withHeader(element) {
      config.header = element;
      return builder;
    },

    withFooter(element) {
      config.footer = element;
      return builder;
    },

    build() {
      return {
        rowConfig: {
          slots: config.slots,
          height: config.rowHeight,
          onClick: config.onClick,
          onDoubleClick: config.onDoubleClick,
          onPointerDown: config.onPointerDown,
        },
        rowHeight: config.rowHeight,
        overscan: config.overscan,
        loadingIndicator: config.loadingIndicator,
        emptyState: config.emptyState,
        header: config.header,
        footer: config.footer,
      };
    },

    createComponent(controller) {
      const props = builder.build();
      return <UnifiedList controller={controller} {...props} />;
    },
  };

  return builder;
}
