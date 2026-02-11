import { performHotkey, type TourConfig } from '@core/component/Tour';

export const soupTourConfig: TourConfig = {
  id: 'soup-onboarding',
  steps: [
    {
      id: 'inbox',
      type: 'anchored',
      target: 'filter-menu',
      title: 'Focus Your Inbox',
      description: 'Press `I` to toggle Inbox and focus on what needs attention.',
      hint: 'Press I to toggle Inbox',
      action: { type: 'await-keypress', key: 'i', perform: () => performHotkey('i') },
      position: 'bottom',
    },
    {
      id: 'entity-list',
      type: 'anchored',
      target: 'entity-list',
      title: 'Everything In One List',
      description:
        'Docs, tasks, channels, and more show up here. Press `Space` to preview the selected item.',
      hint: 'Press Space to preview',
      action: {
        type: 'await-keypress',
        key: 'space',
        perform: () => performHotkey('space'),
      },
      position: 'bottom',
    },
    {
      id: 'new-split',
      type: 'anchored',
      target: 'new-split',
      title: 'Create A New Split',
      description: 'Press `|` to create a new split and work side-by-side.',
      hint: 'Press | to create a split',
      action: { type: 'click-next' },
      position: 'top',
    },
    {
      id: 'close-active',
      type: 'centered',
      title: 'Close It',
      description: 'Press `Space` to close the preview and return to your list.',
      hint: 'Press Space to close the preview',
      action: {
        type: 'await-keypress',
        key: 'space',
        perform: () => performHotkey('space'),
      },
    },
    {
      id: 'press-c',
      type: 'centered',
      title: 'Create Anything',
      description: 'Press `C` to open the create menu.',
      hint: 'Press C to open the create menu',
      action: {
        type: 'await-anchor',
        targetId: 'launcher',
        perform: () => performHotkey('c'),
      },
      position: 'bottom',
    },
    {
      id: 'launcher',
      type: 'anchored',
      target: 'launcher',
      title: 'New Document',
      description: 'Press `D` to create a new document.',
      hint: 'Choose Document to open it',
      action: {
        type: 'await-anchor',
        targetId: 'share-toolbar',
        perform: () => performHotkey('d'),
      },
      position: 'bottom',
    },
  ],
};
