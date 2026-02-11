import type { TourConfig } from '@core/component/Tour';

export const settingsTourConfig: TourConfig = {
  id: 'settings-onboarding',
  steps: [
    {
      id: 'open-settings',
      type: 'anchored',
      target: 'settings-button',
      title: 'Open Settings',
      description: 'Use `⌘;` to open Settings from anywhere.',
      hint: 'Press ⌘; any time',
      action: { type: 'click-next' },
      position: 'top',
    },
    {
      id: 'themes',
      type: 'anchored',
      target: 'theme-list',
      title: 'Themes',
      description: 'Pick a theme to customize the look and feel.',
      hint: 'Try a theme',
      action: { type: 'click-next' },
      position: 'right',
    },
  ],
};
