/**
 * Action Plugin - entity actions (mark done, delete, etc.).
 *
 * Design:
 * - Actions are registered functions that operate on entities
 * - Actions can have conditions for when they're enabled
 * - Actions can be triggered via commands or UI
 */

import { createSignal, type Accessor } from 'solid-js';
import type { Plugin, CleanupFn, ListController, EntityAction } from '../types';
import { CommandPriority } from '../types';
import { ListCommands, type OpenEntityPayload } from '../core/commands';

// ============================================================================
// Action Registry
// ============================================================================

export type ActionRegistry<T> = {
  /** Register an action */
  register: (action: EntityAction<T>) => CleanupFn;
  /** Get an action by ID */
  get: (actionId: string) => EntityAction<T> | undefined;
  /** Get all actions */
  getAll: () => EntityAction<T>[];
  /** Check if an action can execute */
  canExecute: (actionId: string, entities: T[]) => boolean;
  /** Execute an action */
  execute: (actionId: string, entities: T[]) => Promise<void>;
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

    getAll(): EntityAction<T>[] {
      return Array.from(actions.values());
    },

    canExecute(actionId: string, entities: T[]): boolean {
      const action = actions.get(actionId);
      if (!action) return false;
      return action.canExecute(entities);
    },

    async execute(actionId: string, entities: T[]): Promise<void> {
      const action = actions.get(actionId);
      if (!action) return;
      if (!action.canExecute(entities)) return;
      await action.handler(entities);
    },
  };
}

// ============================================================================
// Action Plugin Configuration
// ============================================================================

export type ActionPluginConfig<T> = {
  /** Actions to register */
  actions?: EntityAction<T>[];
  /** Handler for opening entities */
  onOpenEntity?: (
    entity: T,
    options?: { preview?: boolean; newSplit?: boolean }
  ) => void;
  /** Handler for marking entities as done */
  onMarkDone?: (entities: T[]) => Promise<void>;
  /** Handler for deleting entities */
  onDelete?: (entities: T[]) => Promise<void>;
};

// ============================================================================
// Action Plugin Factory
// ============================================================================

/** Create an action plugin */
export function createActionPlugin<T extends { id: string }>(
  config: ActionPluginConfig<T> = {}
): Plugin<T, ListController<T>> & { registry: ActionRegistry<T> } {
  const registry = createActionRegistry<T>();
  const { actions = [], onOpenEntity, onMarkDone, onDelete } = config;

  // Register initial actions
  actions.forEach((action) => registry.register(action));

  const plugin: Plugin<T, ListController<T>> = (
    controller: ListController<T>
  ): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    // Register open entity command
    cleanups.push(
      controller.commands.register<OpenEntityPayload>(
        ListCommands.OPEN_ENTITY,
        (payload) => {
          const entity = controller.getEntityById(payload.entityId);
          if (!entity) {
            // If no payload, use focused entity
            const focused = controller.getFocusedEntity();
            if (!focused) return false;
            onOpenEntity?.(focused, {
              preview: false,
              newSplit: payload.newSplit,
            });
            return true;
          }
          onOpenEntity?.(entity, {
            preview: false,
            newSplit: payload.newSplit,
          });
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    // Register open preview command
    cleanups.push(
      controller.commands.register(
        ListCommands.OPEN_ENTITY_PREVIEW,
        () => {
          const focused = controller.getFocusedEntity();
          if (!focused) return false;
          onOpenEntity?.(focused, { preview: true });
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    // Register mark done command
    cleanups.push(
      controller.commands.register(
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
      )
    );

    // Register delete command
    cleanups.push(
      controller.commands.register(
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
      )
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  };

  return Object.assign(plugin, { registry });
}

// ============================================================================
// Pre-built Actions
// ============================================================================

/** Create a mark done action for entities with done state */
export function createMarkDoneAction<T extends { id: string; done?: boolean }>(
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
export function createDeleteAction<T extends { id: string }>(
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
