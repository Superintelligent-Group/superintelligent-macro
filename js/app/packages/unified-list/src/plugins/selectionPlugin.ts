/**
 * Selection Plugin - multi-selection support.
 *
 * Design:
 * - Single and multi-selection modes
 * - Shift+click for range selection
 * - Cmd/Ctrl+click for toggle selection
 * - x key for toggle, a for select all
 */

import { createSignal, type Accessor, type Setter } from 'solid-js';
import type {
  Plugin,
  CleanupFn,
  ListController,
  SelectionMode,
} from '../types';
import { CommandPriority } from '../types';
import { ListCommands, type ToggleSelectionPayload } from '../core/commands';

// ============================================================================
// Selection State
// ============================================================================

export type SelectionStore = {
  /** Selection mode */
  mode: Accessor<SelectionMode>;
  /** Selected entity IDs */
  selectedIds: Accessor<Set<string>>;
  /** Anchor ID for range selection */
  anchorId: Accessor<string | null>;
  /** Last clicked ID */
  lastClickedId: Accessor<string | null>;
  /** Setters */
  setMode: Setter<SelectionMode>;
  setSelectedIds: Setter<Set<string>>;
  setAnchorId: Setter<string | null>;
  setLastClickedId: Setter<string | null>;
};

/** Create selection store */
export function createSelectionStore(): SelectionStore {
  const [mode, setMode] = createSignal<SelectionMode>('multi');
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());
  const [anchorId, setAnchorId] = createSignal<string | null>(null);
  const [lastClickedId, setLastClickedId] = createSignal<string | null>(null);

  return {
    mode,
    selectedIds,
    anchorId,
    lastClickedId,
    setMode,
    setSelectedIds,
    setAnchorId,
    setLastClickedId,
  };
}

// ============================================================================
// Selection Plugin Configuration
// ============================================================================

export type SelectionPluginConfig = {
  /** Initial selection mode */
  mode?: SelectionMode;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
};

// ============================================================================
// Selection Plugin Factory
// ============================================================================

