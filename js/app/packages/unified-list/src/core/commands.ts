/**
 * Command system for unified-list.
 *
 * Inspired by Lexical's command system - allows plugins to register
 * handlers for named commands with priority-based execution.
 *
 * Key features:
 * - Priority-based execution (lower priority = earlier execution)
 * - First handler to return true stops execution
 * - Automatic cleanup via returned unregister function
 *
 * @example
 * ```ts
 * const unregister = commands.register(
 *   ListCommands.NAVIGATE_DOWN,
 *   () => {
 *     // Handle navigation
 *     return true; // Command was handled
 *   },
 *   CommandPriority.NORMAL
 * );
 *
 * // Later: dispatch the command
 * commands.dispatch(ListCommands.NAVIGATE_DOWN, undefined);
 *
 * // Cleanup
 * unregister();
 * ```
 */

import type {
  CommandHandler,
  CommandPriorityValue,
  CommandSystem,
  CommandRegistration,
} from './types';
import { CommandPriority } from './types';

// ============================================================================
// Internal Types
// ============================================================================

type RegisteredHandler<TPayload = unknown> = {
  readonly handler: CommandHandler<TPayload>;
  readonly priority: CommandPriorityValue;
};

// ============================================================================
// Command System Factory
// ============================================================================

/** Create a command system instance */
export function createCommandSystem(): CommandSystem {
  // Map of command name to array of handlers sorted by priority
  const handlers = new Map<string, RegisteredHandler[]>();

  /** Register a command handler */
  function register<TPayload = void>(
    command: string,
    handler: CommandHandler<TPayload>,
    priority: CommandPriorityValue = CommandPriority.NORMAL
  ): CommandRegistration {
    const registration: RegisteredHandler<TPayload> = { handler, priority };

    const existing = handlers.get(command) ?? [];
    const updated = [...existing, registration as RegisteredHandler].sort(
      (a, b) => a.priority - b.priority
    );
    handlers.set(command, updated);

    return {
      unregister: () => {
        const current = handlers.get(command);
        if (current) {
          const filtered = current.filter((h) => h !== registration);
          if (filtered.length === 0) {
            handlers.delete(command);
          } else {
            handlers.set(command, filtered);
          }
        }
      },
    };
  }

  /** Dispatch a command to all registered handlers */
  function dispatch<TPayload = void>(
    command: string,
    payload: TPayload
  ): boolean {
    const registered = handlers.get(command);
    if (!registered || registered.length === 0) {
      return false;
    }

    // Execute handlers in priority order until one returns true
    for (const { handler } of registered) {
      if (handler(payload)) {
        return true;
      }
    }

    return false;
  }

  /** Check if a command has handlers */
  function hasHandlers(command: string): boolean {
    const registered = handlers.get(command);
    return registered !== undefined && registered.length > 0;
  }

  return { register, dispatch, hasHandlers };
}

// ============================================================================
// Standard Command Names - Re-exported from core/types.ts
// ============================================================================

export { ListCommands } from './types';
export type { ListCommand } from './types';

// ============================================================================
// Command Payload Types
// ============================================================================

/** Payload for toggle filter command */
export type ToggleFilterPayload = {
  readonly filterId: string;
};

/** Payload for toggle selection command */
export type ToggleSelectionPayload = {
  readonly entityId: string;
  readonly shiftKey?: boolean;
};

/** Payload for open entity command */
export type OpenEntityPayload = {
  readonly entityId: string;
  readonly preview?: boolean;
  readonly newSplit?: boolean;
};

/** Payload for execute action command */
export type ExecuteActionPayload = {
  readonly actionId: string;
  readonly entityIds?: readonly string[];
};

/** Payload for toggle group command */
export type ToggleGroupPayload = {
  readonly groupId: string;
};
