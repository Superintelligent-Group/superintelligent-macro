import {
  createSignal,
  createEffect,
  onCleanup,
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
} from '@floating-ui/dom';
import type { TourStep } from './types';

interface TourTooltipProps {
  step: TourStep;
  scopeContainer?: HTMLElement;
}

export function TourTooltip(props: TourTooltipProps) {
  const [tooltipRef, setTooltipRef] = createSignal<HTMLDivElement>();
  const [arrowRef, setArrowRef] = createSignal<HTMLDivElement>();
  const [tooltipStyle, setTooltipStyle] = createSignal<JSX.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = createSignal<JSX.CSSProperties>({});

  createEffect(() => {
    const tooltip = tooltipRef();
    const arrowElement = arrowRef();
    if (!tooltip || !props.step.target || !arrowElement) return;

    let cleanup: (() => void) | undefined;
    let pollInterval: number | undefined;

    const setupPositioning = () => {
      const selector = `[data-tour-target="${props.step.target}"]`;
      let targetElement: Element | null = null;

      // Try scoped query first, then fall back to document for portal targets
      if (props.scopeContainer) {
        targetElement = props.scopeContainer.querySelector(selector);
        if (!targetElement) {
          targetElement = document.querySelector(selector);
        }
      } else {
        targetElement = document.querySelector(selector);
      }

      if (!targetElement) return false;

      cleanup = autoUpdate(
        targetElement as HTMLElement,
        tooltip,
        async () => {
          const { x, y, placement, middlewareData } = await computePosition(
            targetElement as HTMLElement,
            tooltip,
            {
              placement: props.step.position || 'bottom',
              middleware: [
                offset(16),
                flip(),
                shift({ padding: 8 }),
                arrow({ element: arrowElement as HTMLElement }),
              ],
            }
          );

          setTooltipStyle({
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
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
        class="fixed z-[10000] max-w-[320px] bg-panel border border-edge rounded-lg p-4 shadow-lg"
        style={tooltipStyle()}
      >
        <div
          ref={setArrowRef}
          class="absolute w-2 h-2 bg-panel border-edge rotate-45"
          style={arrowStyle()}
        />
        <div class="relative z-10">
          <h3 class="text-base font-semibold mb-2">{props.step.title}</h3>
          <p class="text-sm text-ink-muted">{props.step.description}</p>
        </div>
      </div>
    </Show>
  );
}
