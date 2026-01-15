/**
 * Hotkey Plugin - keyboard shortcut bindings.
 *
 * Design:
 * - Integrates with the existing registerHotkey system from @core/hotkey
 * - Uses scope tree for proper hotkey scoping
 * - Declarative hotkey to command mapping
 * - Support for modifier keys (Shift, Ctrl, Meta)
 *
 * IMPORTANT: This plugin now uses the existing hotkey system instead of
 * adding its own document event listeners. This ensures proper integration
 * with the rest of the app's hotkey scopes.
 */

import { onCleanup } from 'solid-js';
import { registerHotkey } from '@core/hotkey/hotkeys';
import type { ValidHotkey } from '@core/hotkey/types';
import type { Plugin, CleanupFn, ListController } from '../types';
import { ListCommands } from '../core/commands';

// ============================================================================
// Hotkey Types
// ============================================================================

export type HotkeyModifiers = {
  shift?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
};

export type HotkeyBinding = {
  /** Key to listen for (e.g., 'j', 'ArrowDown', 'Enter') */
  key: string;
  /** Modifier keys required */
  modifiers?: HotkeyModifiers;
  /** Command to dispatch */
  command: string;
  /** Payload for the command */
  payload?: unknown;
  /** Description for help display */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
};

// ============================================================================
// Hotkey Plugin Configuration
// ============================================================================

export type HotkeyPluginConfig = {
  /**
   * Scope ID from the existing hotkey system.
   * This should come from useHotkeyDOMScope() or the split context.
   * If not provided, hotkeys will be registered to 'global' scope.
   */
  scopeId?: string;
  /** Hotkey bindings (defaults to defaultHotkeyBindings) */
  bindings?: HotkeyBinding[];
  /**
   * @deprecated Use scopeId instead. This is ignored when scopeId is provided.
   */
  scoped?: boolean;
  /**
   * @deprecated Use scopeId instead. This is ignored when scopeId is provided.
   */
  isInScope?: () => boolean;
};

// ============================================================================
// Default Hotkey Bindings
// ============================================================================

export const defaultHotkeyBindings: HotkeyBinding[] = [
  // Navigation
  {
    key: 'j',
    command: ListCommands.NAVIGATE_DOWN,
    description: 'Move down',
    preventDefault: true,
  },
  {
    key: 'ArrowDown',
    command: ListCommands.NAVIGATE_DOWN,
    description: 'Move down',
  },
  {
    key: 'k',
    command: ListCommands.NAVIGATE_UP,
    description: 'Move up',
    preventDefault: true,
  },
  {
    key: 'ArrowUp',
    command: ListCommands.NAVIGATE_UP,
    description: 'Move up',
  },
  {
    key: 'g',
    command: ListCommands.NAVIGATE_START,
    description: 'Go to start',
    preventDefault: true,
  },
  {
    key: 'Home',
    command: ListCommands.NAVIGATE_START,
    description: 'Go to start',
  },
  {
    key: 'G',
    modifiers: { shift: true },
    command: ListCommands.NAVIGATE_END,
    description: 'Go to end',
    preventDefault: true,
  },
  {
    key: 'End',
    command: ListCommands.NAVIGATE_END,
    description: 'Go to end',
  },
  {
    key: 'PageUp',
    command: ListCommands.NAVIGATE_PAGE_UP,
    description: 'Page up',
  },
  {
    key: 'PageDown',
    command: ListCommands.NAVIGATE_PAGE_DOWN,
    description: 'Page down',
  },

  // Selection
  {
    key: 'x',
    command: ListCommands.SELECT_FOCUSED,
    description: 'Toggle selection',
    preventDefault: true,
  },
  {
    key: 'a',
    modifiers: { meta: true },
    command: ListCommands.SELECT_ALL,
    description: 'Select all',
    preventDefault: true,
  },
  {
    key: 'Escape',
    command: ListCommands.CLEAR_SELECTION,
    description: 'Clear selection',
  },

  // Selection with navigation (Shift+j/k)
  {
    key: 'J',
    modifiers: { shift: true },
    command: ListCommands.EXTEND_SELECTION_DOWN,
    description: 'Extend selection down',
    preventDefault: true,
  },
  {
    key: 'K',
    modifiers: { shift: true },
    command: ListCommands.EXTEND_SELECTION_UP,
    description: 'Extend selection up',
    preventDefault: true,
  },

  // Actions
  {
    key: 'Enter',
    command: ListCommands.OPEN_ENTITY,
    description: 'Open entity',
  },
  {
    key: ' ',
    command: ListCommands.TOGGLE_PREVIEW,
    description: 'Toggle preview',
    preventDefault: true,
  },
  {
    key: 'e',
    command: ListCommands.MARK_DONE,
    description: 'Mark as done',
    preventDefault: true,
  },
  {
    key: 'Delete',
    command: ListCommands.DELETE_SELECTED,
    description: 'Delete selected',
  },
  {
    key: 'Backspace',
    command: ListCommands.DELETE_SELECTED,
    description: 'Delete selected',
  },

  // Search
  {
    key: '/',
    command: ListCommands.FOCUS_SEARCH,
    description: 'Focus search',
    preventDefault: true,
  },
];

