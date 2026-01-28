import { Entity2 as Entity } from '../Entity2';
import type { EntityData } from '../types/entity';
import type { GridParams } from '../Entity2/utils/grid';
import { UnreadIndicator } from '../Entity2/components/UnreadIndicator';
import type { Ref } from 'solid-js';
import type { WithNotification } from '../types/notification';
import { unreadFilterFn } from '../utils/filter';
import { MultiSelectCheckbox } from '../Entity2/components/MutliSelectCheckbox';
import { cn } from '@ui/utils/classname';

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

  return (
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
          <Entity.Title entity={props.entity} />
        </Entity.Slot>

        <Entity.Slot
          placement="timestamp"
          class="text-xs font-mono text-right text-ink-extra-muted uppercase font-light"
        >
          <Entity.Timestamp entity={props.entity} />
        </Entity.Slot>
      </Entity.Layout>
    </Entity.Root>
  );
}
