import { createSignal, createEffect, onCleanup } from 'solid-js';
import { IS_MAC } from '@core/constant/isMac';
import {
  EVENT_MODIFIER_NAME_MAP,
  EVENT_TO_HOTKEY_NAME_MAP,
  MODIFIER_LIST_MAC,
  MODIFIER_LIST_NON_MAC,
} from '@core/hotkey/constants';
import { getKeyString, normalizeEventKeyPress } from '@core/hotkey/utils';
import type { TourConfig } from './types';
import { resolveTourAnchor } from './anchors';

export function useTourState(
  config: TourConfig,
  onComplete: () => void,
  scopeContainer?: HTMLElement
) {
  const [currentStepIndex, setCurrentStepIndex] = createSignal(0);
  const [actionWaiting, setActionWaiting] = createSignal(false);

  const currentStep = () => config.steps[currentStepIndex()];
  const isLastStep = () => currentStepIndex() === config.steps.length - 1;

  // Helper to query elements within scope, with fallback to document for portals
  const queryScopedElement = (selector: string): Element | null => {
    if (scopeContainer) {
      // Try scoped query first
      const element = scopeContainer.querySelector(selector);
      if (element) return element;
      // Fall back to document-level query for portal targets
      return document.querySelector(selector);
    }
    return document.querySelector(selector);
  };

  // Handle action-based progression
  createEffect(() => {
    const step = currentStep();
    const action = step.action;

    if (action.type === 'click-next') {
      setActionWaiting(false);
      return;
    }

    setActionWaiting(true);

    if (action.type === 'await-keypress') {
      const matchesHotkey = (event: KeyboardEvent, hotkey: string) => {
        const key = normalizeEventKeyPress(event);
        if (key === 'dead') return false;

        const pressed = new Set<string>();
        if (key) pressed.add(key);

        const modifierList = IS_MAC ? MODIFIER_LIST_MAC : MODIFIER_LIST_NON_MAC;
        modifierList.forEach((mod) => {
          if (event[mod]) {
            const modName = EVENT_MODIFIER_NAME_MAP[mod];
            const mapped = EVENT_TO_HOTKEY_NAME_MAP[modName];
            if (mapped) pressed.add(mapped);
          }
        });

        if (getKeyString(pressed) === hotkey) return true;

        const parts = hotkey.split('+');
        const targetKey = parts.at(-1);
        if (!targetKey || key !== targetKey) return false;

        const required = new Set(parts.slice(0, -1));
        // On non-Mac, treat cmd as an alias for ctrl so cmd+<key> tours can advance.
        if (!IS_MAC && required.has('cmd') && !required.has('ctrl')) {
          required.delete('cmd');
          required.add('ctrl');
        }
        const hasCmd = IS_MAC ? event.metaKey : event.ctrlKey;
        const hasCtrl = event.ctrlKey;
        const hasOpt = event.altKey;
        const hasShift = event.shiftKey;

        if (required.has('cmd') !== hasCmd) return false;
        if (required.has('ctrl') !== hasCtrl) return false;
        if (required.has('opt') !== hasOpt) return false;
        if (required.has('shift') !== hasShift) return false;
        if (!required.has('cmd') && hasCmd) return false;
        if (!required.has('ctrl') && hasCtrl) return false;
        if (!required.has('opt') && hasOpt) return false;
        if (!required.has('shift') && hasShift) return false;

        return true;
      };

      const handler = (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (matchesHotkey(event, action.key)) {
          advanceToNextStep();
        }
      };
      document.addEventListener('keydown', handler, { capture: true });
      onCleanup(() =>
        document.removeEventListener('keydown', handler, { capture: true })
      );
    } else if (action.type === 'await-anchor') {
      const interval = setInterval(() => {
        if (resolveTourAnchor(action.targetId, scopeContainer)) {
          clearInterval(interval);
          advanceToNextStep();
        }
      }, 100);
      onCleanup(() => clearInterval(interval));
    } else if (action.type === 'await-element') {
      const interval = setInterval(() => {
        if (queryScopedElement(action.selector)) {
          clearInterval(interval);
          advanceToNextStep();
        }
      }, 100);
      onCleanup(() => clearInterval(interval));
    } else if (action.type === 'await-signal') {
      const interval = setInterval(() => {
        if (action.check()) {
          clearInterval(interval);
          advanceToNextStep();
        }
      }, 100);
      onCleanup(() => clearInterval(interval));
    }
  });

  const advanceToNextStep = () => {
    if (isLastStep()) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex() > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const goToNextStep = () => {
    advanceToNextStep();
  };

  return {
    currentStep,
    currentStepIndex,
    isLastStep,
    actionWaiting,
    advanceToNextStep,
    goToPreviousStep,
    goToNextStep,
  };
}
