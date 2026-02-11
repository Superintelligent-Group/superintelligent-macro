import { For, Show } from 'solid-js';
import { Button } from '@ui/components/Button';
import type { TourStep } from './types';

interface TourCenteredCardProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  isWaitingForAction: boolean;
}

export function TourCenteredCard(props: TourCenteredCardProps) {
  const actionPrompt = () => {
    if (props.step.hint) return props.step.hint;
    const action = props.step.action;
    if (action.type === 'await-keypress') {
      const key = action.key;
      const pretty = key
        .split('+')
        .map((part) => {
          if (part === 'space') return 'Space';
          if (part === 'enter') return 'Enter';
          if (part === 'cmd') return '⌘';
          if (part === 'ctrl') return 'Ctrl';
          if (part === 'opt') return 'Opt';
          if (part === 'shift') return 'Shift';
          return part.length === 1 ? part.toUpperCase() : part;
        })
        .join(' + ');
      return `Press ${pretty}`;
    }
    if (action.type === 'await-element') {
      return 'Open the next panel to continue';
    }
    if (action.type === 'await-anchor') {
      return 'Open the next panel to continue';
    }
    if (action.type === 'await-signal') {
      return 'Complete the action to continue';
    }
    return 'Press Enter to continue';
  };

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
        <div class="mb-4 flex items-center gap-1.5">
          <For each={Array.from({ length: props.totalSteps }, (_, i) => i)}>
            {(index) => (
              <div
                class={`h-1.5 rounded-full transition-colors ${
                  index === props.stepIndex
                    ? 'bg-accent w-8'
                    : 'bg-edge-muted w-2.5'
                }`}
              />
            )}
          </For>
        </div>

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
              Next
              <span class="ml-2 text-xs text-ink-muted">Enter</span>
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