/** Create a selection plugin */
export function createSelectionPlugin<T extends { id: string }>(
  config: SelectionPluginConfig = {}
): Plugin<T, ListController<T>> & { store: SelectionStore } {
  const store = createSelectionStore();
  if (config.mode) {
    store.setMode(config.mode);
  }

  const plugin: Plugin<T, ListController<T>> = (
    controller: ListController<T>
  ): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    /** Toggle selection of focused entity */
    cleanups.push(
      controller.commands.register<ToggleSelectionPayload>(
        ListCommands.TOGGLE_SELECTION,
        (payload) => {
          const { entityId, shiftKey } = payload;

          if (shiftKey && store.mode() === 'multi') {
            // Range selection
            const anchor = store.anchorId();
            if (anchor) {
              const anchorIndex = controller.getEntityIndex(anchor);
              const targetIndex = controller.getEntityIndex(entityId);

              if (anchorIndex !== -1 && targetIndex !== -1) {
                const entities = controller.state.entities();
                const startIndex = Math.min(anchorIndex, targetIndex);
                const endIndex = Math.max(anchorIndex, targetIndex);

                const newSelectedIds = new Set(store.selectedIds());
                for (let i = startIndex; i <= endIndex; i++) {
                  const entity = entities[i];
                  if (entity) {
                    newSelectedIds.add(entity.id);
                  }
                }

                store.setSelectedIds(newSelectedIds);
                controller.setters.setSelectedIds(newSelectedIds);
                config.onSelectionChange?.(newSelectedIds);
                store.setLastClickedId(entityId);
                return true;
              }
            }
          }

          // Single toggle
          const currentSelected = store.selectedIds();
          const newSelectedIds = new Set(currentSelected);

          if (newSelectedIds.has(entityId)) {
            newSelectedIds.delete(entityId);
          } else {
            newSelectedIds.add(entityId);
            store.setAnchorId(entityId);
          }

          store.setSelectedIds(newSelectedIds);
          controller.setters.setSelectedIds(newSelectedIds);
          config.onSelectionChange?.(newSelectedIds);
          store.setLastClickedId(entityId);

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Select focused entity */
    cleanups.push(
      controller.commands.register(
        ListCommands.SELECT_FOCUSED,
        () => {
          const focusedId = controller.state.focusedId();
          if (!focusedId) return false;

          return controller.commands.dispatch<ToggleSelectionPayload>(
            ListCommands.TOGGLE_SELECTION,
            { entityId: focusedId }
          );
        },
        CommandPriority.NORMAL
      )
    );

    /** Select all entities */
    cleanups.push(
      controller.commands.register(
        ListCommands.SELECT_ALL,
        () => {
          const entities = controller.state.entities();
          const allIds = new Set(entities.map((e) => e.id));

          store.setSelectedIds(allIds);
          controller.setters.setSelectedIds(allIds);
          config.onSelectionChange?.(allIds);

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Clear selection */
    cleanups.push(
      controller.commands.register(
        ListCommands.CLEAR_SELECTION,
        () => {
          store.setSelectedIds(new Set<string>());
          store.setAnchorId(null);
          store.setLastClickedId(null);
          controller.setters.setSelectedIds(new Set<string>());
          config.onSelectionChange?.(new Set<string>());

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Extend selection up */
    cleanups.push(
      controller.commands.register(
        ListCommands.EXTEND_SELECTION_UP,
        () => {
          const focusedId = controller.state.focusedId();
          if (!focusedId) return false;

          const entities = controller.state.entities();
          const currentIndex = controller.getEntityIndex(focusedId);

          if (currentIndex <= 0) return false;

          const prevEntity = entities[currentIndex - 1];
          if (!prevEntity) return false;

          // Navigate and select
          controller.setters.setFocusedId(prevEntity.id);
          controller.scrollToEntity(prevEntity.id);

          // Add to selection
          const newSelectedIds = new Set(store.selectedIds());
          newSelectedIds.add(prevEntity.id);
          store.setSelectedIds(newSelectedIds);
          controller.setters.setSelectedIds(newSelectedIds);
          config.onSelectionChange?.(newSelectedIds);

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    /** Extend selection down */
    cleanups.push(
      controller.commands.register(
        ListCommands.EXTEND_SELECTION_DOWN,
        () => {
          const focusedId = controller.state.focusedId();
          if (!focusedId) return false;

          const entities = controller.state.entities();
          const currentIndex = controller.getEntityIndex(focusedId);

          if (currentIndex >= entities.length - 1) return false;

          const nextEntity = entities[currentIndex + 1];
          if (!nextEntity) return false;

          // Navigate and select
          controller.setters.setFocusedId(nextEntity.id);
          controller.scrollToEntity(nextEntity.id);

          // Add to selection
          const newSelectedIds = new Set(store.selectedIds());
          newSelectedIds.add(nextEntity.id);
          store.setSelectedIds(newSelectedIds);
          controller.setters.setSelectedIds(newSelectedIds);
          config.onSelectionChange?.(newSelectedIds);

          return true;
        },
        CommandPriority.NORMAL
      )
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  };

  return Object.assign(plugin, { store });
}

// ============================================================================
// Selection Utilities
// ============================================================================

/** Calculate range selection IDs */
export function calculateRangeSelection<T extends { id: string }>(
  entities: T[],
  fromId: string,
  toId: string,
  existingSelection: Set<string>
): Set<string> {
  const fromIndex = entities.findIndex((e) => e.id === fromId);
  const toIndex = entities.findIndex((e) => e.id === toId);

  if (fromIndex === -1 || toIndex === -1) {
    return existingSelection;
  }

  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);

  const newSelection = new Set(existingSelection);
  for (let i = startIndex; i <= endIndex; i++) {
    const entity = entities[i];
    if (entity) {
      newSelection.add(entity.id);
    }
  }

  return newSelection;
}
