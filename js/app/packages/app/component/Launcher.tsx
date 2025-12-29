import type { BlockAlias, BlockName } from '@core/block';
import { ClippedPanel } from '@core/component/ClippedPanel';
import { DialogWrapper } from '@core/component/DialogWrapper';
import { getIconConfig } from '@core/component/EntityIcon';
import { Hotkey } from '@core/component/Hotkey';
import { IconButton } from '@core/component/IconButton';
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
import CloseIcon from '@icon/regular/x.svg';
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
import { beveledCorners } from '../../block-theme/signals/themeSignals';
import { useSplitLayout } from './split-layout/layout';

const createBlock = async (spec: {
  blockName: BlockName | BlockAlias;
  createFn: () => Promise<string | undefined>;
  loading?: boolean;
  shouldInsert?: boolean;
}) => {
  const { replaceSplit, insertSplit } = useSplitLayout();
  const { blockName, createFn, loading } = spec;

  setCreateMenuOpen(false, false);

  if (!loading) {
    const id = await createFn();
    if (!id) return;

    const block = { type: blockName, id };

    spec.shouldInsert ? insertSplit(block) : replaceSplit(block);
  } else {
    const split = spec.shouldInsert
      ? insertSplit({ type: 'component', id: 'loading' })
      : replaceSplit({ type: 'component', id: 'loading' });

    const id = await createFn();
    if (!id) {
      split?.goBack();
      return;
    }

    if (split) split.replace({ type: blockName, id }, true);
  }
};

const createComponent = async (spec: {
  componentId: string;
  shouldInsert?: boolean;
  asPopover?: boolean;
}) => {
  setCreateMenuOpen(false, false);
  const { replaceSplit, insertSplit, popoverSplit } = useSplitLayout();
  if (spec.asPopover) {
    popoverSplit({ type: 'component', id: spec.componentId });
    return;
  }
  if (spec.shouldInsert) {
    insertSplit({ type: 'component', id: spec.componentId });
  } else {
    replaceSplit({ type: 'component', id: spec.componentId });
  }
};

type CreatableBlock = Omit<HotkeyRegistrationOptions, 'scopeId'> & {
  label: string;
  blockName: BlockName;
  altHotkeyToken?: HotkeyToken;
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
            title: '',
            content: '',
            projectId: undefined,
          }),
        shouldInsert: pressedKeys().has('opt'),
      });
      return true;
    },
  },
  ...(ENABLE_CREATE_TASK
    ? [
        {
          label: 'Task',
          icon: () => <WideTask />,
          description: 'Create task',
          blockName: 'task' as BlockName,
          hotkeyToken: TOKENS.create.task,
          altHotkeyToken: TOKENS.create.taskNewSplit,
          hotkey: 't' as const,
          keyDownHandler: () => {
            createComponent({
              componentId: 'task-compose',
              asPopover: true,
            });
            return true;
          },
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
    label: 'Canvas',
    icon: () => <WideDiagram />,
    description: 'Create canvas',
    blockName: 'canvas',
    hotkeyToken: TOKENS.create.canvas,
    altHotkeyToken: TOKENS.create.canvasNewSplit,
    hotkey: 'd',
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
  },
  {
    label: 'Folder',
    icon: () => <WideFolder />,
    description: 'Create folder',
    blockName: 'project',
    hotkeyToken: TOKENS.create.project,
    altHotkeyToken: TOKENS.create.projectNewSplit,
    hotkey: 'f',
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
          if (isErr(result)) {
            return;
          }
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
      onClick={() => props.creatableBlock.keyDownHandler()}
      classList={{
        'text-ink bracket-offset-1': props.focused,
        'text-ink-extra-muted': !props.focused,
      }}
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
          cellSize={21 / 2}
          rounding={10}
          warp={0}
          freq={0.002}
          crunch={0.4}
          size={[0.0, 0.2]}
          fill={1}
          stroke={0}
          speed={[props.focused ? 0.3 : 0, 0]}
        />
      </div>*/}

      <div
        class="absolute size-full inset-0 transition-transform origin-top opacity-20 ease duration-200 mix-blend-color"
        classList={{
          [getIconConfig(props.creatableBlock.blockName ?? 'pdf').background]:
            true,
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
        classList={{ [textFg()]: true }}
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
          'text-edge': !props.focused,
          'scale-110': props.focused,
          [textFg()]: props.focused,
        }}
      >
        {Icon && <Icon />}
      </div>
    </button>
  );
};

type LauncherInnerProps = { onClose: (shouldReturnFocus?: boolean) => void };

const LauncherInner = (props: LauncherInnerProps) => {
  const [attachHotkeys, launcherScope] = useHotkeyDOMScope('create-menu', true);
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  let ref!: HTMLDivElement;

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
    if (activeElIndex === -1 || tabbableEls.length === 0) {
      return false;
    }
    const nextIndex =
      (activeElIndex + delta + tabbableEls.length) % tabbableEls.length;
    const nextEl = tabbableEls[nextIndex];
    if (!nextEl) {
      return false;
    }
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
        hotkey: `opt+${item.hotkey}` as ValidHotkey,
        hotkeyToken: item.altHotkeyToken,
        keyDownHandler: () => {
          item.keyDownHandler();
          props.onClose();
          return true;
        },
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
    keyDownHandler: () => {
      CREATABLE_BLOCKS[focusedIndex()].keyDownHandler();
      props.onClose();
      return true;
    },
    hotkey: 'opt+enter' as ValidHotkey,
    description: 'Open in new split',
    runWithInputFocused: true,
    scopeId: launcherScope,
    displayPriority: 8,
  });

  onMount(() => attachHotkeys(ref));

  return (
    <>
      <div class="flex items-center gap-2 bg-panel px-2 h-[40px] border-b border-edge-muted">
        <Dialog.CloseButton>
          <IconButton
            tooltip={{ label: 'Close' }}
            icon={CloseIcon}
            iconSize={16}
            theme="clear"
            size="sm"
          />
        </Dialog.CloseButton>
        <Dialog.Title class="text-sm">Create New</Dialog.Title>
      </div>

      <div
        class="grid grid-cols-4 gap-3 p-6 isolate suppress-css-brackets w-min"
        ref={ref}
      >
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
    </>
  );
};

// Hold option to open in a new split view

type LauncherProps = {
  onOpenChange: (open: boolean, shouldReturnFocus?: boolean) => void;
  open: boolean;
};

export const Launcher = (props: LauncherProps) => {
  const useJuicedScrim = false;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-modal bg-modal-overlay pattern-diagonal-4 pattern-edge-muted">
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

        <DialogWrapper>
          <Dialog.Content>
            <ClippedPanel tl={!beveledCorners()} active>
              <LauncherInner
                onClose={(shouldReturnFocus) =>
                  props.onOpenChange(false, shouldReturnFocus)
                }
              />
            </ClippedPanel>
          </Dialog.Content>
        </DialogWrapper>
      </Dialog.Portal>
    </Dialog>
  );
};
