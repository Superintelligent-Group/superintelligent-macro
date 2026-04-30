import type { Query } from '@app/component/next-soup/filters/filter-store/types';
import type { SetPredicatesInput } from '@app/component/next-soup/filters/filter-store/predicates-store';
import type { CategoryFilter } from './types';

export type CategorySearchFilters = {
  filters: Query;
  clientFilters: SetPredicatesInput<string>;
};

const CATEGORY_FILTER_MAP: Partial<Record<CategoryFilter, CategorySearchFilters>> = {
  channels: {
    filters: {},
    clientFilters: { and: ['channels'] },
  },
  dms: {
    filters: { include: { channelType: ['direct_message'] } },
    clientFilters: { and: ['people'] },
  },
  documents: {
    filters: { exclude: { subType: ['task'] } },
    clientFilters: { and: ['document-or-file'] },
  },
  tasks: {
    filters: { include: { subType: ['task'] } },
    clientFilters: { and: ['task'] },
  },
  chats: {
    filters: {},
    clientFilters: { and: ['agent'] },
  },
  people: {
    filters: { include: { channelType: ['direct_message'] } },
    clientFilters: { and: ['people'] },
  },
};

export function getCategorySearchFilters(
  category: CategoryFilter
): CategorySearchFilters | undefined {
  return CATEGORY_FILTER_MAP[category];
}
