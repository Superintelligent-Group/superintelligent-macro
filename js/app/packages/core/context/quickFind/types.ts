import type { ChannelWithParticipants, IUser } from '@core/user';
import type { EmailEntity } from '@macro-entity';
import type { HistoryItem } from '@queries/history/history';
import type { Item } from '@service-storage/generated/schemas/item';

/**
 * Categories for quick find items.
 * These map to the buckets used in MentionsMenu.
 */
export type QuickFindCategory =
  | 'user'
  | 'channel'
  | 'dm'
  | 'document'
  | 'note'
  | 'task'
  | 'chat'
  | 'folder'
  | 'email';

/**
 * Unified quick find item that wraps different entity types.
 * Pre-computes search text and timestamps to avoid repeated transformations.
 */
export type QuickFindItem<T extends QuickFindCategory = QuickFindCategory> = {
  id: string;
  category: T;
  searchText: string;
  /** Unix timestamp for recency sorting (viewedAt or updatedAt) */
  timestamp: number;
  /** Secondary timestamp for sorting (updatedAt when viewedAt is primary) */
  updatedAt?: number;
  /** For user items: last DM interaction timestamp */
  lastInteraction?: number;
} & QuickFindData<T>;

type QuickFindDataMap = {
  user: IUser;
  channel: ChannelWithParticipants;
  dm: ChannelWithParticipants;
  email: EmailEntity;
  document: HistoryItem;
  note: HistoryItem;
  task: HistoryItem;
  chat: HistoryItem;
  folder: HistoryItem;
};

type QuickFindData<T extends QuickFindCategory> = {
  data: QuickFindDataMap[T];
};

/** Type guard for user items */
export function isUserItem(item: QuickFindItem): item is QuickFindItem<'user'> {
  return item.category === 'user';
}

/** Type guard for channel items (including DMs) */
export function isChannelItem(
  item: QuickFindItem
): item is QuickFindItem<'channel' | 'dm'> {
  return item.category === 'channel' || item.category === 'dm';
}

/** Type guard for email items */
export function isEmailItem(
  item: QuickFindItem
): item is QuickFindItem<'email'> {
  return item.category === 'email';
}

/** Type guard for history items (documents, notes, tasks, chats, folders) */
export function isHistoryItem(
  item: QuickFindItem
): item is QuickFindItem<'document' | 'note' | 'task' | 'chat' | 'folder'> {
  return ['document', 'note', 'task', 'chat', 'folder'].includes(item.category);
}

/**
 * Pre-computed collections for quick find.
 * These are memoized and only recompute when underlying data changes.
 */
export type QuickFindCollections = {
  /** All items across all categories */
  all: QuickFindItem[];
  /** Items grouped by category */
  byCategory: Map<QuickFindCategory, QuickFindItem[]>;

  // Convenience accessors for common use cases
  users: QuickFindItem<'user'>[];
  /** All channel types (channels + DMs) */
  channels: QuickFindItem<'channel' | 'dm'>[];
  /** History items (documents, notes, tasks, chats, folders) */
  items: QuickFindItem<'document' | 'note' | 'task' | 'chat' | 'folder'>[];
  emails: QuickFindItem<'email'>[];
};

/**
 * Entity format used by MentionsMenu.
 * Pre-computed in context so MentionsMenu doesn't need to map on render.
 */
type MentionEntityDataMap = {
  item: Item;
  user: IUser;
  channel: ChannelWithParticipants;
  email: EmailEntity;
};

export type MentionEntity<K extends keyof MentionEntityDataMap> = {
  kind: K;
  id: string;
  data: MentionEntityDataMap[K];
};

/** Pre-computed entities ready for MentionsMenu (no mapping/filtering needed) */
export type MentionEntities = {
  users: MentionEntity<'user'>[];
  items: MentionEntity<'item'>[];
  channels: MentionEntity<'channel'>[];
  emails: MentionEntity<'email'>[];
};

export type QuickFindContextValue = {
  /** Pre-computed collections of quick find items */
  collections: () => QuickFindCollections;
  /** Pre-computed entities in MentionsMenu format (no mapping needed) */
  mentionEntities: () => MentionEntities;
  /** Whether the underlying data is still loading */
  isLoading: () => boolean;
};
