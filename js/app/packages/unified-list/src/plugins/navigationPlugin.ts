/**
 * Navigation Plugin - keyboard navigation for the list.
 *
 * Design:
 * - Pure state transitions for navigation
 * - j/k for up/down, g/G for start/end
 * - Page up/down support
 * - Auto-scroll to keep focused item visible
 */

import type {
  Plugin,
  CleanupFn,
  ListController,
  NavigationInput,
} from '../types';
import { CommandPriority } from '../types';
import { ListCommands } from '../core/commands';

// ============================================================================
// Navigation Plugin Configuration
// ============================================================================

export type NavigationPluginConfig = {
  /** Page size for page up/down */
  pageSize?: number;
  /** Callback when navigation occurs */
  onNavigate?: (entityId: string | null) => void;
  /** Whether to scroll to keep focused item visible */
  autoScroll?: boolean;
  /** Auto-select first item when entities change */
  autoSelectFirst?: boolean;
};

// ============================================================================
// Navigation Plugin Factory
// ============================================================================

/** Create a navigation plugin */
export function createNavigationPlugin<T extends { id: string }>(
  config: NavigationPluginConfig = {}
): Plugin<T, ListController<T>> {
  const {
    pageSize = 10,
    onNavigate,
    autoScroll = true,
    autoSelectFirst = true,
  } = config;

  return (controller: ListController<T>): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    /** Navigate up one item */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_UP,
        () => {
          const entities = controller.state.entities();
          const currentId = controller.state.focusedId();

          if (entities.length === 0) return false;

          const currentIndex = currentId
            ? controller.getEntityIndex(currentId)
            : entities.length;

          const prevIndex = Math.max(currentIndex - 1, 0);
          const prevEntity = entities[prevIndex];
          if (!prevEntity) return false;

          controller.setters.setFocusedId(prevEntity.id);
          onNavigate?.(prevEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(prevEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Navigate down one item */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_DOWN,
        () => {
          const entities = controller.state.entities();
          const currentId = controller.state.focusedId();

          if (entities.length === 0) return false;

          const currentIndex = currentId
            ? controller.getEntityIndex(currentId)
            : -1;

          const nextIndex = Math.min(currentIndex + 1, entities.length - 1);
          const nextEntity = entities[nextIndex];
          if (!nextEntity) return false;

          controller.setters.setFocusedId(nextEntity.id);
          onNavigate?.(nextEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(nextEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Navigate to start */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_START,
        () => {
          const entities = controller.state.entities();
          const firstEntity = entities[0];
          if (!firstEntity) return false;

          controller.setters.setFocusedId(firstEntity.id);
          onNavigate?.(firstEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(firstEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Navigate to end */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_END,
        () => {
          const entities = controller.state.entities();
          const lastEntity = entities[entities.length - 1];
          if (!lastEntity) return false;

          controller.setters.setFocusedId(lastEntity.id);
          onNavigate?.(lastEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(lastEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Navigate page up */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_PAGE_UP,
        () => {
          const entities = controller.state.entities();
          const currentId = controller.state.focusedId();

          if (entities.length === 0) return false;

          const currentIndex = currentId
            ? controller.getEntityIndex(currentId)
            : entities.length;

          const targetIndex = Math.max(currentIndex - pageSize, 0);
          const targetEntity = entities[targetIndex];
          if (!targetEntity) return false;

          controller.setters.setFocusedId(targetEntity.id);
          onNavigate?.(targetEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(targetEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Navigate page down */
    cleanups.push(
      controller.commands.register(
        ListCommands.NAVIGATE_PAGE_DOWN,
        () => {
          const entities = controller.state.entities();
          const currentId = controller.state.focusedId();

          if (entities.length === 0) return false;

          const currentIndex = currentId
            ? controller.getEntityIndex(currentId)
            : -1;

          const targetIndex = Math.min(
            currentIndex + pageSize,
            entities.length - 1
          );
          const targetEntity = entities[targetIndex];
          if (!targetEntity) return false;

          controller.setters.setFocusedId(targetEntity.id);
          onNavigate?.(targetEntity.id);

          if (autoScroll) {
            controller.scrollToEntity(targetEntity.id);
          }

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
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
