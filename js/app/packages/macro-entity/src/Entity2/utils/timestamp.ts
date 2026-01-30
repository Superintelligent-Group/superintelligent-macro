import { format, isToday, isSameYear, fromUnixTime } from 'date-fns';

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
