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
// dropdown. Some categories layer an extra refinement on the index — the
// soup channels sidebar splits the same `channels` index into "People" (DMs)
// and "Teams" (non-DMs) the same way.
//
// Note: the search backend doesn't honor channelType filters yet (the
// soup→search arg conversion drops them); these refinements are correct in
// the soup model and will start filtering once the backend supports it.
const CATEGORY_TO_INDEX: Partial<Record<CategoryFilter, string>> = {
  channels: 'channels',
  dms: 'channels',
  documents: 'document-or-file',
  tasks: 'task',
  chats: 'agent',
};

type Refinement = { include?: FieldFilters; exclude?: FieldFilters };

const DM_TYPE: FieldFilters = { channelType: ['direct_message'] };

const CATEGORY_REFINEMENTS: Partial<Record<CategoryFilter, Refinement>> = {
  channels: { exclude: DM_TYPE },
  dms: { include: DM_TYPE },
};

function applyRefinement(base: Query, refinement: Refinement): Query {
  return {
    ...base,
    include: refinement.include
      ? { ...base.include, ...refinement.include }
      : base.include,
    exclude: refinement.exclude
      ? { ...base.exclude, ...refinement.exclude }
      : base.exclude,
  };
}

export function getCategorySearchFilters(
  category: CategoryFilter
): CategorySearchFilters | undefined {
  const indexValue = CATEGORY_TO_INDEX[category];
  if (!indexValue) return undefined;
  const option = INDEX_OPTIONS.find((o) => o.value === indexValue);
  if (!option) return undefined;

  const refinement = CATEGORY_REFINEMENTS[category];
  const filters = refinement
    ? applyRefinement(option.queryFilters, refinement)
    : option.queryFilters;

  return {
    filters,
    clientFilters: { or: [indexValue] },
  };
}
