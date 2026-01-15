/**
 * Search Hits Slot - Content search results display.
 */

import {
  Show,
  For,
  createSignal,
  Match,
  Switch,
  type JSX,
  type ParentProps,
} from 'solid-js';
import type {
  EntityData,
  WithSearch,
  ContentHitData,
  ChannelContentHitData,
  EmailContentHitData,
  SearchLocation,
} from '@macro-entity';
import type { SlotProps, SlotRenderer, EntityClickHandler } from '../types';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from '@core/component/LexicalMarkdown/theme';
import { tryMacroId, useDisplayName } from '@core/user';
import { UserIcon } from '@core/component/UserIcon';
import { formatTimestamp } from './TimestampSlot';

export type SearchHitsSlotConfig = {
  maxVisible?: number;
  showThreadBorder?: boolean;
  onClick?: EntityClickHandler<EntityData>;
};

/** Check if entity has search data */
function isSearchEntity(
  entity: EntityData | WithSearch<EntityData>
): entity is WithSearch<EntityData> {
  return 'search' in entity && entity.search !== undefined;
}

/** Thread border connector line */
function ThreadBorder(): JSX.Element {
  return (
    <div
      class="absolute left-[calc(0.5rem+1px)] w-[1px] border-l border-edge-muted -top-0.75"
      style={{ height: '6px' }}
    />
  );
}

/** Collapsible list row wrapper */
function CollapsibleListRow(
  props: ParentProps<{
    onClick?: (e: MouseEvent) => void;
    showThreadBorder?: boolean;
    blockNavigation?: boolean;
  }>
): JSX.Element {
  return (
    <div
      class="relative flex gap-1 items-center min-w-0 h-8 transition-all hover:bg-hover/50 hover:opacity-85"
      onClick={(e) => {
        if (props.blockNavigation) {
          e.stopPropagation();
        }
        props.onClick?.(e);
      }}
      data-blocks-navigation={props.blockNavigation}
    >
      <Show when={props.showThreadBorder}>
        <ThreadBorder />
      </Show>
      {props.children}
    </div>
  );
}

/** Generic content hit display */
function GenericContentHit(props: { data: ContentHitData }): JSX.Element {
  return (
    <div class="text-sm text-ink-muted truncate flex items-center">
      <StaticMarkdown
        markdown={props.data.content}
        theme={unifiedListMarkdownTheme}
        singleLine={true}
      />
    </div>
  );
}

/** Channel message content hit */
function ChannelMessageContentHit(props: {
  data: ChannelContentHitData;
}): JSX.Element {
  const [userName] = useDisplayName(tryMacroId(props.data.senderId));

  return (
    <div class="flex gap-2 items-center min-w-0">
      <div class="flex size-5 shrink-0 items-center justify-center">
        <UserIcon id={props.data.senderId} size="xs" />
      </div>
      <div class="flex gap-2 text-sm w-full min-w-0 overflow-hidden items-baseline">
        <div class="text-sm shrink-0 truncate min-w-0 font-medium">
          {userName()}
        </div>
        <div class="shrink-0 font-mono text-xs uppercase text-ink-extra-muted">
          {formatTimestamp(props.data.sentAt)}
        </div>
        <div class="text-sm text-ink-muted truncate flex items-center flex-1 min-w-0">
          <StaticMarkdown
            markdown={props.data.content}
            theme={unifiedListMarkdownTheme}
            singleLine={true}
          />
        </div>
      </div>
    </div>
  );
}

/** Email message content hit */
function EmailMessageContentHit(props: {
  allData: EmailContentHitData[];
  data: EmailContentHitData;
}): JSX.Element {
  const isSingleMatch = () => props.allData.length === 1;
  const isSingleSender = () => {
    const senders = props.allData.map((d) => d.sender);
    return senders.length === 1 || new Set(senders).size === 1;
  };
  const isSingleSentAt = () => {
    const sentAts = props.allData.map((d) => d.sentAt);
    if (sentAts.length === 1) return true;
    if (new Set(sentAts).size === 1) return true;
    const formattedDates = sentAts.map(formatTimestamp);
    return new Set(formattedDates).size === 1;
  };

  return (
    <div class="flex gap-2 items-center min-w-0">
      <div class="flex size-5 shrink-0 items-center justify-center">
        <UserIcon id={props.data.senderId} size="xs" />
      </div>
      <div class="flex gap-2 text-sm w-full min-w-0 overflow-hidden items-baseline">
        <Show when={!isSingleMatch() && !isSingleSender()}>
          <div class="text-sm shrink-0 truncate min-w-0 font-medium">
            {props.data.sender}
          </div>
        </Show>
        <Show when={!isSingleMatch() && !isSingleSentAt()}>
          <div class="shrink-0 font-mono text-xs uppercase text-ink-extra-muted">
            {formatTimestamp(props.data.sentAt)}
          </div>
        </Show>
        <div class="text-sm text-ink-muted truncate flex items-center flex-1 min-w-0">
          <StaticMarkdown
            markdown={props.data.content}
            theme={unifiedListMarkdownTheme}
            singleLine={true}
          />
        </div>
      </div>
    </div>
  );
}

