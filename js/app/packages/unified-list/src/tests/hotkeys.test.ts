/**
 * Tests for hotkey plugin.
 *
 * Tests the document event listener fallback behavior since the
 * registerHotkey integration requires the full hotkey system.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createListController } from '../core/controller';
import {
  createHotkeyPlugin,
  defaultHotkeyBindings,
  formatHotkey,
} from '../plugins/hotkeyPlugin';
import { createNavigationPlugin } from '../plugins/navigationPlugin';
import { createSelectionPlugin } from '../plugins/selectionPlugin';
import { ListCommands } from '../core/commands';

// Test entity type
type TestEntity = { id: string; name: string };

const createTestEntities = (count: number): TestEntity[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `entity-${i + 1}`,
    name: `Entity ${i + 1}`,
  }));

describe('Hotkey Plugin', () => {
  let container: HTMLDivElement;
  let cleanup: () => void;

  beforeEach(() => {
    // Create a mock container element
    container = document.createElement('div');
    container.setAttribute('tabindex', '0');
    document.body.appendChild(container);
  });

  afterEach(() => {
    cleanup?.();
    document.body.removeChild(container);
  });

  describe('createHotkeyPlugin (document listener fallback)', () => {
    it('creates a plugin function', () => {
      const plugin = createHotkeyPlugin<TestEntity>();
      expect(plugin).toBeInstanceOf(Function);
    });

    it('registers keyboard event listener on document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: createTestEntities(5),
        });

      // No scopeId = fallback to document listener
      const plugin = createHotkeyPlugin<TestEntity>();
      const pluginCleanup = plugin(controller);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      cleanup = () => {
        pluginCleanup();
        controllerCleanup();
      };

      addEventListenerSpy.mockRestore();
    });

    it('removes event listener on cleanup', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
        });

      const plugin = createHotkeyPlugin<TestEntity>();
      const pluginCleanup = plugin(controller);

      pluginCleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      controllerCleanup();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('keyboard navigation', () => {
    it('dispatches NAVIGATE_DOWN on j key', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-1',
        });

      // Set container ref so hotkey plugin knows where focus is
      controller.setContainerRef(container);

      // Add navigation plugin to handle the commands
      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      // Add hotkey plugin (no scope = document listener)
      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      // Set entities in controller state
      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-1');

      // Focus the container
      container.focus();

      // Simulate 'j' key press
      const event = new KeyboardEvent('keydown', {
        key: 'j',
        bubbles: true,
      });
      container.dispatchEvent(event);

      // Should have navigated down
      expect(controller.state.focusedId()).toBe('entity-2');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });

    it('dispatches NAVIGATE_UP on k key', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-3',
        });

      controller.setContainerRef(container);

      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-3');

      container.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(controller.state.focusedId()).toBe('entity-2');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });

    it('dispatches NAVIGATE_START on g key', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-5',
        });

      controller.setContainerRef(container);

      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-5');

      container.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'g',
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(controller.state.focusedId()).toBe('entity-1');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });

    it('dispatches NAVIGATE_END on Shift+G', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-1',
        });

      controller.setContainerRef(container);

      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-1');

      container.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'G',
        shiftKey: true,
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(controller.state.focusedId()).toBe('entity-5');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });
  });

  describe('selection hotkeys', () => {
    it('dispatches SELECT_FOCUSED on x key', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-2',
        });

      controller.setContainerRef(container);

      const selectionPlugin = createSelectionPlugin<TestEntity>({
        mode: 'multi',
      });
      const selectionCleanup = selectionPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-2');

      container.focus();

      // Should start with no selection
      expect(controller.state.selectedIds().size).toBe(0);

      const event = new KeyboardEvent('keydown', {
        key: 'x',
        bubbles: true,
      });
      container.dispatchEvent(event);

      // Should have selected the focused entity
      expect(controller.state.selectedIds().has('entity-2')).toBe(true);

      cleanup = () => {
        hotkeyCleanup();
        selectionCleanup();
        controllerCleanup();
      };
    });

    it('dispatches CLEAR_SELECTION on Escape', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
        });

      controller.setContainerRef(container);

      const selectionPlugin = createSelectionPlugin<TestEntity>({
        mode: 'multi',
      });
      const selectionCleanup = selectionPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      // Start with some selections
      controller.setters.setSelectedIds(
        new Set(['entity-1', 'entity-2', 'entity-3'])
      );

      container.focus();

      expect(controller.state.selectedIds().size).toBe(3);

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(controller.state.selectedIds().size).toBe(0);

      cleanup = () => {
        hotkeyCleanup();
        selectionCleanup();
        controllerCleanup();
      };
    });
  });

  describe('input focus handling', () => {
    it('ignores hotkeys when input is focused', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-1',
        });

      controller.setContainerRef(container);

      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-1');

      // Create an input inside the container
      const input = document.createElement('input');
      container.appendChild(input);
      input.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'j',
        bubbles: true,
      });
      input.dispatchEvent(event);

      // Should NOT have navigated because input was focused
      expect(controller.state.focusedId()).toBe('entity-1');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });

    it('ignores hotkeys when textarea is focused', () => {
      const entities = createTestEntities(5);
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
          initialEntities: entities,
          initialFocusedId: 'entity-1',
        });

      controller.setContainerRef(container);

      const navPlugin = createNavigationPlugin<TestEntity>();
      const navCleanup = navPlugin(controller);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>();
      const hotkeyCleanup = hotkeyPlugin(controller);

      controller.setters.setEntities(entities);
      controller.setters.setFocusedId('entity-1');

      // Create a textarea inside the container
      const textarea = document.createElement('textarea');
      container.appendChild(textarea);
      textarea.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'j',
        bubbles: true,
      });
      textarea.dispatchEvent(event);

      // Should NOT have navigated because textarea was focused
      expect(controller.state.focusedId()).toBe('entity-1');

      cleanup = () => {
        hotkeyCleanup();
        navCleanup();
        controllerCleanup();
      };
    });
  });

  describe('custom bindings', () => {
    it('accepts custom hotkey bindings', () => {
      const { controller, cleanup: controllerCleanup } =
        createListController<TestEntity>({
          id: 'test-list',
        });

      controller.setContainerRef(container);

      const customHandler = vi.fn(() => true);
      controller.commands.register('custom-command', customHandler);

      const hotkeyPlugin = createHotkeyPlugin<TestEntity>({
        bindings: [
          {
            key: 'q',
            command: 'custom-command',
            description: 'Custom action',
          },
        ],
      });
      const hotkeyCleanup = hotkeyPlugin(controller);

      container.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'q',
        bubbles: true,
      });
      container.dispatchEvent(event);

      expect(customHandler).toHaveBeenCalled();

      cleanup = () => {
        hotkeyCleanup();
        controllerCleanup();
      };
    });
  });

  describe('default bindings', () => {
    it('includes navigation bindings', () => {
      const commands = defaultHotkeyBindings.map((b) => b.command);

      expect(commands).toContain(ListCommands.NAVIGATE_UP);
      expect(commands).toContain(ListCommands.NAVIGATE_DOWN);
      expect(commands).toContain(ListCommands.NAVIGATE_START);
      expect(commands).toContain(ListCommands.NAVIGATE_END);
    });

    it('includes selection bindings', () => {
      const commands = defaultHotkeyBindings.map((b) => b.command);

      expect(commands).toContain(ListCommands.SELECT_FOCUSED);
      expect(commands).toContain(ListCommands.CLEAR_SELECTION);
      expect(commands).toContain(ListCommands.SELECT_ALL);
    });

    it('includes action bindings', () => {
      const commands = defaultHotkeyBindings.map((b) => b.command);

      expect(commands).toContain(ListCommands.OPEN_ENTITY);
      expect(commands).toContain(ListCommands.MARK_DONE);
      expect(commands).toContain(ListCommands.DELETE_SELECTED);
    });
  });

  describe('formatHotkey', () => {
    it('formats simple key', () => {
      expect(formatHotkey({ key: 'j', command: 'test' })).toBe('j');
    });

    it('formats key with shift modifier', () => {
      expect(
        formatHotkey({ key: 'g', command: 'test', modifiers: { shift: true } })
      ).toBe('⇧+g');
    });

    it('formats key with meta modifier', () => {
      expect(
        formatHotkey({ key: 'a', command: 'test', modifiers: { meta: true } })
      ).toBe('⌘+a');
    });

    it('formats special keys', () => {
      expect(formatHotkey({ key: 'ArrowUp', command: 'test' })).toBe('↑');
      expect(formatHotkey({ key: 'ArrowDown', command: 'test' })).toBe('↓');
      expect(formatHotkey({ key: 'Enter', command: 'test' })).toBe('↵');
      expect(formatHotkey({ key: ' ', command: 'test' })).toBe('Space');
    });
  });
});