// ============================================================================
// Hotkey Plugin Factory
// ============================================================================

/**
 * Convert a HotkeyBinding to the hotkey string format used by registerHotkey.
 * e.g., { key: 'j', modifiers: { shift: true } } -> 'shift+j'
 */
function bindingToHotkeyString(binding: HotkeyBinding): string {
  const parts: string[] = [];
  const mods = binding.modifiers ?? {};

  // Modifiers must be in order: ctrl, opt, shift, cmd
  if (mods.ctrl) parts.push('ctrl');
  if (mods.alt) parts.push('opt');
  if (mods.shift) parts.push('shift');
  if (mods.meta) parts.push('cmd');

  // Normalize key names to match registerHotkey expectations
  let key = binding.key.toLowerCase();
  if (key === 'arrowup') key = 'up';
  if (key === 'arrowdown') key = 'down';
  if (key === 'arrowleft') key = 'left';
  if (key === 'arrowright') key = 'right';
  if (key === ' ') key = 'space';
  if (key === 'escape') key = 'escape';

  parts.push(key);
  return parts.join('+');
}

/** Create a hotkey plugin */
export function createHotkeyPlugin<T extends { id: string }>(
  config: HotkeyPluginConfig = {}
): Plugin<T, ListController<T>> {
  const { scopeId, bindings = defaultHotkeyBindings } = config;

  return (controller: ListController<T>): CleanupFn => {
    const disposers: Array<() => void> = [];

    // If no scopeId provided, fall back to legacy behavior with document listener
    if (!scopeId) {
      // Legacy fallback: use document event listener (not recommended)
      const handleKeyDown = (event: KeyboardEvent): void => {
        // Check if focus is within the list container
        const container = controller.containerRef();
        if (!container) return;

        const activeElement = document.activeElement;
        if (!activeElement) return;

        // Don't capture in inputs/textareas
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') return;

        if (!container.contains(activeElement)) return;

        for (const binding of bindings) {
          // Check key
          if (event.key.toLowerCase() !== binding.key.toLowerCase()) continue;

          // Check modifiers
          const mods = binding.modifiers ?? {};
          if (Boolean(mods.shift) !== event.shiftKey) continue;
          if (Boolean(mods.ctrl) !== event.ctrlKey) continue;
          if (Boolean(mods.meta) !== event.metaKey) continue;
          if (Boolean(mods.alt) !== event.altKey) continue;

          const handled = controller.commands.dispatch(
            binding.command,
            binding.payload
          );

          if (handled && binding.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      disposers.push(() =>
        document.removeEventListener('keydown', handleKeyDown)
      );
    } else {
      // Use the existing registerHotkey system (recommended)
      for (const binding of bindings) {
        const hotkeyString = bindingToHotkeyString(binding) as ValidHotkey;

        const { dispose } = registerHotkey({
          scopeId,
          hotkey: hotkeyString,
          description: binding.description ?? binding.command,
          keyDownHandler: () => {
            return controller.commands.dispatch(
              binding.command,
              binding.payload
            );
          },
          // Don't run when input is focused (already handled by hotkey system)
          runWithInputFocused: false,
          // Use 'add' to not override existing hotkeys
          registrationType: 'add',
        });

        disposers.push(dispose);
      }
    }

    // Cleanup
    onCleanup(() => {
      disposers.forEach((dispose) => dispose());
    });

    return () => {
      disposers.forEach((dispose) => dispose());
    };
  };
}

// ============================================================================
// Hotkey Utilities
// ============================================================================

/** Create a hotkey binding */
export function createHotkey(
  key: string,
  command: string,
  options: Partial<HotkeyBinding> = {}
): HotkeyBinding {
  return {
    key,
    command,
    ...options,
  };
}

/** Format hotkey for display */
export function formatHotkey(binding: HotkeyBinding): string {
  const parts: string[] = [];
  const mods = binding.modifiers ?? {};

  if (mods.meta) parts.push('⌘');
  if (mods.ctrl) parts.push('Ctrl');
  if (mods.alt) parts.push('Alt');
  if (mods.shift) parts.push('⇧');

  // Format key name
  let keyName = binding.key;
  if (keyName === ' ') keyName = 'Space';
  if (keyName === 'ArrowUp') keyName = '↑';
  if (keyName === 'ArrowDown') keyName = '↓';
  if (keyName === 'ArrowLeft') keyName = '←';
  if (keyName === 'ArrowRight') keyName = '→';
  if (keyName === 'Enter') keyName = '↵';
  if (keyName === 'Escape') keyName = 'Esc';

  parts.push(keyName);

  return parts.join('+');
}

/** Get all hotkey bindings with descriptions */
export function getHotkeyHelp(
  bindings: HotkeyBinding[]
): Array<{ key: string; description: string }> {
  return bindings
    .filter((b) => b.description)
    .map((b) => ({
      key: formatHotkey(b),
      description: b.description!,
    }));
}
