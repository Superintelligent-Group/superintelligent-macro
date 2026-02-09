import { makePersisted } from '@solid-primitives/storage';
import { createSignal } from 'solid-js';

const STORAGE_KEY = 'tours-completed';

// Persisted signal for completed tour IDs
const [completedTours, setCompletedTours] = makePersisted(
  createSignal<string[]>([]),
  { name: STORAGE_KEY }
);

export function useTourStorage() {
  return {
    isTourCompleted: (tourId: string) => completedTours().includes(tourId),
    markTourCompleted: (tourId: string) => {
      if (!completedTours().includes(tourId)) {
        setCompletedTours([...completedTours(), tourId]);
      }
    },
    resetTour: (tourId: string) => {
      setCompletedTours(completedTours().filter((id) => id !== tourId));
    },
    resetAllTours: () => setCompletedTours([]),
  };
}
