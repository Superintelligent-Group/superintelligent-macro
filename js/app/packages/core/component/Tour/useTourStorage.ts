import { makePersisted } from '@solid-primitives/storage';
import { createSignal } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

const STORAGE_KEY = 'tours-completed';
const PROGRESS_KEY = 'tour-progress';

// Persisted signal for completed tour IDs
const [completedTours, setCompletedTours] = makePersisted(
  createSignal<string[]>([]),
  { name: STORAGE_KEY }
);

const [tourProgress, setTourProgressStore] = makePersisted(
  createStore<Record<string, number>>({}),
  {
    name: PROGRESS_KEY,
    storage: localStorage,
  }
);

const removeProgressKey = (tourId: string) => {
  if (!(tourId in tourProgress)) return;
  const next = { ...tourProgress };
  delete next[tourId];
  setTourProgressStore(reconcile(next));
};

export function useTourStorage() {
  const clearTourProgress = (tourId: string) => {
    removeProgressKey(tourId);
  };

  return {
    isTourCompleted: (tourId: string) => completedTours().includes(tourId),
    markTourCompleted: (tourId: string) => {
      if (!completedTours().includes(tourId)) {
        setCompletedTours([...completedTours(), tourId]);
      }
      clearTourProgress(tourId);
    },
    resetTour: (tourId: string) => {
      setCompletedTours(completedTours().filter((id) => id !== tourId));
      clearTourProgress(tourId);
    },
    resetAllTours: () => {
      setCompletedTours([]);
      setTourProgressStore(reconcile({}));
    },
    getTourProgress: (tourId: string) => {
      const value = tourProgress[tourId];
      return Number.isFinite(value) ? value : undefined;
    },
    setTourProgress: (tourId: string, stepIndex: number) => {
      setTourProgressStore(tourId, stepIndex);
    },
    clearTourProgress,
  };
}
