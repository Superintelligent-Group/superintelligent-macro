import { resolveTourTargetElement, type TourConfig } from '@core/component/Tour';

type ScopeAccessor = () => HTMLElement | undefined;

export const createDocumentTourConfig = (
  scopeContainer?: ScopeAccessor
): TourConfig => {
  const focusDocEditor = () => {
    const scope = scopeContainer?.();
    const el = resolveTourTargetElement('doc-editor', scope);
    if (el instanceof HTMLElement) {
      el.focus();
    }
  };

  return {
    id: 'document-onboarding',
    steps: [
      {
        id: 'note-block',
        type: 'anchored',
        target: 'doc-editor',
        title: 'Write a Note',
        description:
          'This is the note block. Type `/` for blocks and formatting.',
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
        action: { type: 'await-keypress', key: '@' },
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
};
