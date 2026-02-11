import type { Placement } from '@floating-ui/dom';
import type { ValidHotkey } from '@core/hotkey/types';

export interface TourConfig {
  id: string; // Unique identifier (e.g., "soup-onboarding")
  steps: TourStep[];
}

export interface TourStep {
  id: string;
  type: 'anchored' | 'centered';
  target?: string; // anchor id (for anchored)
  title: string;
  description: string;
  hint?: string;
  action: TourAction;
  position?: Placement; // For anchored tooltips (from @floating-ui/dom)
}

type TourActionBase = {
  /**
   * Optional hook to trigger the required state for this step.
   * Used by "step-through" controls (e.g., right arrow) to advance safely.
   */
  perform?: () => void;
};

export type TourAction =
  | (TourActionBase & { type: 'click-next' })
  | (TourActionBase & { type: 'await-keypress'; key: ValidHotkey })
  | (TourActionBase & { type: 'await-anchor'; targetId: string })
  | (TourActionBase & { type: 'await-element'; selector: string })
  | (TourActionBase & { type: 'await-signal'; check: () => boolean });

export interface TourProps {
  config: TourConfig;
  onComplete: () => void;
  onSkip: () => void;
  autoStart?: boolean; // Default: true
  scopeContainer?: HTMLElement; // Optional container to scope element queries
}
