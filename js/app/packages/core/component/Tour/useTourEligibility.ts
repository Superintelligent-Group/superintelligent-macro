import { createMemo } from 'solid-js';
import { useIsAuthenticated } from '@core/auth';
import { isMobile } from '@core/mobile/isMobile';

type EligibilityOptions = {
  /**
   * Additional condition to qualify for showing a tour.
   */
  when?: () => boolean;
};

export function useTourEligibility(options: EligibilityOptions = {}) {
  const isAuthenticated = useIsAuthenticated();

  return createMemo(() => {
    if (!isAuthenticated() || isMobile()) return false;
    return options.when ? options.when() : true;
  });
}
