import type { ParentProps } from 'solid-js';
import { Show } from 'solid-js';
import { UserIcon } from 'core/component/UserIcon';
import { cn } from '@ui/utils/classname';

function Badge(props: ParentProps<{ class?: string }>) {
  return (
    <div
      class={cn(
        'font-mono font-medium user-select-none uppercase flex items-center p-0.5 gap-1 text-[0.625rem] rounded-full border',
        props.class
      )}
    >
      {props.children}
    </div>
  );
}

export function SharedBadge(props: { ownerId: string }) {
  return (
    <Badge class="text-ink-extra-muted border-edge-muted pr-2">
      <UserIcon id={props.ownerId} size="xs" />
      shared
    </Badge>
  );
}

export function DraftBadge() {
  return <Badge class="text-accent-30 border-edge-muted px-2">DRAFT</Badge>;
}

export function ImportantBadge(props: { active?: boolean }) {
  return (
    <Show when={props.active}>
      <Badge class="text-accent bg-accent/10 px-2 border-accent/10">
        important
      </Badge>
    </Show>
  );
}
