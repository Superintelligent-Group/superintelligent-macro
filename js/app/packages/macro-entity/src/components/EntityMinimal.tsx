import { Entity2 as Entity } from '../Entity2';
import {
  isChannelEntity,
  isEmailEntity,
  isProjectContainedEntity,
  type ProjectEntity,
  type EntityData,
} from '../types/entity';
import type { GridParams } from '../Entity2/utils/grid';
import { UnreadIndicator } from '../Entity2/components/UnreadIndicator';
import { Match, Show, Switch, type Ref } from 'solid-js';
import {
  isWithNotification,
  type WithNotification,
} from '../types/notification';
import { unreadFilterFn } from '../utils/filter';
import { MultiSelectCheckbox } from '../Entity2/components/MutliSelectCheckbox';
import { cn } from '@ui/utils/classname';
import { DraftBadge, SharedBadge } from '../Entity2/components/Badges';
import { DisplayName } from '../Entity2/components/DisplayName';
import { StaticMarkdown } from '@core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from '@core/component/LexicalMarkdown/theme';
import { useIsShared } from '../Entity2/utils/shared';
import { ProjectBreadCrumb } from '../Entity2/components/ProjectBreadCrumb';
import {
  filterNotDoneNotifications,
  filterValidNotifications,
} from '../Entity2/utils/notification-display';
import { isSearchEntity } from '../queries/search';
import type { SearchLocation } from '../types/search';

interface EntityMinimalProps {
  entity: WithNotification<EntityData>;
  onClick?: (event: MouseEvent) => void;
  timestamp?: number;
  ref?: Ref<HTMLDivElement>;
  checked?: boolean;
  highlighted?: boolean;
  onChecked?: (checked: boolean, shiftKey: boolean) => void;
  onMouseOver?: () => void;
  onMouseLeave?: () => void;
  showUnrollNotifications?: boolean;
  onProjectClick?: (
    entity: ProjectEntity,
    e: PointerEvent | MouseEvent
  ) => void;
  onContentHitClick?: (location?: SearchLocation) => void;
}

