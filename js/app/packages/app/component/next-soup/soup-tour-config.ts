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
        'Use these filters to organize your workspace. Press `I` to toggle Inbox, then try other filters and search.',
      hint: 'Press I to toggle Inbox',
      action: {
        type: 'await-element',
        selector: '[data-tour-target="inbox-filter"][data-tour-active]',
      },
      position: 'bottom',
    },
    {
      id: 'entity-list',
      type: 'anchored',
      target: 'entity-list',
      title: 'Everything In One List',
      description:
        'This list mixes docs, tasks, emails, channels, and more so you can work across everything in one place.',
      hint: 'Press Enter to continue',
      action: { type: 'click-next' },
      position: 'bottom',
    },
    {
      id: 'press-c',
      type: 'centered',
      title: 'Create Documents',
      description: 'Press `C` to open the create menu',
      hint: 'Press C to open the create menu',
      action: {
        type: 'await-element',
        selector: '[data-tour-target="launcher"]',
      },
      position: 'bottom',
    },
    {
      id: 'launcher',
      type: 'anchored',
      target: 'launcher',
      title: 'Quick Create',
      description: 'Press `D` to create a new document, or browse other options',
      hint: 'Choose Document to open it',
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
      hint: 'Press Enter to continue',
      action: { type: 'click-next' },
      position: 'left',
    },
    {
      id: 'close-preview',
      type: 'centered',
      title: 'Close Preview',
      description: 'Press `Space` to close the preview and return to your list',
      hint: 'Press Space to close the preview',
      action: { type: 'await-keypress', key: 'space' },
    },
    {
      id: 'ai-sidebar',
      type: 'anchored',
      target: 'ai-sidebar',
      title: 'AI Assistant',
      description:
        "Toggle the AI sidebar to get help with your work. It's aware of your current context.",
      hint: 'Press Enter to finish',
      action: { type: 'click-next' },
      position: 'left',
    },
  ],
};
