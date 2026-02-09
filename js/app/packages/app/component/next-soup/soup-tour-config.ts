import type { TourConfig } from '@core/component/Tour';

export const soupTourConfig: TourConfig = {
  id: 'soup-onboarding',
  steps: [
    {
      id: 'filter-menu',
      type: 'anchored',
      target: 'filter-menu',
      title: 'Filter Your Workspace',
      description:
        'Use these filters to organize your workspace. Toggle between inbox/other, filter by type, and search.',
      action: { type: 'click-next' },
      position: 'bottom',
    },
    {
      id: 'press-c',
      type: 'centered',
      title: 'Create Documents',
      description: 'Press `C` to open the create menu',
      action: { type: 'await-keypress', key: 'c' },
    },
    {
      id: 'launcher',
      type: 'anchored',
      target: 'launcher',
      title: 'Quick Create',
      description: 'Press `D` to create a new document, or browse other options',
      action: { type: 'await-element', selector: '[data-tour-target="share-toolbar"]' },
      position: 'bottom',
    },
    {
      id: 'share-toolbar',
      type: 'anchored',
      target: 'share-toolbar',
      title: 'Share & Collaborate',
      description:
        'When viewing a document, use this toolbar to share it to channels and collaborate',
      action: { type: 'click-next' },
      position: 'left',
    },
    {
      id: 'close-preview',
      type: 'centered',
      title: 'Close Preview',
      description: 'Press `Space` to close the preview and return to your list',
      action: { type: 'await-keypress', key: 'space' },
    },
    {
      id: 'ai-sidebar',
      type: 'anchored',
      target: 'ai-sidebar',
      title: 'AI Assistant',
      description:
        "Toggle the AI sidebar to get help with your work. It's aware of your current context.",
      action: { type: 'click-next' },
      position: 'left',
    },
  ],
};
