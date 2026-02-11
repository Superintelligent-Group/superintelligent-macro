import { createEffect, createSignal, onCleanup } from 'solid-js';
import { activateTour, deactivateTour, isAnyTourActive } from './globalTourState';
import { useTourStorage } from './useTourStorage';

export function useAutoTour(
  tourId: string,
  options: {
    enabled: () => boolean;
    delayMs?: number;
  }
) {
  const { isTourCompleted, markTourCompleted } = useTourStorage();
  const [tourActive, setTourActive] = createSignal(false);

  createEffect(() => {
    if (
      options.enabled() &&
      !isTourCompleted(tourId) &&
      !tourActive() &&
      !isAnyTourActive()
    ) {
      const timeoutId = setTimeout(() => {
        if (activateTour(tourId)) {
          setTourActive(true);
        }
      }, options.delayMs ?? 500);
      onCleanup(() => clearTimeout(timeoutId));
    }
  });

  const handleComplete = () => {
    markTourCompleted(tourId);
    deactivateTour(tourId);
    setTourActive(false);
  };

  const handleSkip = () => {
    markTourCompleted(tourId);
    deactivateTour(tourId);
    setTourActive(false);
  };

  const stopTour = () => {
    deactivateTour(tourId);
    setTourActive(false);
  };

  onCleanup(() => {
    if (tourActive()) {
      deactivateTour(tourId);
    }
  });

  return { tourActive, handleComplete, handleSkip, stopTour };
}
