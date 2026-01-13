import type { BlockAlias, BlockName } from '@core/block';
import { getIconConfig } from '@core/component/EntityIcon';
import { Hotkey } from '@core/component/Hotkey';
import { PcNoiseGrid } from '@core/component/PcNoiseGrid';
import { ENABLE_CREATE_TASK } from '@core/constant/featureFlags';
import { registerHotkey, useHotkeyDOMScope } from '@core/hotkey/hotkeys';
import { pressedKeys } from '@core/hotkey/state';
import { type HotkeyToken, TOKENS } from '@core/hotkey/tokens';
import type {
  HotkeyRegistrationOptions,
  ValidHotkey,
} from '@core/hotkey/types';
import {
  createCanvasFileFromJsonString,
  createChat,
  createCodeFileFromText,
  createMarkdownFile,
} from '@core/util/create';
import { createControlledOpenSignal } from '@core/util/createControlledOpenSignal';
import { isErr, ok } from '@core/util/maybeResult';
import { Dialog } from '@kobalte/core/dialog';
import PixelArrowRight from '@macro-icons/pixel/arrow-right.svg';
import WideChat from '@macro-icons/wide/chat.svg';
import WideDiagram from '@macro-icons/wide/diagram.svg';
import WideEmail from '@macro-icons/wide/email.svg';
import WideFileCode from '@macro-icons/wide/file-code.svg';
import WideFileMd from '@macro-icons/wide/file-md.svg';
import WideFolder from '@macro-icons/wide/folder.svg';
import WideStar from '@macro-icons/wide/star.svg';
import WideTask from '@macro-icons/wide/task.svg';
import { useCreateProject } from '@service-storage/projects';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { type FocusableElement, tabbable } from 'tabbable';
import { useSplitLayout } from './split-layout/layout';

const createBlock = async (spec: {
  createFn: () => Promise<string | undefined>;
  blockName: BlockName | BlockAlias;
  shouldInsert?: boolean;
  loading?: boolean;
}) => {
  const { replaceSplit, insertSplit } = useSplitLayout();
  const { blockName, createFn, loading } = spec;

  setCreateMenuOpen(false, false);

  if (!loading) {
    const id = await createFn();
    if (!id) return;

    const block = { type: blockName, id };

    spec.shouldInsert
      ? insertSplit(block, 'launcher')
      : replaceSplit({ content: block, referredFrom: 'launcher' });
  } else {
    const split = spec.shouldInsert
      ? insertSplit({ type: 'component', id: 'loading' }, 'launcher')
      : replaceSplit({
          content: { type: 'component', id: 'loading' },
          referredFrom: 'launcher',
        });

    const id = await createFn();
    if (!id) {
      split?.goBack();
      return;
    }

    if (split)
      split.replace({
        next: { type: blockName, id },
        referredFrom: 'launcher',
        mergeHistory: true,
      });
  }
};

const createComponent = async (spec: {
  shouldInsert?: boolean;
  componentId: string;
  asPopover?: boolean;
}) => {
  setCreateMenuOpen(false, false);
  const { replaceSplit, insertSplit, popoverSplit } = useSplitLayout();
  if (spec.asPopover) {
    popoverSplit({ type: 'component', id: spec.componentId });
    return;
  }
  if (spec.shouldInsert) {
    insertSplit({ type: 'component', id: spec.componentId }, 'launcher');
  } else {
    replaceSplit({
      content: { type: 'component', id: spec.componentId },
      referredFrom: 'launcher',
    });
  }
};

type CreatableBlock = Omit<HotkeyRegistrationOptions, 'scopeId'> & {
  altHotkeyToken?: HotkeyToken;
  blockName: BlockName;
  label: string;
};

