/**
 * Command system for unified-list.
 *
 * Similar to Lexical's command system - allows plugins to register
 * handlers for named commands with priority-based execution.
 */

import type {
  CommandHandler,
  CommandPriorityValue,
  CommandSystem,
  CleanupFn,
} from '../types';
import { CommandPriority } from '../types';

// ============================================================================
// Command Registration
// ============================================================================

type RegisteredHandler<Payload = unknown> = {
  handler: CommandHandler<Payload>;
  priority: CommandPriorityValue;
};

/** Create a command system instance */
export function createCommandSystem(): CommandSystem {
  // Map of command name to array of handlers sorted by priority
  const handlers = new Map<string, RegisteredHandler[]>();

  /** Register a command handler */
  function register<Payload>(
    name: string,
    handler: CommandHandler<Payload>,
    priority: CommandPriorityValue = CommandPriority.NORMAL
  ): CleanupFn {
    const registration: RegisteredHandler<Payload> = { handler, priority };

    const existing = handlers.get(name) ?? [];
    const newHandlers = [...existing, registration as RegisteredHandler].sort(
      (a, b) => a.priority - b.priority
    );
    handlers.set(name, newHandlers);

    // Return cleanup function
    return () => {
      const current = handlers.get(name);
      if (current) {
        const filtered = current.filter((h) => h !== registration);
        if (filtered.length === 0) {
          handlers.delete(name);
        } else {
          handlers.set(name, filtered);
        }
      }
    };
  }

  /** Dispatch a command to all registered handlers */
  function dispatch<Payload>(name: string, payload: Payload): boolean {
    const registeredHandlers = handlers.get(name);
    if (!registeredHandlers || registeredHandlers.length === 0) {
      return false;
    }

    // Execute handlers in priority order until one returns true
    for (const registration of registeredHandlers) {
      const result = registration.handler(payload);
      if (result) {
        return true;
      }
    }

    return false;
  }

  /** Check if a command can be dispatched (has handlers) */
  function canDispatch(name: string): boolean {
    const registeredHandlers = handlers.get(name);
    return registeredHandlers !== undefined && registeredHandlers.length > 0;
  }

  return { register, dispatch, canDispatch };
}

// ============================================================================
// Built-in Command Names
// ============================================================================

/** Standard command names for the unified list */
export const ListCommands = {
  // Navigation
  NAVIGATE_UP: 'unified-list:navigate-up',
  NAVIGATE_DOWN: 'unified-list:navigate-down',
  NAVIGATE_START: 'unified-list:navigate-start',
  NAVIGATE_END: 'unified-list:navigate-end',
  NAVIGATE_PAGE_UP: 'unified-list:navigate-page-up',
  NAVIGATE_PAGE_DOWN: 'unified-list:navigate-page-down',

  // Selection
  SELECT_FOCUSED: 'unified-list:select-focused',
  SELECT_ALL: 'unified-list:select-all',
  CLEAR_SELECTION: 'unified-list:clear-selection',
  TOGGLE_SELECTION: 'unified-list:toggle-selection',
  EXTEND_SELECTION_UP: 'unified-list:extend-selection-up',
  EXTEND_SELECTION_DOWN: 'unified-list:extend-selection-down',

  // Actions
  OPEN_ENTITY: 'unified-list:open-entity',
  OPEN_ENTITY_PREVIEW: 'unified-list:open-entity-preview',
  TOGGLE_PREVIEW: 'unified-list:toggle-preview',
  MARK_DONE: 'unified-list:mark-done',
  DELETE_SELECTED: 'unified-list:delete-selected',

  // Filtering
  TOGGLE_FILTER: 'unified-list:toggle-filter',
  CLEAR_FILTERS: 'unified-list:clear-filters',

  // Search
  FOCUS_SEARCH: 'unified-list:focus-search',
  CLEAR_SEARCH: 'unified-list:clear-search',

  // Data
  FETCH_MORE: 'unified-list:fetch-more',
  REFRESH: 'unified-list:refresh',
} as const;

export type ListCommandName = (typeof ListCommands)[keyof typeof ListCommands];

// ============================================================================
// Command Payload Types
// ============================================================================

/** Payload for toggle filter command */
export type ToggleFilterPayload = {
  filterId: string;
};

/** Payload for toggle selection command */
export type ToggleSelectionPayload = {
  entityId: string;
  shiftKey?: boolean;
};

/** Payload for open entity command */
export type OpenEntityPayload = {
  entityId: string;
  preview?: boolean;
  newSplit?: boolean;
};
