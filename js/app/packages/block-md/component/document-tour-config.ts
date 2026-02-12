import { resolveTourTargetElement, type TourConfig } from '@core/component/Tour';

const focusDocEditor = () => {
  const el = resolveTourTargetElement('doc-editor');
  if (el instanceof HTMLElement) {
    el.focus();
  }
};

export const documentTourConfig: TourConfig = {
  id: 'document-onboarding',
  steps: [
    {
      id: 'note-block',
      type: 'anchored',
      target: 'doc-editor',
      title: 'Write a Note',
      description: 'This is the note block. Type `/` for blocks and formatting.',
      hint: 'Press / to open the block menu',
      onStepStart: focusDocEditor,
      action: { type: 'await-keypress', key: '/' },
      position: 'top',
    },
    {
      id: 'mentions',
      type: 'anchored',
      target: 'doc-editor',
      title: 'Mention Anything',
      description: 'Type `@` to mention docs, people, and more.',
      hint: 'Press @ to mention',
      onStepStart: focusDocEditor,
      action: { type: 'await-keypress', key: 'shift+2' },
      position: 'top',
    },
    {
      id: 'share-panel',
      type: 'anchored',
      target: 'share-toolbar',
      title: 'Share & Collaborate',
      description: 'Press `⌘S` to open the share panel.',
      hint: 'Press ⌘S to share',
      action: { type: 'await-keypress', key: 'cmd+s' },
      position: 'left',
    },
    {
      id: 'command-menu',
      type: 'anchored',
      target: 'command-menu',
      title: 'Find Anything',
      description: 'Press `⌘K` to open the command menu and jump anywhere.',
      hint: 'Press ⌘K to open the menu',
      action: { type: 'await-keypress', key: 'cmd+k' },
      position: 'top',
    },
  ],
};
