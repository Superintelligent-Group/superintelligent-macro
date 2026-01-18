/**
 * Navigation Plugin - keyboard navigation for the list.
 *
 * Design:
 * - Pure state transitions for navigation
 * - j/k for up/down, g/G for start/end
 * - Page up/down support
 * - Auto-scroll to keep focused item visible
 */

import { createEffect, on } from 'solid-js';
import type {
  EntityConstraint,
  Plugin,
  CleanupFn,
  ListController,
} from '../core/types';
import { CommandPriority, ListCommands } from '../core/types';
import type { NavigationInput } from '../types';

// ============================================================================
// Navigation Plugin Configuration
// ============================================================================

export type NavigationPluginConfig = {
  /** Page size for page up/down */
  readonly pageSize?: number;
  /** Callback when navigation occurs */
  readonly onNavigate?: (entityId: string | null) => void;
  /** Whether to scroll to keep focused item visible */
  readonly autoScroll?: boolean;
  /** Auto-select first item when entities change */
  readonly autoSelectFirst?: boolean;
};

// ============================================================================
// Navigation Plugin Factory
// ============================================================================

/** Create a navigation plugin */
export function createNavigationPlugin<T extends EntityConstraint>(
  config: NavigationPluginConfig = {}
): Plugin<T> {
  const {
    pageSize = 10,
    onNavigate,
    autoScroll = true,
    autoSelectFirst = false,
  } = config;

  return (controller: ListController<T>): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    /**
     * Get visible entity IDs in display order.
     * Uses visibleEntityIds if set (for grouping), otherwise falls back to entities.
     */
    const getVisibleIds = (): readonly string[] => {
      const visibleIds = controller.state.visibleEntityIds();
      if (visibleIds) return visibleIds;
      return controller.state.entities().map((e) => e.id);
    };

    // Auto-select first entity when entities become available and nothing is focused
    if (autoSelectFirst) {
      createEffect(
        on(
          () => getVisibleIds(),
          (visibleIds) => {
            // Only auto-select if no entity is currently focused and there are entities
            const currentFocusedId = controller.state.focusedId();
            if (currentFocusedId !== null || visibleIds.length === 0) return;

            const firstId = visibleIds[0];
            if (firstId) {
              controller.setters.setFocusedId(firstId);
              onNavigate?.(firstId);
            }
          }
        )
      );
    }

    /** Get index of an entity in the visible order */
    const getVisibleIndex = (entityId: string): number => {
      return getVisibleIds().indexOf(entityId);
    };

    /** Navigate up one item */
    const upReg = controller.commands.register(
      ListCommands.NAVIGATE_UP,
      () => {
        const visibleIds = getVisibleIds();
        const currentId = controller.state.focusedId();

        if (visibleIds.length === 0) return false;

        const currentIndex = currentId
          ? getVisibleIndex(currentId)
          : visibleIds.length;

        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevId = visibleIds[prevIndex];
        if (!prevId) return false;

        controller.setters.setFocusedId(prevId);
        onNavigate?.(prevId);

        if (autoScroll) {
          controller.scrollToEntity(prevId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(upReg.unregister);

    /** Navigate down one item */
    const downReg = controller.commands.register(
      ListCommands.NAVIGATE_DOWN,
      () => {
        const visibleIds = getVisibleIds();
        const currentId = controller.state.focusedId();

        if (visibleIds.length === 0) return false;

        const currentIndex = currentId ? getVisibleIndex(currentId) : -1;

        const nextIndex = Math.min(currentIndex + 1, visibleIds.length - 1);
        const nextId = visibleIds[nextIndex];
        if (!nextId) return false;

        controller.setters.setFocusedId(nextId);
        onNavigate?.(nextId);

        if (autoScroll) {
          controller.scrollToEntity(nextId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(downReg.unregister);

    /** Navigate to start */
    const firstReg = controller.commands.register(
      ListCommands.NAVIGATE_FIRST,
      () => {
        const visibleIds = getVisibleIds();
        const firstId = visibleIds[0];
        if (!firstId) return false;

        controller.setters.setFocusedId(firstId);
        onNavigate?.(firstId);

        if (autoScroll) {
          controller.scrollToEntity(firstId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(firstReg.unregister);

    /** Navigate to end */
    const lastReg = controller.commands.register(
      ListCommands.NAVIGATE_LAST,
      () => {
        const visibleIds = getVisibleIds();
        const lastId = visibleIds[visibleIds.length - 1];
        if (!lastId) return false;

        controller.setters.setFocusedId(lastId);
        onNavigate?.(lastId);

        if (autoScroll) {
          controller.scrollToEntity(lastId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(lastReg.unregister);

    /** Navigate page up */
    const pageUpReg = controller.commands.register(
      ListCommands.NAVIGATE_PAGE_UP,
      () => {
        const visibleIds = getVisibleIds();
        const currentId = controller.state.focusedId();

        if (visibleIds.length === 0) return false;

        const currentIndex = currentId
          ? getVisibleIndex(currentId)
          : visibleIds.length;

        const targetIndex = Math.max(currentIndex - pageSize, 0);
        const targetId = visibleIds[targetIndex];
        if (!targetId) return false;

        controller.setters.setFocusedId(targetId);
        onNavigate?.(targetId);

        if (autoScroll) {
          controller.scrollToEntity(targetId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(pageUpReg.unregister);

    /** Navigate page down */
    const pageDownReg = controller.commands.register(
      ListCommands.NAVIGATE_PAGE_DOWN,
      () => {
        const visibleIds = getVisibleIds();
        const currentId = controller.state.focusedId();

        if (visibleIds.length === 0) return false;

        const currentIndex = currentId ? getVisibleIndex(currentId) : -1;

        const targetIndex = Math.min(
          currentIndex + pageSize,
          visibleIds.length - 1
        );
        const targetId = visibleIds[targetIndex];
        if (!targetId) return false;

        controller.setters.setFocusedId(targetId);
        onNavigate?.(targetId);

        if (autoScroll) {
          controller.scrollToEntity(targetId);
        }

        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(pageDownReg.unregister);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };
}

// ============================================================================
// Navigation Utilities
// ============================================================================

/** Calculate the target index for a navigation action */
export function calculateNavigationTarget(
  input: NavigationInput,
  currentIndex: number,
  totalCount: number,
  pageSize: number
): number {
  const { direction, mode } = input;

  switch (direction) {
    case 'up':
      if (mode === 'jump') return 0;
      if (mode === 'page') return Math.max(currentIndex - pageSize, 0);
      return Math.max(currentIndex - 1, 0);

    case 'down':
      if (mode === 'jump') return totalCount - 1;
      if (mode === 'page')
        return Math.min(currentIndex + pageSize, totalCount - 1);
      return Math.min(currentIndex + 1, totalCount - 1);

    case 'start':
      return 0;

    case 'end':
      return totalCount - 1;
  }
}
