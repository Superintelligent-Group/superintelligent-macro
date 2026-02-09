import { createSignal } from 'solid-js';

// Global state to ensure only one tour is active at a time across all components
const [activeTourId, setActiveTourId] = createSignal<string | null>(null);

/**
 * Attempts to activate a tour. Returns true if successful, false if another tour is already active.
 */
export function activateTour(tourId: string): boolean {
  if (activeTourId() !== null && activeTourId() !== tourId) {
    return false; // Another tour is already active
  }
  setActiveTourId(tourId);
  return true;
}

/**
 * Deactivates a tour if it's currently active.
 */
export function deactivateTour(tourId: string): void {
  if (activeTourId() === tourId) {
    setActiveTourId(null);
  }
}

/**
 * Checks if a specific tour is currently active.
 */
export function isTourActive(tourId: string): boolean {
  return activeTourId() === tourId;
}

/**
 * Checks if any tour is currently active.
 */
export function isAnyTourActive(): boolean {
  return activeTourId() !== null;
}
