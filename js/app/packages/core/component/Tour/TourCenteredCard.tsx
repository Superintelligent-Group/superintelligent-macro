import { Show } from 'solid-js';
import { Button } from '@ui/components/Button';
import type { TourStep } from './types';
import { getActionPrompt } from './actionUtils';
import { TourStepIndicator } from './TourStepIndicator';

interface TourCenteredCardProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  isWaitingForAction: boolean;
  isLastStep: boolean;
}

export function TourCenteredCard(props: TourCenteredCardProps) {
  const actionPrompt = () => getActionPrompt(props.step);

  const containerClass = props.step.position?.startsWith('bottom')
    ? 'fixed inset-0 z-[10000] flex items-end justify-center pointer-events-none pb-8'
    : 'fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none';

  return (
    <div class={containerClass}>
      <div class="bg-panel border border-edge rounded-lg p-6 shadow-2xl max-w-[480px] pointer-events-auto">
        <h2 class="text-xl font-semibold mb-3">{props.step.title}</h2>
        <p class="text-sm text-ink-muted mb-2">{props.step.description}</p>
        <Show when={props.step.hint}>
          <div class="mb-4 text-xs text-ink-muted">{props.step.hint}</div>
        </Show>
        <TourStepIndicator
          stepIndex={props.stepIndex}
          totalSteps={props.totalSteps}
          class="mb-4 flex items-center gap-1.5"
        />

        <Show
          when={!props.isWaitingForAction}
          fallback={
            <div class="flex items-center justify-between gap-4 text-sm text-ink-muted">
              <div class="animate-pulse">{actionPrompt()}</div>
            </div>
          }
        >
          <div class="flex justify-end gap-2">
            <Button variant="primary" onClick={props.onNext}>
              {props.isLastStep ? 'Finish' : 'Next'}
              <span class="ml-2 text-xs text-ink-muted">Enter</span>
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
