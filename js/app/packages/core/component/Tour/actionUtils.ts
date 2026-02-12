import { prettyPrintHotkeyString } from '@core/hotkey/utils';
import type { ValidHotkey } from '@core/hotkey/types';
import type { TourAction, TourStep } from './types';
import { performHotkey } from './performHotkey';

const HOTKEY_LABELS: Record<string, string> = {
  space: 'Space',
  enter: 'Enter',
  esc: 'Esc',
  escape: 'Esc',
  cmd: '⌘',
  ctrl: 'Ctrl',
  opt: 'Opt',
  shift: 'Shift',
};

export function formatHotkeyLabel(hotkey: ValidHotkey): string {
  const pretty = prettyPrintHotkeyString(hotkey);
  const parts = pretty
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .map((part) => {
      const normalized = part.toLowerCase();
      const mapped = HOTKEY_LABELS[normalized];
      if (mapped) return mapped;
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join(' + ');
}

export function getActionPrompt(step: TourStep): string {
  if (step.hint) return step.hint;
  const action = step.action;
  if (action.type === 'await-keypress') {
    return `Press ${formatHotkeyLabel(action.key)}`;
  }
  if (action.type === 'await-element' || action.type === 'await-anchor') {
    return 'Open the next panel to continue';
  }
  if (action.type === 'await-signal') {
    return 'Complete the action to continue';
  }
  return 'Press Enter to continue';
}

export function getActionPerform(
  action: TourAction
): (() => void) | undefined {
  if (action.perform) return action.perform;
  if (action.type === 'await-keypress') {
    return () => performHotkey(action.key);
  }
  return undefined;
}
