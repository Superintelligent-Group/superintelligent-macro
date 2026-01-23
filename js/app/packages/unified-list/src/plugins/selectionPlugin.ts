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
  EntityConstraint,
  Plugin,
  ListController,
  SelectionMode,
  PluginWithStore,
} from '../core/types';
import { CommandPriority, ListCommands } from '../core/types';
import { mergeRegister, type ToggleSelectionPayload } from '../core/commands';

// ============================================================================
// Selection State
// ============================================================================

export type SelectionStore = {
  /** Selection mode */
  readonly mode: Accessor<SelectionMode>;
  /** Selected entity IDs */
  readonly selectedIds: Accessor<ReadonlySet<string>>;
  /** Anchor ID for range selection */
  readonly anchorId: Accessor<string | null>;
  /** Last clicked ID */
  readonly lastClickedId: Accessor<string | null>;
  /** Setters */
  readonly setMode: Setter<SelectionMode>;
  readonly setSelectedIds: Setter<ReadonlySet<string>>;
  readonly setAnchorId: Setter<string | null>;
  readonly setLastClickedId: Setter<string | null>;
};

/** Create selection store */
export function createSelectionStore(): SelectionStore {
  const [mode, setMode] = createSignal<SelectionMode>('multi');
  const [selectedIds, setSelectedIds] = createSignal<ReadonlySet<string>>(
    new Set()
  );
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
  readonly mode?: SelectionMode;
  /** Callback when selection changes */
  readonly onSelectionChange?: (selectedIds: ReadonlySet<string>) => void;
};

// ============================================================================
// Selection Plugin Factory
// ============================================================================

/** Create a selection plugin */
export function createSelectionPlugin<T extends EntityConstraint>(
  config: SelectionPluginConfig = {}
): PluginWithStore<T, SelectionStore> {
  const store = createSelectionStore();
  if (config.mode) {
    store.setMode(config.mode);
  }

  const plugin: Plugin<T> = (controller: ListController<T>) => {
    /** Helper to sync selection to both store and controller */
    const setSelection = (ids: ReadonlySet<string>) => {
      store.setSelectedIds(ids);
      controller.setters.setSelectedIds(ids);
      config.onSelectionChange?.(ids);
    };

    return mergeRegister(
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

                setSelection(newSelectedIds);
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

          setSelection(newSelectedIds);
          store.setLastClickedId(entityId);

          return true;
        },
        CommandPriority.NORMAL
      ),
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
      ),
      controller.commands.register(
        ListCommands.SELECT_ALL,
        () => {
          const entities = controller.state.entities();
          const allIds: ReadonlySet<string> = new Set(
            entities.map((e) => e.id)
          );

          setSelection(allIds);

          return true;
        },
        CommandPriority.NORMAL
      ),
      controller.commands.register(
        ListCommands.CLEAR_SELECTION,
        () => {
          const empty: ReadonlySet<string> = new Set();
          store.setAnchorId(null);
          store.setLastClickedId(null);
          setSelection(empty);

          return true;
        },
        CommandPriority.NORMAL
      ),
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
          setSelection(newSelectedIds);

          return true;
        },
        CommandPriority.NORMAL
      ),
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
          setSelection(newSelectedIds);

          return true;
        },
        CommandPriority.NORMAL
      )
    );
  };

  return Object.assign(plugin, { store });
}
