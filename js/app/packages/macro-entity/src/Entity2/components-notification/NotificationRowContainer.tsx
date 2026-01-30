import type { JSX } from 'solid-js';

interface NotificationRowSkeletonProps {
  icon: JSX.Element;
  content: JSX.Element;
  timestamp: JSX.Element;
}

export function NotificationRowContainer(props: NotificationRowSkeletonProps) {
  return (
    <div class="flex items-center gap-2 w-full">
      <div class="flex items-center gap-2 shrink-0">{props.icon}</div>
      <div class="flex grow items-center gap-2 min-w-0">{props.content}</div>
      <div class="shrink-0 font-mono text-xs uppercase text-ink-extra-muted">
        {props.timestamp}
      </div>
    </div>
  );
}
