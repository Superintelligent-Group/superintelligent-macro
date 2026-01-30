/**
 * Pure utility functions for handling search hit display logic
 */

import type { EmailContentHitData } from '../../types/search';

/**
 * Helper to format date for display
 */
const createFormattedDate = (timestamp: number) => {
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
};

/**
 * Check if all email hits are from the same sender
 */
export function isSingleSender(hits: EmailContentHitData[]): boolean {
  if (hits.length <= 1) return true;
  const senders = new Set(hits.map((d) => d.sender));
  return senders.size === 1;
}

/**
 * Check if all email hits have the same sent date (formatted)
 */
export function isSingleSentDate(hits: EmailContentHitData[]): boolean {
  if (hits.length <= 1) return true;
  const formattedDates = new Set(
    hits.map((d) => createFormattedDate(d.sentAt))
  );
  return formattedDates.size === 1;
}

/**
 * Determine if sender name should be shown for a specific hit
 * @param hits - All email content hits
 * @param isSingleHit - Whether there's only one hit total
 * @returns true if sender name should be displayed
 */
export function shouldShowSenderName(
  hits: EmailContentHitData[],
  isSingleHit: boolean
): boolean {
  return !isSingleHit && !isSingleSender(hits);
}

/**
 * Determine if sent date should be shown for a specific hit
 * @param hits - All email content hits
 * @param isSingleHit - Whether there's only one hit total
 * @returns true if sent date should be displayed
 */
export function shouldShowSentDate(
  hits: EmailContentHitData[],
  isSingleHit: boolean
): boolean {
  return !isSingleHit && !isSingleSentDate(hits);
}

/**
 * Format timestamp for display
 * Re-exported for use in components
 */
export { createFormattedDate };
