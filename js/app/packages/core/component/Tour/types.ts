import type { Placement } from '@floating-ui/dom';
import type { ValidHotkey } from '@core/hotkey/types';

export interface TourConfig {
  id: string; // Unique identifier (e.g., "soup-onboarding")
  steps: TourStep[];
}

export interface TourStep {
  id: string;
  type: 'anchored' | 'centered';
  target?: string; // data-tour-target value (for anchored)
  title: string;
  description: string;
  action: TourAction;
  position?: Placement; // For anchored tooltips (from @floating-ui/dom)
}

export type TourAction =
  | { type: 'click-next' }
  | { type: 'await-keypress'; key: ValidHotkey }
  | { type: 'await-element'; selector: string }
  | { type: 'await-signal'; check: () => boolean };

export interface TourProps {
  config: TourConfig;
  onComplete: () => void;
  onSkip: () => void;
  autoStart?: boolean; // Default: true
  scopeContainer?: HTMLElement; // Optional container to scope element queries
}
