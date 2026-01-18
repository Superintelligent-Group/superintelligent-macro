/**
 * Action Plugin - entity actions (mark done, delete, etc.).
 *
 * Design:
 * - Actions are registered functions that operate on entities
 * - Actions can have conditions for when they're enabled
 * - Actions can be triggered via commands or UI
 */

import type {
  EntityConstraint,
  Plugin,
  CleanupFn,
  ListController,
  PluginWithStore,
} from '../core/types';
import { CommandPriority, ListCommands } from '../core/types';
import type { OpenEntityPayload } from '../core/commands';
import type { EntityAction } from '../types';

// ============================================================================
// Action Registry
// ============================================================================

export type ActionRegistry<T> = {
  /** Register an action */
  readonly register: (action: EntityAction<T>) => CleanupFn;
  /** Get an action by ID */
  readonly get: (actionId: string) => EntityAction<T> | undefined;
  /** Get all actions */
  readonly getAll: () => readonly EntityAction<T>[];
  /** Check if an action can execute */
  readonly canExecute: (actionId: string, entities: readonly T[]) => boolean;
  /** Execute an action */
  readonly execute: (actionId: string, entities: readonly T[]) => Promise<void>;
};

/** Create an action registry */
export function createActionRegistry<T>(): ActionRegistry<T> {
  const actions = new Map<string, EntityAction<T>>();

  return {
    register(action: EntityAction<T>): CleanupFn {
      actions.set(action.id, action);
      return () => {
        actions.delete(action.id);
      };
    },

    get(actionId: string): EntityAction<T> | undefined {
      return actions.get(actionId);
    },

    getAll(): readonly EntityAction<T>[] {
      return Array.from(actions.values());
    },

    canExecute(actionId: string, entities: readonly T[]): boolean {
      const action = actions.get(actionId);
      if (!action) return false;
      return action.canExecute([...entities]);
    },

    async execute(actionId: string, entities: readonly T[]): Promise<void> {
      const action = actions.get(actionId);
      if (!action) return;
      if (!action.canExecute([...entities])) return;
      await action.handler([...entities]);
    },
  };
}

// ============================================================================
// Action Plugin Configuration
// ============================================================================

export type ActionPluginConfig<T> = {
  /** Actions to register */
  readonly actions?: readonly EntityAction<T>[];
  /** Handler for opening entities */
  readonly onOpenEntity?: (
    entity: T,
    options?: { preview?: boolean; newSplit?: boolean }
  ) => void;
  /** Handler for marking entities as done */
  readonly onMarkDone?: (entities: readonly T[]) => Promise<void>;
  /** Handler for deleting entities */
  readonly onDelete?: (entities: readonly T[]) => Promise<void>;
};

// ============================================================================
// Action Plugin Factory
// ============================================================================

/** Create an action plugin */
export function createActionPlugin<T extends EntityConstraint>(
  config: ActionPluginConfig<T> = {}
): PluginWithStore<T, ActionRegistry<T>> {
  const registry = createActionRegistry<T>();
  const { actions = [], onOpenEntity, onMarkDone, onDelete } = config;

  // Register initial actions
  for (const action of actions) {
    registry.register(action);
  }

  const plugin: Plugin<T> = (controller: ListController<T>): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    // Register open entity command
    const openReg = controller.commands.register<OpenEntityPayload | undefined>(
      ListCommands.OPEN_ENTITY,
      (payload) => {
        // If payload has entityId, try to get that entity
        const entity = payload?.entityId
          ? controller.getEntityById(payload.entityId)
          : undefined;
        if (!entity) {
          // If no entity from payload, use focused entity
          const focused = controller.getFocusedEntity();
          if (!focused) return false;
          onOpenEntity?.(focused, {
            preview: false,
            newSplit: payload?.newSplit,
          });
          return true;
        }
        onOpenEntity?.(entity, {
          preview: false,
          newSplit: payload?.newSplit,
        });
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(openReg.unregister);

    // Register open preview command
    const previewReg = controller.commands.register(
      ListCommands.OPEN_ENTITY_PREVIEW,
      () => {
        const focused = controller.getFocusedEntity();
        if (!focused) return false;
        onOpenEntity?.(focused, { preview: true });
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(previewReg.unregister);

    // Register mark done command
    const markDoneReg = controller.commands.register(
      ListCommands.MARK_DONE,
      () => {
        const selectedIds = controller.state.selectedIds();
        let entities: T[];

        if (selectedIds.size > 0) {
          entities = Array.from(selectedIds)
            .map((id) => controller.getEntityById(id))
            .filter((e): e is T => e !== undefined);
        } else {
          const focused = controller.getFocusedEntity();
          if (!focused) return false;
          entities = [focused];
        }

        if (entities.length === 0) return false;

        if (registry.canExecute('mark_done', entities)) {
          registry.execute('mark_done', entities);
          return true;
        }

        onMarkDone?.(entities);
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(markDoneReg.unregister);

    // Register delete command
    const deleteReg = controller.commands.register(
      ListCommands.DELETE_SELECTED,
      () => {
        const selectedIds = controller.state.selectedIds();
        let entities: T[];

        if (selectedIds.size > 0) {
          entities = Array.from(selectedIds)
            .map((id) => controller.getEntityById(id))
            .filter((e): e is T => e !== undefined);
        } else {
          const focused = controller.getFocusedEntity();
          if (!focused) return false;
          entities = [focused];
        }

        if (entities.length === 0) return false;

        if (registry.canExecute('delete', entities)) {
          registry.execute('delete', entities);
          return true;
        }

        onDelete?.(entities);
        return true;
      },
      CommandPriority.NORMAL
    );
    cleanups.push(deleteReg.unregister);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

  // Expose both `store` (new pattern) and `registry` (backwards compat)
  return Object.assign(plugin, { store: registry, registry });
}

// ============================================================================
// Pre-built Actions
// ============================================================================

/** Create a mark done action for entities with done state */
export function createMarkDoneAction<T extends EntityConstraint>(
  handler: (entities: T[]) => Promise<void>
): EntityAction<T> {
  return {
    id: 'mark_done',
    label: 'Mark as Done',
    handler,
    canExecute: () => true,
    hotkey: 'e',
  };
}

/** Create a delete action */
export function createDeleteAction<T extends EntityConstraint>(
  handler: (entities: T[]) => Promise<void>,
  canDelete?: (entities: T[]) => boolean
): EntityAction<T> {
  return {
    id: 'delete',
    label: 'Delete',
    handler,
    canExecute: canDelete ?? (() => true),
    hotkey: 'Delete',
  };
}
