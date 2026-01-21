/**
 * Subtitle Slot - Secondary text like snippets and latest messages.
 */

import { Show, createMemo, type JSX } from 'solid-js';
import type { EntityData, ChannelEntity } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from '@core/component/LexicalMarkdown/theme';
import { tryMacroId, useDisplayName } from '@core/user';

export type SubtitleSlotConfig = {
  showSnippet?: boolean;
  showLatestMessage?: boolean;
  showUnrollNotifications?: boolean;
};

/** Channel subtitle with latest message */
function ChannelSubtitle(props: { entity: ChannelEntity }): JSX.Element {
  const latestMessage = createMemo(() => props.entity.latestMessage);

  // Get sender ID at component level (not inside memo)
  const senderId = () => props.entity.latestMessage?.senderId;
  const macroId = () => {
    const id = senderId();
    return id ? tryMacroId(id) : undefined;
  };

  // Call hook at component level with reactive ID
  const [userName] = useDisplayName(macroId());

  const userNameFromSender = () => {
    if (!senderId()) return undefined;
    return userName();
  };

  return (
    <Show when={latestMessage()}>
      {(lastMessage) => (
        <div class="flex items-center gap-1 @max-md/uList:w-full @max-md/uList:flex-col @max-md/uList:items-start @max-md/uList:gap-1">
          <span class="font-medium shrink-0 truncate @max-md/uList:w-full">
            {userNameFromSender()}
          </span>
          <div class="truncate shrink grow opacity-60 flex items-center @max-md/uList:w-full @max-md/uList:text-xs">
            <Show
              when={lastMessage().content.trim()}
              fallback={
                <span class="italic text-ink-disabled">Attached items</span>
              }
            >
              {(content) => (
                <StaticMarkdown
                  markdown={content()}
                  theme={unifiedListMarkdownTheme}
                  singleLine={true}
                />
              )}
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}

/** Subtitle slot component */
export function SubtitleSlot<T extends EntityData>(
  props: SlotProps<T> & SubtitleSlotConfig
): JSX.Element {
  const showChannelSubtitle = () =>
    props.showLatestMessage &&
    !props.showUnrollNotifications &&
    props.entity.type === 'channel';

  return (
    <Show when={showChannelSubtitle() && props.entity.type === 'channel'}>
      <ChannelSubtitle entity={props.entity as ChannelEntity} />
    </Show>
  );
}

/** Factory function to create subtitle slot renderer */
export function createSubtitleSlot<T extends EntityData>(
  config: SubtitleSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <SubtitleSlot
      {...props}
      showSnippet={config.showSnippet ?? true}
      showLatestMessage={config.showLatestMessage ?? true}
      showUnrollNotifications={config.showUnrollNotifications ?? false}
    />
  );
}
