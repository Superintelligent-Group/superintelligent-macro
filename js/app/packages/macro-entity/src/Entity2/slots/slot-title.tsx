import { cn } from '@ui/utils/classname';
import { type JSX, splitProps } from 'solid-js';

export function SlotTitle(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <span class={cn('entity-slot-title', local.class)} {...rest}>
      {local.children}
    </span>
  );
}
