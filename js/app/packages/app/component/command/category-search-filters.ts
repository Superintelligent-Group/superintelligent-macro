import {
  defineQueryFilters,
  NIL_UUID,
  type Query,
} from '@app/component/next-soup/filters/filter-store';
import type { SetPredicatesInput } from '@app/component/next-soup/filters/filter-store/predicates-store';
import type { CategoryFilter } from './types';

export type CategorySearchFilters = {
  filters: Query;
  clientFilters: SetPredicatesInput<string>;
};

// Mirrors the search view's INDEX_OPTIONS so the resulting Type: chip can be
// removed/replaced like any other.
const CATEGORY_FILTER_MAP: Partial<
  Record<CategoryFilter, CategorySearchFilters>
> = {
  channels: {
    filters: defineQueryFilters({ exclude: { channelId: [NIL_UUID] } }),
    clientFilters: { or: ['channels'] },
  },
  dms: {
    filters: defineQueryFilters({
      include: { channelType: ['direct_message'] },
      exclude: { channelId: [NIL_UUID] },
    }),
    clientFilters: { or: ['channels'] },
  },
  documents: {
    filters: defineQueryFilters({ exclude: { subType: ['task'] } }),
    clientFilters: { or: ['document-or-file'] },
  },
  tasks: {
    filters: defineQueryFilters({ include: { subType: ['task'] } }),
    clientFilters: { or: ['task'] },
  },
  chats: {
    filters: defineQueryFilters({ exclude: { chatId: [NIL_UUID] } }),
    clientFilters: { or: ['agent'] },
  },
  people: {
    filters: defineQueryFilters({
      include: { channelType: ['direct_message'] },
      exclude: { channelId: [NIL_UUID] },
    }),
    clientFilters: { or: ['channels'] },
  },
};

export function getCategorySearchFilters(
  category: CategoryFilter
): CategorySearchFilters | undefined {
  return CATEGORY_FILTER_MAP[category];
}
