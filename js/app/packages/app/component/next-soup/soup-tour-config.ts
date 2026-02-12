import { globalSplitManager } from '@app/signal/splitLayout';
import { performHotkey, type TourConfig } from '@core/component/Tour';

const returnFocusToActiveSplit = () => {
  const manager = globalSplitManager();
  if (!manager) return;
  manager.returnFocus();
  const activeSplitId = manager.activeSplitId();
  if (!activeSplitId) return;
  const splitContainer = document.querySelector<HTMLElement>(
    `[data-split-id="${activeSplitId}"]`
  );
  splitContainer?.focus();
};

const getSplitCount = () => globalSplitManager()?.splits().length ?? 0;
let splitCountAtStart = 0;
let activeSplitIdAtStart: string | undefined;

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
      onStepStart: returnFocusToActiveSplit,
      action: { type: 'await-keypress', key: 'i' },
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
      onStepStart: returnFocusToActiveSplit,
      action: { type: 'await-keypress', key: 'space' },
      position: 'bottom',
    },
    {
      id: 'new-split',
      type: 'anchored',
      target: 'new-split',
      title: 'Create A New Split',
      description: 'Press `|` to create a new split and work side-by-side.',
      hint: 'Press | to create a split',
      onStepStart: () => {
        returnFocusToActiveSplit();
        splitCountAtStart = getSplitCount();
        activeSplitIdAtStart = globalSplitManager()?.activeSplitId();
      },
      action: {
        type: 'await-signal',
        check: () => {
          const manager = globalSplitManager();
          if (!manager) return false;
          const splitCountChanged = getSplitCount() > splitCountAtStart;
          const activeSplitChanged =
            manager.activeSplitId() !== activeSplitIdAtStart;
          return splitCountChanged || activeSplitChanged;
        },
      },
      position: 'top',
    },
    {
      id: 'close-active',
      type: 'centered',
      title: 'Close It',
      description: 'Press `Space` to close the preview and return to your list.',
      hint: 'Press Space to close the preview',
      onStepStart: returnFocusToActiveSplit,
      action: { type: 'await-keypress', key: 'space' },
    },
    {
      id: 'press-c',
      type: 'centered',
      title: 'Create Anything',
      description: 'Press `C` to open the create menu.',
      hint: 'Press C to open the create menu',
      onStepStart: returnFocusToActiveSplit,
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
