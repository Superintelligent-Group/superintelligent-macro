import Drawer from '@corvu/drawer';
import { EmojiSelector } from '@core/component/Emoji/EmojiSelector';
import ReplyIcon from '@icon/regular/arrow-bend-up-left.svg';
import ArrowLeftIcon from '@icon/regular/arrow-left.svg';
import LinkIcon from '@icon/regular/link.svg';
import PencilIcon from '@icon/regular/pencil.svg';
import PlusIcon from '@icon/regular/plus.svg';
import TrashIcon from '@icon/regular/trash.svg';
import { cn } from '@ui/utils/classname';
import { createSignal, For, Show, type Component, type JSX } from 'solid-js';
import { useMessage, useMessageActions, useMessageDrawer } from './context';
import { renderIcon } from './render-icon';
import type { MessageActionEvent, MessageActionHandler } from './types';

const QUICK_REACTION_EMOJIS = ['❤️', '👍', '👎', '😂', '😡'] as const;

type ActionId = 'reply' | 'copy-link' | 'edit' | 'delete';

type ActionItem = {
  id: ActionId;
  label: string;
  icon: Component<JSX.SvgSVGAttributes<SVGSVGElement>> | string;
  onClick?: MessageActionHandler;
  destructive?: boolean;
};

export function ActionDrawer() {
  const message = useMessage();
  const actions = useMessageActions();
  const drawerState = useMessageDrawer();
  const [showEmojiSearch, setShowEmojiSearch] = createSignal(false);
  const [emojiQuery, setEmojiQuery] = createSignal('');

  const handleReaction = (emoji: string, event?: MessageActionEvent) => {
    void actions?.onReact?.({ message: message(), event, emoji });
    drawerState?.close();
    setShowEmojiSearch(false);
  };

  const handleAction = (
    handler: MessageActionHandler | undefined,
    event: MouseEvent
  ) => {
    void handler?.({ message: message(), event });
    drawerState?.close();
  };

  const actionItems: ActionItem[] = [
    { id: 'reply', label: 'Reply', icon: ReplyIcon, onClick: actions?.onReply },
    {
      id: 'copy-link',
      label: 'Copy Link',
      icon: LinkIcon,
      onClick: actions?.onCopyLink,
    },
    { id: 'edit', label: 'Edit', icon: PencilIcon, onClick: actions?.onEdit },
    {
      id: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      onClick: actions?.onDelete,
      destructive: true,
    },
  ];

  const visibleActions = () => actionItems.filter((item) => item.onClick);
  const hasReactAction = () => actions?.onReact !== undefined;

  return (
    <Show when={drawerState}>
      <Drawer
        side="bottom"
        open={drawerState!.isOpen()}
        closeOnOutsidePointerStrategy="pointerdown"
        onOpenChange={(v) => {
          if (!v) {
            drawerState!.close();
            setShowEmojiSearch(false);
            setEmojiQuery('');
          }
        }}
        preventScroll={false}
        preventScrollbarShift={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay class="fixed inset-0 z-modal-overlay bg-modal-overlay pattern-diagonal-4 pattern-edge-muted" />
          <Drawer.Content
            aria-label="Message actions"
            class="fixed bottom-0 left-0 right-0 z-modal bg-menu rounded-t-lg flex flex-col h-[80dvh] data-transitioning:transition-transform data-transitioning:duration-200 ease-out pb-(--safe-bottom)"
          >
            {/* Drag handle */}
            <div class="flex justify-center pt-3 pb-2 shrink-0">
              <div class="w-10 h-1 rounded-full bg-edge-muted" />
            </div>

            {/* Emoji search view */}
            <Show when={showEmojiSearch()}>
              <div class="flex flex-col flex-1 min-h-0 pb-2">
                {/* Back + search input */}
                <div class="flex items-center gap-2 px-3 pb-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Back"
                    class="size-8 flex items-center justify-center text-ink-muted hover:bg-hover hover-transition-bg rounded-md shrink-0"
                    onClick={() => {
                      setShowEmojiSearch(false);
                      setEmojiQuery('');
                    }}
                  >
                    {renderIcon(ArrowLeftIcon)}
                  </button>
                  <div class="flex flex-1 items-center border border-edge-muted rounded-md px-2 py-1.5 text-sm gap-1">
                    <input
                      autofocus
                      value={emojiQuery()}
                      onInput={(e) => setEmojiQuery(e.currentTarget.value)}
                      placeholder="Search emojis"
                      aria-label="Search emojis"
                      class="flex-1 bg-transparent outline-none placeholder:text-ink-muted"
                    />
                  </div>
                </div>

                {/* Emoji grid */}
                <div class="overflow-y-auto flex-1 px-1">
                  <EmojiSelector
                    nameFilter={emojiQuery()}
                    onEmojiClick={(emoji) => {
                      handleReaction(emoji.emoji);
                    }}
                  />
                </div>
              </div>
            </Show>

            {/* Main view */}
            <Show when={!showEmojiSearch()}>
              {/* Emoji reaction row */}
              <Show when={hasReactAction()}>
                <div class="flex flex-row items-center justify-between px-3 pb-2 gap-1 shrink-0">
                  <For each={QUICK_REACTION_EMOJIS}>
                    {(emoji) => (
                      <button
                        type="button"
                        title={`React ${emoji}`}
                        aria-label={`React ${emoji}`}
                        class="size-12 flex items-center justify-center bg-edge/30 rounded-full text-[28px]"
                        onClick={(event) => handleReaction(emoji, event)}
                      >
                        {emoji}
                      </button>
                    )}
                  </For>
                  <button
                    type="button"
                    title="More reactions"
                    aria-label="More reactions"
                    class="size-12 bg-edge/30 rounded-full flex items-center justify-center text-ink-muted"
                    onClick={() => setShowEmojiSearch(true)}
                  >
                    {renderIcon(PlusIcon, 'size-[28px]')}
                  </button>
                </div>
              </Show>

              {/* Divider */}
              <Show when={hasReactAction() && visibleActions().length > 0}>
                <div class="border-t border-edge-muted/50 mx-3 shrink-0" />
              </Show>

              {/* Action buttons */}
              <Show when={visibleActions().length > 0}>
                <div class="flex flex-col pb-2 shrink-0">
                  <For each={visibleActions()}>
                    {(action) => (
                      <button
                        type="button"
                        data-message-action={action.id}
                        class={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm hover:bg-hover hover-transition-bg text-left',
                          action.destructive ? 'text-failure-ink' : 'text-ink'
                        )}
                        onClick={(event) => handleAction(action.onClick, event)}
                      >
                        <span class="size-5 flex items-center justify-center shrink-0">
                          {renderIcon(action.icon)}
                        </span>
                        {action.label}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer>
    </Show>
  );
}