export const CREATABLE_BLOCKS: CreatableBlock[] = [
  {
    label: 'Note',
    icon: () => <WideFileMd />,
    description: 'Create note',
    blockName: 'md',
    hotkeyToken: TOKENS.create.note,
    altHotkeyToken: TOKENS.create.noteNewSplit,
    hotkey: 'n',
    keyDownHandler: () => {
      createBlock({
        blockName: 'md',
        loading: true,
        createFn: () =>
          createMarkdownFile({
            projectId: undefined,
            content: '',
            title: '',
          }),
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
  },
  ...(ENABLE_CREATE_TASK
    ? [
        {
          altHotkeyToken: TOKENS.create.taskNewSplit,
          hotkeyToken: TOKENS.create.task,
          keyDownHandler: () => {
            createComponent({
              componentId: 'task-compose',
              asPopover: true,
            });
            return true;
          },
          blockName: 'task' as BlockName,
          description: 'Create task',
          icon: () => <WideTask />,
          hotkey: 't' as const,
          label: 'Task',
        },
      ]
    : []),
  {
    label: 'Email',
    icon: () => <WideEmail />,
    description: 'Create email',
    blockName: 'email',
    hotkeyToken: TOKENS.create.email,
    altHotkeyToken: TOKENS.create.emailNewSplit,
    hotkey: 'e',
    keyDownHandler: () => {
      createComponent({
        componentId: 'email-compose',
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
  },
  {
    label: 'Message',
    icon: () => <WideChat />,
    description: 'Create message',
    blockName: 'channel',
    hotkeyToken: TOKENS.create.message,
    altHotkeyToken: TOKENS.create.messageNewSplit,
    hotkey: 'm',
    keyDownHandler: () => {
      createComponent({
        componentId: 'channel-compose',
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
  },
  {
    label: 'AI',
    icon: () => <WideStar />,
    description: 'Create AI chat',
    blockName: 'chat' as BlockName,
    hotkeyToken: TOKENS.create.chat,
    altHotkeyToken: TOKENS.create.chatNewSplit,
    hotkey: 'a',
    keyDownHandler: () => {
      createBlock({
        blockName: 'chat',
        createFn: async () => {
          const result = await createChat();
          if ('error' in result) {
            return;
          }
          return result.chatId;
        },
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
  },
  {
    keyDownHandler: () => {
      createBlock({
        blockName: 'canvas',
        loading: true,
        createFn: async () => {
          const result = await createCanvasFileFromJsonString({
            json: JSON.stringify({ nodes: [], edges: [] }),
            title: 'New Canvas',
          });
          if ('error' in result) return;
          const [_, id] = ok(result.documentId);
          return id;
        },
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
    altHotkeyToken: TOKENS.create.canvasNewSplit,
    hotkeyToken: TOKENS.create.canvas,
    description: 'Create canvas',
    icon: () => <WideDiagram />,
    blockName: 'canvas',
    label: 'Canvas',
    hotkey: 'd',
  },
  {
    keyDownHandler: () => {
      createBlock({
        blockName: 'project',
        createFn: () => {
          const createProject = useCreateProject();
          return createProject({ name: 'New Folder' });
        },
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
    altHotkeyToken: TOKENS.create.projectNewSplit,
    hotkeyToken: TOKENS.create.project,
    description: 'Create folder',
    icon: () => <WideFolder />,
    blockName: 'project',
    label: 'Folder',
    hotkey: 'f',
  },
  {
    keyDownHandler: () => {
      createBlock({
        blockName: 'code',
        loading: true,
        createFn: async () => {
          const result = await createCodeFileFromText({
            code: 'print("Hello, World!")',
            title: 'New Code File',
            extension: 'py',
          });
          if (isErr(result)) return;
          const [, id] = ok(result[1]?.documentId);
          return id;
        },
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
    altHotkeyToken: TOKENS.create.codeNewSplit,
    description: 'Create code file',
    hotkeyToken: TOKENS.create.code,
    icon: () => <WideFileCode />,
    blockName: 'code',
    label: 'Code',
    hotkey: 'o',
  },
];

const USE_ENTITY_COLORS = true;

export const [createMenuOpen, setCreateMenuOpen] = createControlledOpenSignal();

type LauncherMenuItemProps = {
  creatableBlock: CreatableBlock;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  focused?: boolean;
};

const LauncherMenuItem = (props: LauncherMenuItemProps) => {
  let buttonRef!: HTMLButtonElement;

  createEffect(() => {
    if (props.focused) {
      buttonRef?.focus();
    }
  });

  const textFg = () =>
    USE_ENTITY_COLORS
      ? getIconConfig(props.creatableBlock.blockName ?? 'pdf').foreground
      : 'text-accent';

  const Icon = props.creatableBlock.icon;

  return (
    <button
      class={`create-menu-${props.creatableBlock.label.toLowerCase()} size-28 relative flex flex-col sm:gap-4 gap-2 items-center isolate justify-center bg-panel border border-edge-muted transition-transform ease-click duration-200`}
      classList={{
        '-translate-y-2 text-ink bracket-offset-1': props.focused,
        'text-ink-extra-muted': !props.focused,
      }}
      onClick={() => props.creatableBlock.keyDownHandler()}
      onPointerEnter={() => {buttonRef?.focus()}}
      onMouseEnter={props.onMouseEnter}
      onFocus={props.onFocus}
      ref={buttonRef}
      tabindex={0}
    >
      {/** TODO (seamus): we need to pool/cache these canvases. they brick the color picker/or any other gl context
                because they do not get garbage collected fast enough */}
      {/*<div
        class="inset-0 absolute bg-panel opacity-2 mask-b-from-0% mask-b-to-100%"
        classList={{
          'text-ink-extra-muted opacity-2': !props.focused,
          [textFg() + ' opacity-50']: props.focused,
        }}
      >
        <PcNoiseGrid
          speed={[props.focused ? 0.3 : 0, 0]}
          cellSize={21 / 2}
          size={[0.0, 0.2]}
          rounding={10}
          freq={0.002}
          crunch={0.4}
          stroke={0}
          warp={0}
          fill={1}
        />
      </div>*/}

      <div
        class="absolute size-full inset-0 transition-transform origin-top opacity-20 ease duration-200 mix-blend-color"
        classList={{
          [getIconConfig(props.creatableBlock.blockName ?? 'pdf').background]: true,
          'scale-y-100': props.focused,
          'scale-y-0': !props.focused,
        }}
      ></div>

      <div class="absolute top-1.5 left-2 z-1 p-1 px-1.5 bg-panel text-ink border border-edge-muted rounded-xs text-xs">
        <Hotkey token={props.creatableBlock.hotkeyToken} />
      </div>

      <div
        class="absolute size-2 right-2 top-2 z-1 transition-transform ease-click duration-200 transition-color border border-edge/50"
        style={{ background: props.focused ? 'currentColor' : 'transparent' }}
        classList={{[textFg()]: true}}
      />

      <div class="w-full py-1 px-2 absolute bottom-0 flex flex-row justify-between items-center z-1">
        <div class="text-sm font-bold font-stretch-condensed">
          {props.creatableBlock.label}
        </div>
        <div class="size-3">
          <PixelArrowRight />
        </div>
      </div>

      <div
        class="w-1/3 -translate-y-1 transition-all ease-click duration-200"
        classList={{
          [textFg()]: props.focused,
          'text-edge': !props.focused,
          'scale-110': props.focused,
        }}
      >
        {Icon && <Icon />}
      </div>
    </button>
  );
};

type LauncherInnerProps = {
  onClose: (shouldReturnFocus?: boolean) => void;
};

const LauncherInner = (props: LauncherInnerProps) => {
  const [attachHotkeys, launcherScope] = useHotkeyDOMScope('create-menu', true);

  let ref!: HTMLDivElement;

  const [focusedIndex, setFocusedIndex] = createSignal(0);

  const focusMenuItem = (label: string) => {
    const menuItem = document.querySelector<HTMLElement>(
      `.create-menu-${label}`
    );

    if (menuItem) {
      menuItem.focus();
    }

    return true;
  };

  const moveFocus = (delta: -1 | 1) => {
    const tabbableEls = tabbable(ref);
    const activeEl = document.activeElement as FocusableElement | null;
    const activeElIndex = activeEl
      ? tabbableEls.indexOf(activeEl as FocusableElement)
      : -1;

    if (activeElIndex === -1 || tabbableEls.length === 0) return false;

    const nextIndex =
      (activeElIndex + delta + tabbableEls.length) % tabbableEls.length;

    const nextEl = tabbableEls[nextIndex];

    if (!nextEl) return false;

    nextEl.focus();

    setFocusedIndex(nextIndex);

    return true;
  };

  CREATABLE_BLOCKS.forEach((item) => {
    registerHotkey({
      description: item.description,
      hotkeyToken: item.hotkeyToken,
      keyDownHandler: () => {
        item.keyDownHandler();
        props.onClose(false);
        return true;
      },
      scopeId: launcherScope,
      hotkey: item.hotkey,
    });

    if (item.altHotkeyToken) {
      registerHotkey({
        description: `${item.description} in new split`,
        keyDownHandler: () => {
          item.keyDownHandler();
          props.onClose();
          return true;
        },
        hotkey: `opt+${item.hotkey}` as ValidHotkey,
        hotkeyToken: item.altHotkeyToken,
        scopeId: launcherScope,
      });
    }
  });

  registerHotkey({
    description: 'Close Launcher',
    keyDownHandler: () => {
      setCreateMenuOpen(false);
      return true;
    },
    condition: createMenuOpen,
    scopeId: launcherScope,
    hotkey: 'c',
  });

  registerHotkey({
    keyDownHandler: () => moveFocus(-1),
    description: 'Navigate Left',
    scopeId: launcherScope,
    hotkey: 'arrowleft',
  });

  registerHotkey({
    hotkey: 'arrowright' as ValidHotkey,
    keyDownHandler: () => moveFocus(1),
    description: 'Navigate Right',
    scopeId: launcherScope,
  });

  registerHotkey({
    keyDownHandler: () => {
      props.onClose();
      return true;
    },
    scopeId: launcherScope,
    description: 'Exit',
    hotkey: 'escape',
  });

  registerHotkey({
    keyDownHandler: () => {
      CREATABLE_BLOCKS[focusedIndex()].keyDownHandler();
      props.onClose();
      return true;
    },
    description: 'Open in current split',
    runWithInputFocused: true,
    scopeId: launcherScope,
    displayPriority: 7,
    hotkey: 'enter',
  });

  registerHotkey({
    hotkey: 'opt+enter' as ValidHotkey,
    scopeId: launcherScope,
    description: 'Open in new split',
    keyDownHandler: () => {
      CREATABLE_BLOCKS[focusedIndex()].keyDownHandler();
      props.onClose();
      return true;
    },
    runWithInputFocused: true,
    displayPriority: 8,
  });

  onMount(() => {
    if (!ref) return;

    attachHotkeys(ref);

    setTimeout(() => {
      const firstItem = CREATABLE_BLOCKS[0];

      if (firstItem) {
        focusMenuItem(firstItem.label);
      }
    }, 0);
  });

  // horrible but tailwind requires the full strings
  const gridColsClass = () => {
    const length = CREATABLE_BLOCKS.length;
    if (length >= 8) return 'xl:grid-cols-8';
    if (length >= 7) return 'xl:grid-cols-7';
    if (length >= 6) return 'xl:grid-cols-6';
    if (length >= 5) return 'xl:grid-cols-5';
    return '';
  };

  return (
    <div>
      <div
        class="relative grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 isolate bg-menu border border-edge-muted suppress-css-brackets"
        classList={{
          [gridColsClass()]: true,
        }}
        ref={ref}
      >
        <div class="absolute pointer-events-none size-full inset-0"></div>

        <For each={CREATABLE_BLOCKS}>
          {(item, index) => (
            <LauncherMenuItem
              onMouseEnter={() => setFocusedIndex(index())}
              onFocus={() => setFocusedIndex(index())}
              focused={focusedIndex() === index()}
              creatableBlock={item}
            />
          )}
        </For>
      </div>
      <div class="col-span-full text-sm text-ink-muted text-center pt-4">
        Hold option to open in a new split view
      </div>
    </div>
  );
};

type LauncherProps = {
  onOpenChange: (open: boolean, shouldReturnFocus?: boolean) => void;
  open: boolean;
};

export const Launcher = (props: LauncherProps) => {
  const useJuicedScrim = false;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange} modal={true}>
      <Dialog.Portal>
        <Dialog.Overlay
          class="fixed inset-0 z-modal bg-modal-overlay pattern-diagonal-4 pattern-edge-muted"
          classList={{'backdrop-filter-[blur(0.5px)]': useJuicedScrim}}
        >
          <Show when={useJuicedScrim}>
            <div class="absolute pointer-events-none size-full inset-0 bg-modal-overlay text-ink opacity-5">
              <PcNoiseGrid
                speed={[0.03, 0.4]}
                circleMask={1}
                crunch={0.379}
                cellSize={20}
                size={[0, 1]}
                stroke={1}
                fill={0}
              />
            </div>
          </Show>
        </Dialog.Overlay>

        <Dialog.Content>
          <div
            class="fixed inset-0 z-modal w-screen h-screen flex items-center justify-center"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                props.onOpenChange(false);
              }
            }}
          >
            <LauncherInner
              onClose={(shouldReturnFocus) =>
                props.onOpenChange(false, shouldReturnFocus)
              }
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
};
