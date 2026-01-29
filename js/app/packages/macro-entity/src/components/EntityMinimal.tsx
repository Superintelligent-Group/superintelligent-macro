import { Entity2 as Entity } from '../Entity2';
import type { EmailEntity, EntityData } from '../types/entity';
import type { GridParams } from '../Entity2/utils/grid';
import { UnreadIndicator } from '../Entity2/components/UnreadIndicator';
import { Show, createMemo, type Ref } from 'solid-js';
import type { WithNotification } from '../types/notification';
import { unreadFilterFn } from '../utils/filter';
import { MultiSelectCheckbox } from '../Entity2/components/MutliSelectCheckbox';
import { cn } from '@ui/utils/classname';
import { ExtractorEmailTitle } from '../Entity2/extractors/extractor-email-title';
import { EmailSubjectSnippet } from '../Entity2/components/EmailSubjectSnippet';
import { CollapsibleList } from '../Entity2/components/CollapsibleList';
import {
  StackedNotificationRenderer,
  type NotificationClickHandler,
  type StackedNotificationClickHandler,
} from '../Entity2/components/NotificationRow';
import {
  filterValidNotifications,
  filterNotDoneNotifications,
} from '../Entity2/utils/notification-display';
import { stackNotifications, getMostRecentNotification } from '@notifications';

// Sender column width - ensures consistent sizing across responsive contexts
export const SENDER_COLUMN_WIDTH = 'max(20cqw, 5rem)';

// interface EntityProps<T extends WithNotification<EntityData>>
//   extends ParentProps {
//   entity: T;
//   focused?: boolean;
//   timestamp?: number;
//   onClick?: EntityClickHandler<T>;
//   onDblClick?: EntityClickHandler<T>;
//   onPointerDown?: EntityClickHandler<T>;
//   onClickRowAction?: (entity: T, type: 'done') => void;
//   onClickNotification?: NotificationClickHandler<T>;
//   onMouseOver?: () => void;
//   onMouseLeave?: () => void;
//   onFocusIn?: () => void;
//   onContextMenu?: () => void;
//   properties?: Property[];
//   contentPlacement?: 'middle' | 'bottom-row';
//   unreadIndicatorActive?: boolean;
//   fadeIfRead?: boolean;
//   importantIndicatorActive?: boolean;
//   showLeftColumnIndicator?: boolean;
//   showUnrollNotifications?: boolean;
//   showDoneButton?: boolean;
//   highlighted?: boolean;
//   selected: { active: boolean; muted?: boolean };
//   ref?: Ref<HTMLDivElement>;
//   onChecked?: (checked: boolean, shiftKey?: boolean) => void;
//   checked?: boolean;
//   searchActive?: boolean;
//   splitId?: string;
// }

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
  onClickNotification?: NotificationClickHandler;
}

export function EntityMinimal(props: EntityMinimalProps) {
  const grid: GridParams = {
    columns: {
      indicator: '1rem',
      title: '1fr',
      content: '1fr',
      timestamp: '12ch',
    },
    layout: ['indicator', 'title', 'content', 'timestamp'],
  };
  const unread = () => unreadFilterFn(props.entity);

  // Process notifications
  const validNotifications = createMemo(() => {
    const notifications = props.entity.notifications?.();
    return filterValidNotifications(notifications);
  });

  const notDoneNotifications = createMemo(() =>
    filterNotDoneNotifications(validNotifications())
  );

  const stackedNotificationsGroups = createMemo(() =>
    stackNotifications(notDoneNotifications())
  );

  const hasNotifications = () =>
    props.showUnrollNotifications && stackedNotificationsGroups().length > 0;

  // Handler for stacked notification clicks
  const handleStackedNotificationClick: StackedNotificationClickHandler = (
    args
  ) => {
    if (!props.onClickNotification) return;

    // Navigate to the most recent notification in the stack
    const mostRecent = getMostRecentNotification(args.group);
    props.onClickNotification({
      type: 'entity',
      entity: {
        ...args.entity,
        notification: mostRecent,
      },
      event: args.event,
    });
  };

  return (
    <div class="w-full">
      <Entity.Root
        entity={props.entity}
        onClick={props.onClick}
        ref={props.ref}
        class={cn('w-full h-10', {
          'bg-accent/5': props.checked,
          'outline outline-accent/20 outline-offset-[-1px] bracket':
            props.highlighted,
          'bg-hover/20': props.highlighted && !props.checked,
        })}
        onMouseOver={props.onMouseOver}
        onMouseLeave={props.onMouseLeave}
      >
        <Entity.Layout
          class="gap-2 w-full h-full items-center text-sm px-2"
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
            class="font-semibold truncate flex items-center gap-2"
            placement={['title', 'content']}
          >
            <div class="size-4">
              <Entity.Icon entity={props.entity} />
            </div>
            <Show
              when={props.entity.type === 'email'}
              fallback={<Entity.Title entity={props.entity} />}
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <div class="truncate pr-2 w-[20%] min-w-12 max-w-48">
                  <ExtractorEmailTitle
                    entity={props.entity as WithNotification<EmailEntity>}
                  />
                </div>
                {/* Subject and snippet joined with dash */}
                <EmailSubjectSnippet
                  subject={
                    props.entity.type === 'email'
                      ? props.entity.name
                      : undefined
                  }
                  snippet={
                    props.entity.type === 'email'
                      ? props.entity.snippet
                      : undefined
                  }
                />
              </div>
            </Show>
          </Entity.Slot>

          <Entity.Slot
            placement="timestamp"
            class="text-xs font-mono text-right text-ink-extra-muted uppercase font-light"
          >
            <Entity.Timestamp entity={props.entity} />
          </Entity.Slot>
        </Entity.Layout>
      </Entity.Root>

      {/* Expandable notifications section */}
      <Show when={hasNotifications()}>
        <div class="relative w-full pl-8 pr-2 pb-2 @max-md/uList:pl-2">
          <CollapsibleList items={stackedNotificationsGroups()} threadBorder>
            {(group) => (
              <StackedNotificationRenderer
                group={group}
                onClick={props.onClickNotification}
                onClickStacked={handleStackedNotificationClick}
                entity={props.entity}
              />
            )}
          </CollapsibleList>
        </div>
      </Show>
    </div>
  );
}
