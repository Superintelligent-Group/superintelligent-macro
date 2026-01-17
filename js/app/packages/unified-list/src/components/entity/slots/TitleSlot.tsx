/**
 * Title Slot - Entity name with search highlighting and email-specific formatting.
 */

import { Show, createMemo, type JSX } from 'solid-js';
import type { EntityData, EmailEntity, WithSearch } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from '@core/component/LexicalMarkdown/theme';
import { useEmail } from '@service-gql/client';
import { emailToMacroId, tryMacroId, useDisplayName } from '@core/user';

export type TitleSlotConfig = {
  showSearchHighlight?: boolean;
};

/** Check if entity has search data */
function isSearchEntity(
  entity: EntityData | WithSearch<EntityData>
): entity is WithSearch<EntityData> {
  return 'search' in entity && entity.search !== undefined;
}

/** Email title component */
function EmailTitle(props: {
  entity: EmailEntity;
  searchActive: boolean;
  searchHighlightName?: string | null;
}): JSX.Element {
  const userEmail = useEmail();

  const isLikelyEmail = (value?: string) =>
    typeof value === 'string' && value.includes('@');

  const combinedParticipantNames = createMemo(() => {
    const me = userEmail();
    if (
      props.entity.participants?.length === 1 &&
      props.entity.participants?.[0].email === me
    ) {
      return ['me'];
    }
    const namesSet = new Set<string>();

    props.entity.participants?.forEach((participant) => {
      if (!participant.email) return;
      if (me && participant.email === me) return;
      const macroDisplayName = useDisplayName(
        emailToMacroId(participant.email)
      )[0]?.();
      const participantFullName = participant.name ?? '';
      if (macroDisplayName && !isLikelyEmail(macroDisplayName)) {
        namesSet.add(macroDisplayName);
      } else if (participantFullName && !isLikelyEmail(participantFullName)) {
        namesSet.add(participantFullName);
      } else {
        const emailName = participant.email.split('@')[0];
        namesSet.add(emailName);
      }
    });
    return Array.from(namesSet);
  });

  const displayedNames = () => {
    const names = combinedParticipantNames();
    if (!names || names.length === 0) return undefined;
    if (names.length === 1) return names[0];
    const firstNames = names.map((name) => name.split(' ')[0]);
    if (firstNames.length <= 3) return firstNames.join(', ');
    return `${firstNames[0]} .. ${firstNames[firstNames.length - 2]}, ${firstNames[firstNames.length - 1]}`;
  };

  return (
    <div class="flex gap-1 items-center text-sm min-w-0 w-full truncate overflow-hidden @max-md/uList:flex-col @max-md/uList:items-start @max-md/uList:gap-1 @max-md/uList:truncate-none">
      <div
        class="flex gap-2 items-center font-semibold shrink-0 @max-md/uList:w-full @max-md/uList:truncate"
        classList={{
          'w-[20cqw]': !props.searchActive,
        }}
      >
        <div class="truncate @max-md/uList:min-w-0">
          {displayedNames() ??
            props.entity.senderName ??
            props.entity.senderEmail?.split('@')[0]}
        </div>
      </div>
      <div class="flex items-center w-full gap-2 flex-1 min-w-0 @max-md/uList:flex-col @max-md/uList:items-start @max-md/uList:w-full @max-md/uList:gap-1">
        <div class="flex items-center gap-2 flex-1 min-w-0 @max-md/uList:w-full @max-md/uList:justify-between @max-md/uList:min-w-0">
          <div
            class="shrink-0 truncate @max-md/uList:min-w-0 @max-md/uList:flex-1"
            classList={{
              'font-regular text-ink-disabled': props.searchActive,
              'font-medium': !props.searchActive,
            }}
          >
            <Show when={props.searchActive}>
              <span class="@max-md/uList:hidden"> – </span>
            </Show>
            <Show
              when={props.searchActive && props.searchHighlightName}
              fallback={props.entity.name}
            >
              {(name) => (
                <StaticMarkdown
                  markdown={name()}
                  theme={unifiedListMarkdownTheme}
                  singleLine={true}
                />
              )}
            </Show>
          </div>
          <div class="truncate shrink grow opacity-60 @max-md/uList:hidden">
            {props.entity.snippet}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Non-email title component */
function StandardTitle(props: {
  entity: EntityData;
  searchActive: boolean;
  searchHighlightName?: string | null;
}): JSX.Element {
  return (
    <div class="flex gap-2 items-center min-w-0 w-fit max-w-full overflow-hidden @max-md/uList:flex-col @max-md/uList:items-start @max-md/uList:w-full @max-md/uList:gap-1">
      <span class="flex gap-1 truncate font-medium text-sm shrink-0 items-center @max-md/uList:w-full @max-md/uList:flex-col @max-md/uList:items-start @max-md/uList:gap-1">
        <div class="flex items-center gap-2 w-full @max-md/uList:justify-between @max-md/uList:min-w-0">
          <span class="font-semibold truncate @max-md/uList:min-w-0 @max-md/uList:flex-1">
            <Show
              when={props.searchActive && props.searchHighlightName}
              fallback={props.entity.name}
            >
              {(name) => (
                <StaticMarkdown
                  markdown={name()}
                  theme={unifiedListMarkdownTheme}
                  singleLine={true}
                />
              )}
            </Show>
          </span>
        </div>
      </span>
    </div>
  );
}

/** Title slot component */
export function TitleSlot<T extends EntityData>(
  props: SlotProps<T> & TitleSlotConfig
): JSX.Element {
  const searchHighlightName = () =>
    isSearchEntity(props.entity) ? props.entity.search.nameHighlight : null;

  const searchActive = () =>
    (props.showSearchHighlight ?? true) &&
    props.searchActive &&
    isSearchEntity(props.entity);

  return (
    <Show
      when={props.entity.type === 'email' && props.entity}
      fallback={
        <StandardTitle
          entity={props.entity}
          searchActive={searchActive()}
          searchHighlightName={searchHighlightName()}
        />
      }
    >
      {(emailEntity) => (
        <EmailTitle
          entity={emailEntity() as unknown as EmailEntity}
          searchActive={searchActive()}
          searchHighlightName={searchHighlightName()}
        />
      )}
    </Show>
  );
}

/** Factory function to create title slot renderer */
export function createTitleSlot<T extends EntityData>(
  config: TitleSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <TitleSlot
      {...props}
      showSearchHighlight={config.showSearchHighlight ?? true}
    />
  );
}
