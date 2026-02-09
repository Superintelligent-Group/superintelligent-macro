import { createSignal, createEffect, onCleanup } from 'solid-js';
import { registerHotkey } from '@core/hotkey/hotkeys';
import type { TourConfig } from './types';

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
      const { dispose } = registerHotkey({
        scopeId: 'global',
        hotkey: action.key,
        description: `Tour: wait for ${action.key}`,
        registrationType: 'add', // Don't override existing handlers
        runWithInputFocused: true,
        keyDownHandler: () => {
          advanceToNextStep();
          return false; // Allow propagation to existing handlers
        },
      });
      onCleanup(dispose);
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

  return {
    currentStep,
    currentStepIndex,
    isLastStep,
    actionWaiting,
    advanceToNextStep,
    goToPreviousStep,
  };
}
