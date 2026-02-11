import {
  createSignal,
  createEffect,
  onCleanup,
  createMemo,
  For,
  Show,
  type JSX,
} from 'solid-js';
import {
  computePosition,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  size,
} from '@floating-ui/dom';
import { Button } from '@ui/components/Button';
import type { TourStep } from './types';
import { anchorVersion, resolveTourAnchor } from './anchors';

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  scopeContainer?: HTMLElement;
  onNext: () => void;
  isWaitingForAction: boolean;
  isLastStep: boolean;
}

export function TourTooltip(props: TourTooltipProps) {
  const [tooltipRef, setTooltipRef] = createSignal<HTMLDivElement>();
  const [arrowRef, setArrowRef] = createSignal<HTMLDivElement>();
  const [tooltipStyle, setTooltipStyle] = createSignal<JSX.CSSProperties>({});
  const [tooltipSizeStyle, setTooltipSizeStyle] =
    createSignal<JSX.CSSProperties>({});
  const mergedTooltipStyle = createMemo(() => ({
    ...tooltipStyle(),
    ...tooltipSizeStyle(),
  }));

  const actionPrompt = createMemo(() => {
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
  });

  const steps = createMemo(() =>
    Array.from({ length: props.totalSteps }, (_, i) => i)
  );
  const [arrowStyle, setArrowStyle] = createSignal<JSX.CSSProperties>({});

  createEffect(() => {
    const tooltip = tooltipRef();
    const arrowElement = arrowRef();
    if (!tooltip || !props.step.target || !arrowElement) return;

    anchorVersion();
    let cleanup: (() => void) | undefined;
    let pollInterval: number | undefined;

    const setupPositioning = () => {
      let targetElement = resolveTourAnchor(
        props.step.target!,
        props.scopeContainer
      );

      if (!targetElement) {
        const selector = `[data-tour-target="${props.step.target}"]`;
        if (props.scopeContainer) {
          targetElement = props.scopeContainer.querySelector(selector) ?? undefined;
        }
        targetElement = targetElement ?? document.querySelector(selector) ?? undefined;
      }

      if (!targetElement) {
        setTooltipStyle((prev) => ({
          ...prev,
          visibility: 'hidden',
        }));
        return false;
      }

      cleanup = autoUpdate(
        targetElement as HTMLElement,
        tooltip,
        async () => {
          const { x, y, placement, middlewareData } = await computePosition(
            targetElement as HTMLElement,
            tooltip,
            {
              strategy: 'fixed',
              placement: props.step.position || 'bottom',
              middleware: [
                offset(16),
                flip(),
                shift({ padding: 8 }),
                arrow({ element: arrowElement as HTMLElement }),
                size({
                  padding: 8,
                  apply({ availableWidth, availableHeight }) {
                    const maxWidth = Math.max(
                      200,
                      Math.min(320, availableWidth)
                    );
                    const maxHeight = Math.max(160, availableHeight);
                    setTooltipSizeStyle({
                      maxWidth: `${maxWidth}px`,
                      maxHeight: `${maxHeight}px`,
                      overflow: 'auto',
                    });
                  },
                }),
              ],
            }
          );

          const padding = 8;
          const tooltipWidth = tooltip.offsetWidth;
          const tooltipHeight = tooltip.offsetHeight;
          const maxX = Math.max(
            padding,
            window.innerWidth - tooltipWidth - padding
          );
          const maxY = Math.max(
            padding,
            window.innerHeight - tooltipHeight - padding
          );
          const clampedX = Math.min(Math.max(x, padding), maxX);
          const clampedY = Math.min(Math.max(y, padding), maxY);

          setTooltipStyle({
            position: 'fixed',
            left: `${clampedX}px`,
            top: `${clampedY}px`,
            visibility: 'visible',
          });

          // Arrow positioning
          if (middlewareData.arrow && arrowElement) {
            const { x: arrowX, y: arrowY } = middlewareData.arrow;
            const staticSide = {
              top: 'bottom',
              right: 'left',
              bottom: 'top',
              left: 'right',
            }[placement.split('-')[0]];

            setArrowStyle({
              left: arrowX != null ? `${arrowX}px` : '',
              top: arrowY != null ? `${arrowY}px` : '',
              right: '',
              bottom: '',
              [staticSide as string]: '-4px',
            });
          }
        }
      );
      return true;
    };

    // Initial attempt
    const found = setupPositioning();

    // If target not found, poll indefinitely for it to appear
    if (!found) {
      pollInterval = window.setInterval(() => {
        if (setupPositioning()) {
          clearInterval(pollInterval);
        }
      }, 100);
    }

    onCleanup(() => {
      if (pollInterval) clearInterval(pollInterval);
      if (cleanup) cleanup();
    });
  });

  return (
    <Show when={props.step.target}>
        <div
          ref={setTooltipRef}
          class="fixed z-[10000] max-w-[320px] bg-panel border border-edge rounded-lg p-4 shadow-lg transition-[left,top,opacity] duration-200 ease-out"
          style={mergedTooltipStyle()}
        >
        <div
          ref={setArrowRef}
          class="absolute w-2 h-2 bg-panel border-edge rotate-45"
          style={arrowStyle()}
        />
        <div class="relative z-10">
          <h3 class="text-base font-semibold mb-2">{props.step.title}</h3>
          <p class="text-sm text-ink-muted">{props.step.description}</p>
          <Show when={props.step.hint}>
            <div class="mt-2 text-xs text-ink-muted">{props.step.hint}</div>
          </Show>
        </div>
        <div class="mt-3 flex items-center gap-1.5">
          <For each={steps()}>
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
        <div class="mt-4">
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
    </Show>
  );
}
