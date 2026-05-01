import { INDEX_OPTIONS } from '@app/component/next-soup/soup-view/filters-bar/search-filter-controls';
import type {
  FieldFilters,
  Query,
} from '@app/component/next-soup/filters/filter-store/types';
import type { SetPredicatesInput } from '@app/component/next-soup/filters/filter-store/predicates-store';
import type { CategoryFilter } from './types';

export type CategorySearchFilters = {
  filters: Query;
  clientFilters: SetPredicatesInput<string>;
};

// Each Cmd+K category maps to a search-view INDEX_OPTIONS value so the
// resulting Type: chip behaves the same as one picked from the filter
// dropdown. Categories that need a sub-refinement on top of the index (e.g.
// DMs/People narrow the Channels index to direct messages) supply an extra
// include filter in CATEGORY_INCLUDE_REFINEMENTS.
const CATEGORY_TO_INDEX: Partial<Record<CategoryFilter, string>> = {
  channels: 'channels',
  dms: 'channels',
  documents: 'document-or-file',
  tasks: 'task',
  chats: 'agent',
  people: 'channels',
};

const CATEGORY_INCLUDE_REFINEMENTS: Partial<Record<CategoryFilter, FieldFilters>> = {
  dms: { channelType: ['direct_message'] },
  people: { channelType: ['direct_message'] },
};

export function getCategorySearchFilters(
  category: CategoryFilter
): CategorySearchFilters | undefined {
  const indexValue = CATEGORY_TO_INDEX[category];
  if (!indexValue) return undefined;
  const option = INDEX_OPTIONS.find((o) => o.value === indexValue);
  if (!option) return undefined;

  const refinement = CATEGORY_INCLUDE_REFINEMENTS[category];
  const filters: Query = refinement
    ? {
        ...option.queryFilters,
        include: { ...option.queryFilters.include, ...refinement },
      }
    : option.queryFilters;

  return {
    filters,
    clientFilters: { or: [indexValue] },
  };
}