export function EntityMinimal(props: EntityMinimalProps) {
  const grid: GridParams = {
    columns: {
      indicator: '1rem',
      content: '1fr',
      meta: 'fit-content(10rem)',
      timestamp: '8ch',
    },
    layout: ['indicator', 'content', 'meta', 'timestamp'],
  };

  const unread = () => unreadFilterFn(props.entity);
  const isShared = useIsShared(props.entity);

  const hasNotifications = () => {
    if (!props.showUnrollNotifications) return false;
    if (!isWithNotification(props.entity)) return false;
    return (
      filterNotDoneNotifications(
        filterValidNotifications(props.entity.notifications?.())
      ).length > 0
    );
  };

  const showUnrolled = () => hasNotifications();

  return (
    <Entity.Root
      entity={props.entity}
      onClick={props.onClick}
      ref={props.ref}
      class={cn('w-full min-h-10 relative', {
        'bg-accent/5': props.checked,
        'outline outline-accent/20 outline-offset-[-1px]': props.highlighted,
        'bg-hover/20': props.highlighted && !props.checked,
      })}
      onMouseOver={props.onMouseOver}
      onMouseLeave={props.onMouseLeave}
    >
      <div
        class={cn('absolute h-full w-[2px] left-0 top-0 bg-accent opacity-0', {
          'opacity-100': props.highlighted,
        })}
      ></div>
      <Entity.Layout
        class={cn('gap-2 w-full min-h-[inherit] items-center text-sm px-2')}
        grid={grid}
      >
        <Entity.Slot placement="indicator" class="relative size-full group">
          <div class="absolute inset-0 grid place-items-center group-hover:opacity-0">
            <UnreadIndicator active={unread()} />
          </div>
          <div class="absolute inset-0 grid place-items-center">
            <MultiSelectCheckbox
              checked={props.checked}
              onChecked={props.onChecked}
            />
          </div>
        </Entity.Slot>

        <Entity.Slot
          placement="content"
          class="font-semibold truncate flex items-center gap-2"
        >
          <div class="size-4">
            <Entity.Icon entity={props.entity} />
          </div>
          <Switch>
            <Match when={isEmailEntity(props.entity) && props.entity}>
              {(entity) => (
                <>
                  <Show
                    when={!isSearchEntity(entity())}
                    fallback={
                      <>
                        <span class="truncate">
                          <Entity.Title entity={entity()} />
                        </span>
                        <span class="text-ink/50 font-medium truncate flex-1">
                          {entity().snippet}
                        </span>
                      </>
                    }
                  >
                    <span class="w-[20%] shrink-0 min-w-12 max-w-48 truncate flex gap-2">
                      <Show when={entity().isDraft}>
                        <DraftBadge />
                      </Show>
                      <Entity.EmailParticipants entity={entity()} />
                    </span>
                    <span class="truncate">
                      <Entity.Title entity={entity()} />
                    </span>
                    <span class="text-ink/50 font-medium truncate flex-1">
                      {entity().snippet}
                    </span>
                  </Show>
                </>
              )}
            </Match>
            <Match when={isChannelEntity(props.entity) && props.entity}>
              {(entity) => (
                <>
                  <span class="w-[20%] shrink-0 min-w-12 max-w-48 truncate flex gap-2">
                    <Entity.Title entity={entity()} />
                  </span>
                  <Show when={!showUnrolled() && entity().latestMessage}>
                    {(msg) => (
                      <>
                        <DisplayName id={msg().senderId} format="firstName" />
                        <span class="text-ink/50 font-medium truncate inline-flex items-center">
                          <StaticMarkdown
                            theme={unifiedListMarkdownTheme}
                            markdown={msg().content}
                            singleLine
                          />
                        </span>
                      </>
                    )}
                  </Show>
                </>
              )}
            </Match>
            <Match when={props.entity}>
              {(entity) => <Entity.Title entity={entity()} />}
            </Match>
          </Switch>
        </Entity.Slot>

        <Entity.Slot placement="meta" class="flex items-center gap-1">
          <Show when={isProjectContainedEntity(props.entity) && props.entity}>
            {(entity) => (
              <span class="text-ink-extra-muted text-xs">
                <ProjectBreadCrumb
                  entity={entity()}
                  onClick={props.onProjectClick}
                />
              </span>
            )}
          </Show>
          <Show when={isShared()}>
            <SharedBadge ownerId={props.entity.ownerId} />
          </Show>
        </Entity.Slot>

        <Entity.Slot
          placement="timestamp"
          class="text-xs font-mono text-right text-ink-extra-muted uppercase font-light"
        >
          <Show when={!showUnrolled()}>
            <Entity.Timestamp entity={props.entity} />
          </Show>
        </Entity.Slot>
      </Entity.Layout>

      <Show when={showUnrolled()}>
        <Entity.Layout
          class="gap-2 w-full h-full items-center text-sm px-2 pb-1 -mt-2"
          grid={grid}
        >
          <Entity.Slot placement={['content', 'timestamp']} class="ml-6">
            <Show
              when={
                isWithNotification(props.entity) &&
                !isSearchEntity(props.entity)
              }
            >
              <Entity.Notification.Stacks
                entity={props.entity}
                visibleCount={3}
              />
            </Show>
          </Entity.Slot>
        </Entity.Layout>
      </Show>

      <Show when={isSearchEntity(props.entity)}>
        <Entity.Layout
          class="gap-2 w-full h-full items-center text-sm px-2 pb-1 -mt-2"
          grid={grid}
        >
          <Entity.Slot placement={['content', 'timestamp']} class="ml-6">
            <Entity.Search.ContentHits
              entity={props.entity}
              onClick={props.onContentHitClick}
              visibleCount={1}
            />
          </Entity.Slot>
        </Entity.Layout>
      </Show>
    </Entity.Root>
  );
}
