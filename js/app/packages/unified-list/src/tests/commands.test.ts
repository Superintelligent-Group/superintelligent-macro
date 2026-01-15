/**
 * Tests for command system.
 */

import { describe, it, expect, vi } from 'vitest';
import { createCommandSystem } from '../core/commands';
import { CommandPriority } from '../types';

describe('Command System', () => {
  describe('createCommandSystem', () => {
    it('creates a command system', () => {
      const commands = createCommandSystem();

      expect(commands.register).toBeInstanceOf(Function);
      expect(commands.dispatch).toBeInstanceOf(Function);
      expect(commands.canDispatch).toBeInstanceOf(Function);
    });
  });

  describe('register', () => {
    it('registers a command handler', () => {
      const commands = createCommandSystem();
      const handler = vi.fn(() => true);

      commands.register('test-command', handler);

      expect(commands.canDispatch('test-command')).toBe(true);
    });

    it('returns cleanup function', () => {
      const commands = createCommandSystem();
      const handler = vi.fn(() => true);

      const cleanup = commands.register('test-command', handler);

      expect(commands.canDispatch('test-command')).toBe(true);

      cleanup();

      expect(commands.canDispatch('test-command')).toBe(false);
    });
  });

  describe('dispatch', () => {
    it('dispatches to registered handler', () => {
      const commands = createCommandSystem();
      const handler = vi.fn(() => true);

      commands.register('test-command', handler);
      const result = commands.dispatch('test-command', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      expect(result).toBe(true);
    });

    it('returns false for unregistered commands', () => {
      const commands = createCommandSystem();

      const result = commands.dispatch('unknown-command', null);

      expect(result).toBe(false);
    });

    it('executes handlers in priority order', () => {
      const commands = createCommandSystem();
      const order: number[] = [];

      commands.register(
        'test-command',
        () => {
          order.push(3);
          return false;
        },
        CommandPriority.LOW
      );

      commands.register(
        'test-command',
        () => {
          order.push(1);
          return false;
        },
        CommandPriority.CRITICAL
      );

      commands.register(
        'test-command',
        () => {
          order.push(2);
          return false;
        },
        CommandPriority.NORMAL
      );

      commands.dispatch('test-command', null);

      expect(order).toEqual([1, 2, 3]);
    });

    it('stops at first handler that returns true', () => {
      const commands = createCommandSystem();
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);

      commands.register('test-command', handler1, CommandPriority.HIGH);
      commands.register('test-command', handler2, CommandPriority.LOW);

      commands.dispatch('test-command', null);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('continues to next handler if current returns false', () => {
      const commands = createCommandSystem();
      const handler1 = vi.fn(() => false);
      const handler2 = vi.fn(() => true);

      commands.register('test-command', handler1, CommandPriority.HIGH);
      commands.register('test-command', handler2, CommandPriority.LOW);

      commands.dispatch('test-command', null);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('canDispatch', () => {
    it('returns true when command has handlers', () => {
      const commands = createCommandSystem();
      commands.register('test-command', () => true);

      expect(commands.canDispatch('test-command')).toBe(true);
    });

    it('returns false when command has no handlers', () => {
      const commands = createCommandSystem();

      expect(commands.canDispatch('unknown-command')).toBe(false);
    });

    it('returns false after all handlers are cleaned up', () => {
      const commands = createCommandSystem();
      const cleanup1 = commands.register('test-command', () => true);
      const cleanup2 = commands.register('test-command', () => true);

      expect(commands.canDispatch('test-command')).toBe(true);

      cleanup1();
      expect(commands.canDispatch('test-command')).toBe(true);

      cleanup2();
      expect(commands.canDispatch('test-command')).toBe(false);
    });
  });
});
