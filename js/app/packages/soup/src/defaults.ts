/**
 * Default configuration for Soup.
 *
 * Single source of truth for all defaults.
 * Change values here to update defaults across the entire system.
 */

export type SortMethod = 'frecency' | 'updated_at' | 'created_at' | 'viewed_at';

export type EmailView =
  | 'all'
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'important'
  | 'starred'
  | 'other';

export const SOUP_DEFAULTS = {
  /** Default sort method */
  sortMethod: 'updated_at' as SortMethod,
  /** Default email view - 'all' shows all emails without inbox_visible filtering */
  emailView: 'all' as EmailView,
} as const;
