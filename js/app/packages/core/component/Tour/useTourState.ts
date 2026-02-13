import { createSignal, createEffect, onCleanup } from 'solid-js';
import { useSubscribeToKeypress } from '@app/signal/hotkeyRoot';
import type { ValidHotkey } from '@core/hotkey/types';
import type { TourConfig } from './types';
import { resolveTourTargetElement } from './anchors';
import { useTourStorage } from './useTourStorage';
import { matchesActionKey } from './matchesActionKey';

export function useTourState(
  config: TourConfig,
  onComplete: () => void,
  scopeContainer?: HTMLElement
) {
  const { getTourProgress, setTourProgress, clearTourProgress } =
    useTourStorage();

  const getInitialStepIndex = () => {
    const stored = getTourProgress(config.id);
    if (stored == null) return 0;
    const clamped = Math.max(0, Math.min(stored, config.steps.length - 1));
    return Number.isFinite(clamped) ? clamped : 0;
  };

  const [currentStepIndex, setCurrentStepIndex] = createSignal(
    getInitialStepIndex()
  );
  const [actionWaiting, setActionWaiting] = createSignal(false);

  const currentStep = () => config.steps[currentStepIndex()];
  const isLastStep = () => currentStepIndex() === config.steps.length - 1;

  createEffect(() => {
    const step = currentStep();
    step.onStepStart?.();
    step.onEnter?.();
    onCleanup(() => {
      step.onStepExit?.();
    });
  });

  useSubscribeToKeypress((context) => {
    if (context.eventType !== 'keydown' || context.event.repeat) return;
    const step = currentStep();
    if (step.action.type !== 'await-keypress') return;
    if (matchesActionKey(context.pressedKeysString, step.action.key)) {
      advanceToNextStep();
    }
  });

  createEffect(() => {
    setTourProgress(config.id, currentStepIndex());
  });

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

    if (action.type === 'await-anchor') {
      const interval = setInterval(() => {
        if (resolveTourTargetElement(action.targetId, scopeContainer)) {
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
    currentStep().onStepComplete?.();
    if (isLastStep()) {
      clearTourProgress(config.id);
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
