import { Show, For, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Button } from '@ui/components/Button';
import { registerHotkey } from '@core/hotkey/hotkeys';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import { TourCenteredCard } from './TourCenteredCard';
import { useTourState } from './useTourState';
import type { TourProps } from './types';

export function Tour(props: TourProps) {
  const state = useTourState(props.config, props.onComplete, props.scopeContainer);

  // Register Escape key to skip tour
  createEffect(() => {
    const { dispose } = registerHotkey({
      scopeId: 'global',
      hotkey: 'escape',
      description: 'Skip tour',
      registrationType: 'add', // Don't override existing escape handlers
      keyDownHandler: () => {
        props.onSkip();
        return true; // Consume the event to skip tour
      },
    });
    onCleanup(dispose);
  });

  const handleNext = () => {
    // advanceToNextStep now handles calling onComplete when on last step
    state.advanceToNextStep();
  };

  return (
    <Portal>
      <TourOverlay step={state.currentStep()} scopeContainer={props.scopeContainer} />

      <Show
        when={state.currentStep().type === 'anchored'}
        fallback={
          <TourCenteredCard
            step={state.currentStep()}
            onNext={handleNext}
            onSkip={props.onSkip}
            isWaitingForAction={state.actionWaiting()}
          />
        }
      >
        <TourTooltip step={state.currentStep()} scopeContainer={props.scopeContainer} />
      </Show>

      {/* Navigation UI for anchored steps */}
      <Show when={state.currentStep().type === 'anchored'}>
        <div class="fixed bottom-8 right-8 z-[10000] flex gap-2">
          <Button variant="secondary" onClick={props.onSkip}>
            Skip Tour
          </Button>
          <Show when={!state.actionWaiting()}>
            <Button variant="primary" onClick={handleNext}>
              {state.isLastStep() ? 'Finish' : 'Next'}
            </Button>
          </Show>
        </div>
      </Show>

      {/* Step indicator dots */}
      <div class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000] flex gap-2">
        <For each={props.config.steps}>
          {(_, index) => (
            <div
              class={`h-2 w-2 rounded-full transition-colors ${
                index() === state.currentStepIndex() ? 'bg-accent' : 'bg-edge-muted'
              }`}
            />
          )}
        </For>
      </div>
    </Portal>
  );
}
