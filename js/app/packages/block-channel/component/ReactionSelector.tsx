import { DeprecatedIconButton } from '@core/component/DeprecatedIconButton';
import { EmojiSelector } from '@core/component/Emoji/EmojiSelector';
import type { SimpleEmoji } from '@core/component/Emoji/emojis';
import { ContextMenu } from '@kobalte/core/context-menu';
import { Popover } from '@kobalte/core/popover';
import SearchIcon from '@phosphor-icons/core/regular/magnifying-glass.svg?component-solid';
import SmileIcon from '@phosphor-icons/core/regular/smiley.svg?component-solid';
import {
  createEffect,
  createSignal,
  onMount,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';



type EmojiSearchSelectorProps = {
  onEmojiClick?: (emoji: SimpleEmoji) => void;
  handleClose: () => void;
  fullWidth?: boolean;
  insideMenu?: boolean;
};

export function EmojiSearchSelector(props: EmojiSearchSelectorProps) {
  const [input, setInput] = createSignal('');
  let searchInputRef: HTMLInputElement | undefined;
  let containerRef: HTMLDivElement | undefined;

  onMount(() => {
    setTimeout(() => {searchInputRef?.focus()}, 0);
  });

  createEffect(() => {
    if (containerRef && !containerRef.contains(document.activeElement)) {
      containerRef?.focus();
    }
  });

  return (
    <Dynamic
      component={props.insideMenu ? ContextMenu.Item : 'div'}
      class={`${props.fullWidth ? 'w-full' : 'w-[258px]'} h-[315px] flex flex-col bg-menu shadow-lg border border-edge`}
      {...(props.insideMenu && { closeOnSelect: false })}
      aria-label="Emoji search"
      ref={containerRef}
      role="dialog"
    >
      <div class="flex w-full">
        <div class="flex flex-row items-center text-ink gap-1 border-b border-edge-muted px-2 py-2 text-xs w-full">
          <SearchIcon class="w-3 h-3" />
          <input
            onInput={(e) => setInput(e.target.value)}
            placeholder="Search emojis"
            aria-label="Search emojis"
            ref={searchInputRef}
            role="searchbox"
            value={input()}
          />
        </div>
      </div>
      <div class="flex-grow overflow-y-auto overflow-x-hidden scrollbar-hidden">
        <EmojiSelector
          nameFilter={input()}
          onEmojiClick={(emoji) => {
            props.onEmojiClick?.(emoji);
            props.handleClose();
          }}
        />
      </div>
    </Dynamic>
  );
}

type ReactionSelectorProps = {
  onEmojiClick: (emoji: SimpleEmoji) => void;
  onOpenChange?: (isOpen: boolean) => void;
};

export function ReactionSelector(props: ReactionSelectorProps) {
  const [openPopover, setOpenPopover] = createSignal(false);

  const handleClose = () => {
    setOpenPopover(false);
  };

  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
    setOpenPopover(isOpen);
    props.onOpenChange?.(isOpen);
  };

  return (
    <Popover
      placement="top"
      onOpenChange={onOpenChange}
      overflowPadding={8}
      slide={true}
      open={openPopover()}
    >
      <Popover.Trigger>
        <DeprecatedIconButton icon={SmileIcon} tabIndex={-1} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content class="z-modal">
          <Popover.Arrow class="fill-menu" />
          <EmojiSearchSelector
            onEmojiClick={props.onEmojiClick}
            handleClose={handleClose}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover>
  );
}
