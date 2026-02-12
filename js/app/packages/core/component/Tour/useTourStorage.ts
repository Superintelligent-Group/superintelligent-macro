import { makePersisted } from '@solid-primitives/storage';
import { createSignal } from 'solid-js';

const STORAGE_KEY = 'tours-completed';
const PROGRESS_KEY = 'tour-progress';

// Persisted signal for completed tour IDs
const [completedTours, setCompletedTours] = makePersisted(
  createSignal<string[]>([]),
  { name: STORAGE_KEY }
);

const hasLocalStorage = () =>
  typeof window !== 'undefined' && !!window.localStorage;

const getProgressKey = (tourId: string) => `${PROGRESS_KEY}:${tourId}`;

export function useTourStorage() {
  const clearTourProgress = (tourId: string) => {
    if (!hasLocalStorage()) return;
    window.localStorage.removeItem(getProgressKey(tourId));
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
      if (!hasLocalStorage()) return;
      const prefix = `${PROGRESS_KEY}:`;
      for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          window.localStorage.removeItem(key);
        }
      }
    },
    getTourProgress: (tourId: string) => {
      if (!hasLocalStorage()) return undefined;
      const raw = window.localStorage.getItem(getProgressKey(tourId));
      if (raw == null) return undefined;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    setTourProgress: (tourId: string, stepIndex: number) => {
      if (!hasLocalStorage()) return;
      window.localStorage.setItem(getProgressKey(tourId), `${stepIndex}`);
    },
    clearTourProgress,
  };
}
