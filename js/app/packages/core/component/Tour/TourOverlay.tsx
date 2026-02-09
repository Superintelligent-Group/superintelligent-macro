import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import type { TourStep } from './types';

interface TourOverlayProps {
  step: TourStep;
  scopeContainer?: HTMLElement;
}

export function TourOverlay(props: TourOverlayProps) {
  const [targetRect, setTargetRect] = createSignal<DOMRect | null>(null);

  createEffect(() => {
    if (props.step.type === 'anchored' && props.step.target) {
      let observer: ResizeObserver | undefined;
      let mutationObserver: MutationObserver | undefined;
      let observedElement: Element | null = null;
      let mutationObserverActive = false;

      const observeElement = (element: Element) => {
        if (!observer || !mutationObserver) return;

        if (observedElement !== element) {
          if (observedElement) observer.unobserve(observedElement);
          observer.observe(element);
          observedElement = element;
        }

        if (!mutationObserverActive) {
          mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
          });
          mutationObserverActive = true;
        }
      };

      const updateTargetRect = () => {
        const selector = `[data-tour-target="${props.step.target}"]`;
        let element: Element | null = null;

        // Try scoped query first, then fall back to document for portal targets
        if (props.scopeContainer) {
          element = props.scopeContainer.querySelector(selector);
          if (!element) {
            element = document.querySelector(selector);
          }
        } else {
          element = document.querySelector(selector);
        }

        if (element) {
          observeElement(element);
          setTargetRect(element.getBoundingClientRect());
          return true;
        } else {
          setTargetRect(null); // Clear previous rect when target is missing
          return false;
        }
      };

      observer = new ResizeObserver(updateTargetRect);
      mutationObserver = new MutationObserver(updateTargetRect);

      // Initial attempt
      const found = updateTargetRect();

      // If target not found, poll indefinitely for it to appear
      let pollInterval: number | undefined;
      if (!found) {
        pollInterval = window.setInterval(() => {
          if (updateTargetRect()) {
            clearInterval(pollInterval);
          }
        }, 100);
      }

      // Update on resize/scroll
      window.addEventListener('resize', updateTargetRect);
      window.addEventListener('scroll', updateTargetRect, true);

      onCleanup(() => {
        if (pollInterval) clearInterval(pollInterval);
        if (observedElement) observer?.unobserve(observedElement);
        observer?.disconnect();
        mutationObserver?.disconnect();
        window.removeEventListener('resize', updateTargetRect);
        window.removeEventListener('scroll', updateTargetRect, true);
      });
    } else {
      setTargetRect(null);
    }
  });

  return (
    <div class="fixed inset-0 z-[9999] pointer-events-none">
      {/* Semi-transparent backdrop */}
      <svg class="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <Show when={targetRect()}>
              {(rect) => (
                <rect
                  x={rect().x - 8}
                  y={rect().y - 8}
                  width={rect().width + 16}
                  height={rect().height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </Show>
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Highlight border around target */}
      <Show when={targetRect()}>
        {(rect) => (
          <div
            class="absolute border-2 border-accent rounded-lg pointer-events-none animate-pulse"
            style={{
              left: `${rect().x - 8}px`,
              top: `${rect().y - 8}px`,
              width: `${rect().width + 16}px`,
              height: `${rect().height + 16}px`,
            }}
          />
        )}
      </Show>
    </div>
  );
}
