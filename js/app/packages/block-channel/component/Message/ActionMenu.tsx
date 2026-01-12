import { reactToMessage } from '@block-channel/signal/reactions';
import { DeprecatedIconButton } from '@core/component/DeprecatedIconButton';
import clickOutside from '@core/directive/clickOutside';
import { createCallback } from '@solid-primitives/rootless';
import { type Component, For, type Setter, createSignal, Show } from 'solid-js';
import { EmojiSearchSelector } from '../ReactionSelector';
import type { MessageAction } from './actions';
import SmileIcon from '@phosphor-icons/core/regular/smiley.svg?component-solid';

// Use clickOutside to close emoji selector when clicking elsewhere
false && clickOutside;

export type Action = {
  text: string;
  icon: Component;
  onClick: () => void;
  enabled: boolean;
};

export function ActionMenu(props: {
  messageId: string;
  actions: MessageAction[];
  setReactionMenuActivated?: Setter<boolean>;
}) {
  // default emojis
  const defaultEmojis = ['❤️', '👍', '😂'];
  const [showEmojiSelector, setShowEmojiSelector] = createSignal(false);

  const react = createCallback((emoji: string) =>
    reactToMessage(emoji, props.messageId)
  );

  const handleSmileyClick = () => {
    const newState = !showEmojiSelector();
    setShowEmojiSelector(newState);
    props.setReactionMenuActivated?.(newState);
  };

  return (
    <div class="flex flex-row bg-menu items-center allow-css-brackets relative">
      <For each={defaultEmojis}>
        {(emoji) => (
          <DeprecatedIconButton
            onMouseDown={() => react(emoji)}
            icon={() => <span>{emoji}</span>}
            tabIndex={0}
          />
        )}
      </For>

      <div class="relative">
        <DeprecatedIconButton 
          icon={SmileIcon} 
          tabIndex={-1}
          onClick={(e) => {
            // Prevent event from bubbling and closing context menu
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleSmileyClick();
          }}
          onMouseDown={(e) => {
            // Prevent mousedown from triggering context menu closure
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }}
        />
        
        <Show when={showEmojiSelector()}>
          <div 
            class="absolute top-full right-0 mt-1 z-modal"
            use:clickOutside={() => {
              setShowEmojiSelector(false);
              props.setReactionMenuActivated?.(false);
            }}
          >
            <EmojiSearchSelector
              onEmojiClick={(emoji) => {
                react(emoji.emoji);
                setShowEmojiSelector(false);
                props.setReactionMenuActivated?.(false);
              }}
              handleClose={() => {
                setShowEmojiSelector(false);
                props.setReactionMenuActivated?.(false);
              }}
            />
          </div>
        </Show>
      </div>

      <For each={props.actions.filter((a) => a.enabled)}>
        {(a) => (
          <DeprecatedIconButton
            onMouseDown={a.onClick}
            icon={a.icon}
            tooltip={{ label: a.text, delayOverride: 0 }}
            tabIndex={0}
          />
        )}
      </For>
    </div>
  );
}