import type { SplitContent } from '@app/component/split-layout/layoutManager';
import { globalSplitManager } from '@app/signal/splitLayout';
import { performHotkey, type TourConfig } from '@core/component/Tour';
import { isBlockAlias, resolveBlockAlias } from '@core/constant/allBlocks';

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

const getActiveSplitHandle = () => {
  const manager = globalSplitManager();
  const activeSplitId = manager?.activeSplitId();
  if (!manager || !activeSplitId) return;
  return manager.getSplit(activeSplitId);
};

const getContentKey = (content?: SplitContent) =>
  content ? `${content.type}:${content.id}` : undefined;

const isDocumentContent = (content?: SplitContent) => {
  if (!content || content.type === 'component') return false;
  const baseType = isBlockAlias(content.type)
    ? resolveBlockAlias(content.type)
    : content.type;
  return baseType === 'md';
};

const hasShareToolbarInActiveSplit = () => {
  const manager = globalSplitManager();
  const activeSplitId = manager?.activeSplitId();
  if (!activeSplitId) return false;
  const splitContainer = document.querySelector<HTMLElement>(
    `[data-split-id="${activeSplitId}"]`
  );
  if (!splitContainer) return false;
  return !!splitContainer.querySelector('[data-tour-target="share-toolbar"]');
};

const getSplitCount = () => globalSplitManager()?.splits().length ?? 0;
let splitCountAtStart = 0;
let docContentKeyAtStart: string | undefined;

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
      },
      action: {
        type: 'await-signal',
        check: () => {
          const manager = globalSplitManager();
          if (!manager) return false;
          const splitCountChanged = getSplitCount() > splitCountAtStart;
          return splitCountChanged;
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
      onStepStart: () => {
        returnFocusToActiveSplit();
        docContentKeyAtStart = getContentKey(getActiveSplitHandle()?.content());
      },
      action: {
        type: 'await-signal',
        check: () => {
          const handle = getActiveSplitHandle();
          if (!handle) return false;
          const content = handle.content();
          if (!isDocumentContent(content)) return false;
          const contentKey = getContentKey(content);
          if (!contentKey || contentKey === docContentKeyAtStart) return false;
          return hasShareToolbarInActiveSplit();
        },
        perform: () => performHotkey('d'),
      },
      position: 'bottom',
    },
  ],
};
