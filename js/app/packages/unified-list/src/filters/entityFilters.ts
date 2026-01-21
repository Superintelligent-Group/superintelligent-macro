/**
 * Generic Entity Filter Predicates
 *
 * Pure functions that determine if an entity matches criteria.
 * These are generic filters used by the unified-list filter plugin.
 *
 * NOTE: Signal/Noise filters have been moved to @soup package.
 * Import them from '@soup' if you need signal/noise classification.
 *
 * NOTE: Entity type filters (documentFilter, taskFilter, etc.) have been
 * moved to @soup package. Import them from '@soup' if needed.
 */

import type { EntityData, WithNotification } from '@macro-entity';

type EnhancedEntity = WithNotification<EntityData>;

// ============================================================================
// Notification Filters
// ============================================================================

/**
 * Unread filter - entity has unread content.
 *
 * Entity-specific logic:
 * - Emails: Uses `isRead` boolean field
 * - Everything else: Has at least one notification with viewedAt === null
 */
export function unreadFilter(entity: EnhancedEntity): boolean {
  if (entity.type === 'email') {
    return !entity.isRead;
  }
  return entity.notifications?.()?.some((n) => !n.viewedAt) ?? false;
}

/**
 * NotDone filter - entity has outstanding items.
 *
 * Entity-specific logic:
 * - Emails: Uses `done` field (derived from !inboxVisible - email is "not done" when in inbox)
 * - Everything else: Has at least one notification with done === false
 */
export function notDoneFilter(entity: EnhancedEntity): boolean {
  if (entity.type === 'email') {
    return !entity.done;
  }
  return !!entity.notifications && entity.notifications().some((n) => !n.done);
}
