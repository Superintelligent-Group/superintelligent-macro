/**
 * Timestamp Slot - Formatted date/time display.
 */

import { Show, type JSX } from 'solid-js';
import type { EntityData } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';

export type TimestampSlotConfig = {
  format?: 'relative' | 'absolute';
  timestampOverride?: number;
};

/** Format timestamp for display */
function formatTimestamp(timestamp: number): string {
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ts);
  const now = new Date();

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const dateDay = startOfDay(date);
  const todayDay = startOfDay(now);

  // Today → show time
  if (dateDay === todayDay) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Same year → show Month Day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  // Older → show numeric date
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
  });
}

/** Timestamp slot component */
export function TimestampSlot<T extends EntityData>(
  props: SlotProps<T> & TimestampSlotConfig
): JSX.Element {
  const timestamp = () => props.timestampOverride ?? props.entity.updatedAt;

  return (
    <Show when={timestamp()}>
      {(ts) => (
        <span class="w-[8ch] text-right shrink-0 whitespace-nowrap text-xs font-mono uppercase text-ink-extra-muted @max-md/uList:hidden">
          {formatTimestamp(ts())}
        </span>
      )}
    </Show>
  );
}

/** Factory function to create timestamp slot renderer */
export function createTimestampSlot<T extends EntityData>(
  config: TimestampSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <TimestampSlot
      {...props}
      format={config.format ?? 'relative'}
      timestampOverride={config.timestampOverride}
    />
  );
}

export { formatTimestamp };
