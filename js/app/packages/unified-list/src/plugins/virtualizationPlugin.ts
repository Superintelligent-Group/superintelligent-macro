/**
 * Virtualization Plugin - virtual list rendering with infinite scroll.
 *
 * Design:
 * - Uses @tanstack/solid-virtual for efficient rendering
 * - Supports infinite scrolling with fetch-more triggers
 * - Scroll position caching and restoration
 * - Dynamic overscan calculation
 */

import { createSignal, createEffect, onCleanup, type Accessor } from 'solid-js';
import type {
  Plugin,
  CleanupFn,
  ListController,
  VirtualizerHandle,
} from '../types';
import { CommandPriority } from '../types';
import { ListCommands } from '../core/commands';

// ============================================================================
// Virtualization Types
// ============================================================================

export type ScrollCacheEntry = {
  offset: number;
  timestamp: number;
};

// ============================================================================
// Virtualization Plugin Configuration
// ============================================================================

export type VirtualizationPluginConfig = {
  /** Height of each entity row */
  itemHeight?: number;
  /** Overscan count (items to render above/below viewport) */
  overscan?: number;
  /** Threshold for triggering fetch more (0-1, percentage of scroll) */
  fetchMoreThreshold?: number;
  /** Debounce time for fetch more (ms) */
  fetchMoreDebounce?: number;
  /** Whether to cache scroll positions */
  cacheScrollPosition?: boolean;
  /** Cache key for scroll position storage */
  cacheKey?: string;
};

// ============================================================================
// Scroll Position Cache
// ============================================================================

const scrollCache = new Map<string, ScrollCacheEntry>();
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/** Get cached scroll position */
export function getCachedScrollPosition(key: string): number | null {
  const entry = scrollCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_EXPIRY_MS) {
    scrollCache.delete(key);
    return null;
  }

  return entry.offset;
}

/** Set cached scroll position */
export function setCachedScrollPosition(key: string, offset: number): void {
  scrollCache.set(key, {
    offset,
    timestamp: Date.now(),
  });
}

/** Clear cached scroll position */
export function clearCachedScrollPosition(key: string): void {
  scrollCache.delete(key);
}

// ============================================================================
// Virtualization Plugin Factory
// ============================================================================

/** Create a virtualization plugin */
export function createVirtualizationPlugin<T extends { id: string }>(
  config: VirtualizationPluginConfig = {}
): Plugin<T, ListController<T>> {
  const {
    itemHeight = 40,
    overscan = 6,
    fetchMoreThreshold = 0.9,
    fetchMoreDebounce = 50,
    cacheScrollPosition = true,
    cacheKey,
  } = config;

  return (controller: ListController<T>): CleanupFn => {
    const cleanups: CleanupFn[] = [];
    let fetchMoreTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastFetchMoreTime = 0;

    /** Check if we should fetch more based on scroll position */
    const checkFetchMore = (): void => {
      const handle = controller.virtualizerHandle();
      const container = controller.containerRef();
      if (!handle || !container) return;

      if (controller.state.isLoading() || !controller.state.hasMore()) return;

      const scrollHeight = handle.getTotalSize();
      const clientHeight = container.clientHeight;
      const scrollTop = handle.scrollOffset;

      // Calculate scroll percentage
      const scrollPercentage =
        (scrollTop + clientHeight) / Math.max(scrollHeight, clientHeight);

      if (scrollPercentage >= fetchMoreThreshold) {
        const now = Date.now();
        if (now - lastFetchMoreTime < fetchMoreDebounce) return;

        lastFetchMoreTime = now;

        // Debounce fetch more
        if (fetchMoreTimeout) {
          clearTimeout(fetchMoreTimeout);
        }

        fetchMoreTimeout = setTimeout(() => {
          controller.fetchMore();
        }, fetchMoreDebounce);
      }
    };

    // Register fetch more command
    cleanups.push(
      controller.commands.register(
        ListCommands.FETCH_MORE,
        () => {
          controller.fetchMore();
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    // Set up scroll position caching
    if (cacheScrollPosition && cacheKey) {
      // Restore cached position
      const cachedOffset = getCachedScrollPosition(cacheKey);
      if (cachedOffset !== null) {
        // Defer restoration until virtualizer is ready
        createEffect(() => {
          const handle = controller.virtualizerHandle();
          if (handle && cachedOffset > 0) {
            handle.scrollToOffset(cachedOffset, { behavior: 'auto' });
          }
        });
      }

      // Save position on scroll
      createEffect(() => {
        const handle = controller.virtualizerHandle();
        if (handle) {
          const offset = handle.scrollOffset;
          setCachedScrollPosition(cacheKey, offset);
          controller.setters.setScrollOffset(offset);
        }
      });
    }

    // Cleanup
    onCleanup(() => {
      if (fetchMoreTimeout) {
        clearTimeout(fetchMoreTimeout);
      }
    });

    return () => {
      if (fetchMoreTimeout) {
        clearTimeout(fetchMoreTimeout);
      }
      cleanups.forEach((cleanup) => cleanup());
    };
  };
}

// ============================================================================
// Virtualization Utilities
// ============================================================================

/** Calculate optimal overscan based on viewport */
export function calculateOverscan(
  containerHeight: number,
  itemHeight: number,
  minOverscan = 6
): number {
  const viewportItems = Math.ceil(containerHeight / itemHeight);
  const dynamicOverscan = Math.ceil(viewportItems * 0.5);
  return Math.max(minOverscan, dynamicOverscan);
}

/** Create virtualizer configuration */
export function createVirtualizerConfig<T>(
  entities: Accessor<T[]>,
  containerRef: Accessor<HTMLElement | null>,
  config: {
    itemHeight: number;
    overscan: number;
  }
): {
  count: () => number;
  getScrollElement: () => HTMLElement | null;
  estimateSize: () => number;
  overscan: () => number;
} {
  return {
    count: () => entities().length,
    getScrollElement: () => containerRef(),
    estimateSize: () => config.itemHeight,
    overscan: () => config.overscan,
  };
}
