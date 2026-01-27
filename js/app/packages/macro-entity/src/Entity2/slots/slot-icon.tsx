import { cn } from '@ui/utils/classname';
import type { ParentProps } from 'solid-js';

interface EntitySlotIconProps extends ParentProps {
  class?: string;
}

export function SlotIcon(props: EntitySlotIconProps) {
  return (
    <div
      class={cn(
        'entity-slot-icon flex items-center justify-center shrink-0',
        props.class
      )}
    >
      {props.children}
    </div>
  );
}