/** Content hit row component */
function ContentHitRow(props: {
  allData: ContentHitData[];
  data: ContentHitData;
  onClick: (e: MouseEvent, location?: SearchLocation) => void;
  index?: number;
  count?: number;
}): JSX.Element {
  const match = (): [number, number] | undefined => {
    if (props.index !== undefined && props.count !== undefined)
      return [props.index, props.count];
  };

  return (
    <CollapsibleListRow
      blockNavigation
      onClick={(e) => props.onClick(e, props.data.location)}
      showThreadBorder={props.data.type === 'channel'}
    >
      <Switch>
        <Match when={props.data.type === 'channel' && props.data}>
          {(data) => (
            <ChannelMessageContentHit data={data() as ChannelContentHitData} />
          )}
        </Match>
        <Match when={props.data.type === 'email' && props.data}>
          {(data) => (
            <EmailMessageContentHit
              allData={props.allData as EmailContentHitData[]}
              data={data() as EmailContentHitData}
            />
          )}
        </Match>
        <Match when={true}>
          <div class="flex gap-2 items-center min-w-0 w-full">
            <div class="flex size-5 shrink-0 items-center justify-center">
              <div class="h-4/5 border-l border-b w-2 border-edge-muted -translate-y-2 translate-x-[calc(0.25em-1px)]" />
            </div>
            <Show when={match()}>
              {(m) => (
                <span class="font-mono text-xs text-ink-disabled/50">
                  {m()[0] + 1}/{m()[1]}
                </span>
              )}
            </Show>
            <GenericContentHit data={props.data} />
          </div>
        </Match>
      </Switch>
    </CollapsibleListRow>
  );
}

/** Search hits slot component */
export function SearchHitsSlot<T extends EntityData>(
  props: SlotProps<T> & SearchHitsSlotConfig
): JSX.Element {
  const [showAll, setShowAll] = createSignal(false);

  const contentHitData = () => {
    if (!isSearchEntity(props.entity)) return [];
    return props.entity.search.contentHitData ?? [];
  };

  const visibleCount = () => props.maxVisible ?? 1;
  const visibleItems = () => {
    const items = contentHitData();
    if (items.length <= visibleCount() || showAll()) {
      return items;
    }
    return items.slice(0, visibleCount());
  };

  const hasMore = () => contentHitData().length > visibleCount();

  return (
    <Show when={props.searchActive && contentHitData().length > 0}>
      <div class="relative row-2 col-2 col-end-4 pb-2 @max-md/split:row-auto @max-md/split:col-auto @max-md/split:w-full @max-md/split:mt-1">
        <For each={visibleItems()}>
          {(data, index) => (
            <ContentHitRow
              allData={contentHitData()}
              data={data}
              onClick={(e, location) => {
                props.onClick?.({
                  type: 'entity',
                  entity: props.entity,
                  event: e,
                  location,
                });
              }}
              index={index()}
              count={contentHitData().length}
            />
          )}
        </For>
        <Show when={hasMore()}>
          <div class="h-5">
            <Show when={props.showThreadBorder}>
              <ThreadBorder />
            </Show>
            <button
              class="block w-fit px-2 py-0.5 text-[10px] border border-edge uppercase font-mono hover:font-medium"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll((prev) => !prev);
              }}
              data-blocks-navigation
            >
              <Show when={!showAll()} fallback={<>Collapse</>}>
                + {contentHitData().length - visibleCount()} More
              </Show>
            </button>
          </div>
        </Show>
      </div>
    </Show>
  );
}

/** Factory function to create search hits slot renderer */
export function createSearchHitsSlot<T extends EntityData>(
  config: SearchHitsSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <SearchHitsSlot
      {...props}
      maxVisible={config.maxVisible ?? 1}
      showThreadBorder={config.showThreadBorder ?? true}
      onClick={config.onClick}
    />
  );
}
