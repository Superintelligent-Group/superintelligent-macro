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
  const { isTourCompleted, markTourCompleted, clearTourProgress } =
    useTourStorage();
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

  // Default behavior: pause the tour when the relevant UI is no longer eligible.
  createEffect(() => {
    if (!options.enabled() && tourActive()) {
      deactivateTour(tourId);
      setTourActive(false);
    }
  });

  const handleComplete = () => {
    markTourCompleted(tourId);
    clearTourProgress(tourId);
    deactivateTour(tourId);
    setTourActive(false);
  };

  const handleSkip = () => {
    markTourCompleted(tourId);
    clearTourProgress(tourId);
    deactivateTour(tourId);
    setTourActive(false);
  };

  onCleanup(() => {
    if (tourActive()) {
      deactivateTour(tourId);
    }
  });

  return { tourActive, handleComplete, handleSkip };
}
