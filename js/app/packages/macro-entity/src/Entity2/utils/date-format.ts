/**
 * Formats a timestamp for display in the entity list
 * - Today: shows time (e.g., "10:30 AM")
 * - This year: shows month and day (e.g., "Jan 15")
 * - Older: shows numeric date (e.g., "1/15/23")
 */

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function formatTimestamp(timestamp: number): string {
  // Handle both seconds and milliseconds timestamps
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;

  const date = new Date(ts);
  const now = new Date();

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
