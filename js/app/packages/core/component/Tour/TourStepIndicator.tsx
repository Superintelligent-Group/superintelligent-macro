import { For } from 'solid-js';

interface TourStepIndicatorProps {
  stepIndex: number;
  totalSteps: number;
  class?: string;
}

export function TourStepIndicator(props: TourStepIndicatorProps) {
  return (
    <div class={props.class ?? 'flex items-center gap-1.5'}>
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
  );
}
