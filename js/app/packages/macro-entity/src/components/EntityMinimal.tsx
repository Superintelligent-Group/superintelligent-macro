import { Entity2 as Entity } from '../Entity2';
import type { EntityData } from '../types/entity';
import type { GridParams } from '../Entity2/utils/grid';
import { UnreadIndicator } from '../Entity2/components/UnreadIndicator';
import type { Ref } from 'solid-js';
import type { WithNotification } from '../types/notification';
import { hasUnreads } from '../Entity2/utils/notifications';
import { MultiSelectCheckbox } from '../Entity2/components/MutliSelectCheckbox';

interface EntityMinimalProps {
  entity: WithNotification<EntityData>;
  onClick?: (event: MouseEvent) => void;
  timestamp?: number;
  ref: Ref<HTMLDivElement>;
  checked?: boolean;
  onChecked?: (checked: boolean, shiftKey: boolean) => void;
}

export function EntityMinimal(props: EntityMinimalProps) {
  const grid: GridParams = {
    columns: {
      indicator: '1.5rem',
      title: '1fr',
      content: '1fr',
      timestamp: '12ch',
    },
    // layout: ['indicator', 'title', 'content', 'timestamp'],
  };
  const unread = () => hasUnreads(props.entity);

  return (
    <Entity.Root
      entity={props.entity}
      onClick={props.onClick}
      ref={props.ref}
      class="hover:bg-hover hover:ring hover:ring-accent/20 hover:bracket"
    >
      <Entity.Layout
        class="gap-2 w-full items-center text-sm py-2 px-1"
        grid={grid}
      >
        <Entity.Slot
          placement="indicator"
          class="relative size-full group/indicator"
        >
          <div class="absolute inset-0 grid place-items-center group-hover/indicator:opacity-0">
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
