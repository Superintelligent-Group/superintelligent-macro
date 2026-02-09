import { Show } from 'solid-js';
import { Button } from '@ui/components/Button';
import type { TourStep } from './types';

interface TourCenteredCardProps {
  step: TourStep;
  onNext: () => void;
  onSkip: () => void;
  isWaitingForAction: boolean;
}

export function TourCenteredCard(props: TourCenteredCardProps) {
  return (
    <div class="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <div class="bg-panel border border-edge rounded-lg p-6 shadow-2xl max-w-[480px] pointer-events-auto">
        <h2 class="text-xl font-semibold mb-3">{props.step.title}</h2>
        <p class="text-sm text-ink-muted mb-6">{props.step.description}</p>

        <Show
          when={!props.isWaitingForAction}
          fallback={
            <div class="flex items-center justify-between gap-4 text-sm text-ink-muted">
              <div class="animate-pulse">Waiting for action...</div>
              <Button variant="secondary" onClick={props.onSkip}>
                Skip Tour
              </Button>
            </div>
          }
        >
          <div class="flex justify-end gap-2">
            <Button variant="secondary" onClick={props.onSkip}>
              Skip Tour
            </Button>
            <Button variant="primary" onClick={props.onNext}>
              Next
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
