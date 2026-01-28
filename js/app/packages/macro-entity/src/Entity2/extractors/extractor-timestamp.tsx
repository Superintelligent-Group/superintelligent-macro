import { format, isToday, isSameYear, fromUnixTime } from 'date-fns';
import type { EntityData } from '../../types/entity';

/**
 * Formats a timestamp into a human-readable string.
 * - Today: Shows time (e.g., "2:30 PM")
 * - Same year: Shows month and day (e.g., "Jan 27")
 * - Older: Shows full date (e.g., "1/27/24")
 */
export function formatTimestamp(timestamp: number): string {
  const date = timestamp < 1e12 ? fromUnixTime(timestamp) : new Date(timestamp);

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }

  if (isSameYear(date, new Date())) {
    return format(date, 'MMM d');
  }

  return format(date, 'M/d/yy');
}

export interface TimestampData {
  formatted: string;
  raw: number;
}

export function ExtractorTimestamp(props: {
  entity: EntityData;
  overrideTimeStamp?: number;
}) {
  const timestamp = () =>
    props.overrideTimeStamp ?? props.entity.updatedAt ?? Date.now();
  return <>{formatTimestamp(timestamp())}</>;
}
