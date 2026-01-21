/**
 * Soup Query Hook - Server-side filtering with TanStack Query + Search Service.
 *
 * This handles:
 * - Building PostSoupRequest with proper filter mapping
 * - Server-side filtering via query params
 * - Search service integration for content search (>=3 chars)
 * - Client-side filtering for signal/noise
 * - Infinite scroll with proper fetch-more
 */

import { createMemo, type Accessor } from 'solid-js';
import {
  createDssInfiniteQuery,
  createUnifiedSearchInfiniteQuery,
  type EntityData,
  type WithSearch,
} from '@macro-entity';
import {
  useNotificationsForEntity,
  type NotificationSource,
} from '@notifications';
import type { PostSoupRequest } from '@service-storage/generated/schemas';
import type { SearchArgs } from '@service-search/client';
import type { UnifiedSearchIndex } from '@service-search/generated/models';
import type { EnhancedEntity } from '@unified-list/components/entity/types';
import { unreadFilter, notDoneFilter } from '@unified-list';
import type { EnhancingSearchFilter } from '@unified-list';
import { SOUP_DEFAULTS, type EmailView } from './defaults';
import { signalFilter, noiseFilter, explicitNoiseFilter } from './filters';
import {
  documentFilter,
  taskFilter,
  emailFilter,
  peopleFilter,
  teamsFilter,
  agentFilter,
  projectFilter,
  fileFilter,
} from './filterConfigs';

// NIL UUID used to exclude entity types from query
const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/** Re-export EmailView as EmailViewMode for backwards compatibility */
export type EmailViewMode = EmailView;

export type SoupQueryFilters = {
  /** Active filter IDs from the filter plugin */
  activeFilterIds: Accessor<Set<string>>;
  /** Server-side search text (debounced 300ms) - from search plugin store */
  serverSearchText?: Accessor<string>;
  /**
   * Enhancing search filter from search plugin store.
   * When provided, applies local fuzzy search with nameHighlight enhancement
   * to DSS results only (not to search service results which already have highlights).
   */
  enhancingSearchFilter?: Accessor<
    EnhancingSearchFilter<EnhancedEntity> | undefined
  >;
  /**
   * Whether server search is active - from search plugin store.
   * Should be true when: ≥3 chars AND no signal/noise filter.
   */
  isServerSearchActive?: Accessor<boolean>;
  /** Sort method - defaults to SOUP_DEFAULTS.sortMethod */
  sortMethod?: Accessor<'frecency' | 'updated_at' | 'created_at' | 'viewed_at'>;
  /** Email view mode */
  emailView?: Accessor<EmailViewMode>;
  /**
   * Notification source from global app state.
   * Used to enhance entities with notifications efficiently via the global cache.
   */
  notificationSource: NotificationSource;
};

export type SoupQueryResult = {
  /** Entities after server + client filtering */
  entities: Accessor<EnhancedEntity[]>;
  /** Loading state */
  isLoading: Accessor<boolean>;
  /** Whether there are more pages */
  hasMore: Accessor<boolean>;
  /** Fetch next page */
  fetchNextPage: () => void;
  /** Is fetching next page */
  isFetchingNextPage: Accessor<boolean>;
  /** Refetch */
  refetch: () => void;
};

// Type filter ID to predicate mapping
const TYPE_FILTER_MAP = new Map<
  string,
  (entity: EnhancedEntity) => boolean
>([
  ['document', documentFilter],
  ['task', taskFilter],
  ['email', emailFilter],
  ['people', peopleFilter],
  ['teams', teamsFilter],
  ['agent', agentFilter],
  ['project', projectFilter],
  ['file', fileFilter],
]);

// Type filters that affect server-side query (vs client-side filters like signal/noise/unread)
const TYPE_FILTERS = new Set(TYPE_FILTER_MAP.keys());

/** Extract only type filters from active filters set */
function getActiveTypeFilters(activeFilters: Set<string>): Set<string> {
  return new Set([...activeFilters].filter((f) => TYPE_FILTERS.has(f)));
}

/**
 * Build search service include array based on active filters.
 */
function buildSearchIncludeArray(
  activeFilters: Set<string>
): UnifiedSearchIndex[] {
  const activeTypeFilters = getActiveTypeFilters(activeFilters);

  // If no type filters, search all
  if (activeTypeFilters.size === 0) {
    return [];
  }

  const includeArray: UnifiedSearchIndex[] = [];

  if (
    activeTypeFilters.has('document') ||
    activeTypeFilters.has('task') ||
    activeTypeFilters.has('file')
  ) {
    includeArray.push('documents');
  }
  if (activeTypeFilters.has('agent')) {
    includeArray.push('chats');
  }
  if (activeTypeFilters.has('people') || activeTypeFilters.has('teams')) {
    includeArray.push('channels');
  }
  if (activeTypeFilters.has('email')) {
    includeArray.push('emails');
  }
  if (activeTypeFilters.has('project')) {
    includeArray.push('projects');
  }

  return Array.from(new Set(includeArray));
}

/**
 * Build PostSoupRequest based on active filters.
 *
 * IMPORTANT: Only TYPE filters affect the server query.
 * Focus filters (signal/noise) and notification filters (unread) are client-side only.
 *
 * Filters work by:
 * - Empty array [] = include all of that type
 * - [NIL_UUID] = exclude all of that type (impossible ID)
 */
function buildRequestBody(
  activeFilters: Set<string>,
  sortMethod: string,
  emailView?: string
): PostSoupRequest {
  const activeTypeFilters = getActiveTypeFilters(activeFilters);

  // Determine which entity types to include based on TYPE filters only
  const includeDocuments =
    activeTypeFilters.size === 0 ||
    activeTypeFilters.has('document') ||
    activeTypeFilters.has('task') ||
    activeTypeFilters.has('file');

  const includeEmails =
    activeTypeFilters.size === 0 || activeTypeFilters.has('email');

  const includeChannels =
    activeTypeFilters.size === 0 ||
    activeTypeFilters.has('people') ||
    activeTypeFilters.has('teams');

  const includeChats =
    activeTypeFilters.size === 0 || activeTypeFilters.has('agent');

  const includeProjects =
    activeTypeFilters.size === 0 || activeTypeFilters.has('project');

  // Build file type filter for documents
  let fileTypes: string[] | undefined;
  if (
    activeTypeFilters.has('document') &&
    !activeTypeFilters.has('task') &&
    !activeTypeFilters.has('file')
  ) {
    fileTypes = ['md', 'canvas'];
  } else if (
    activeTypeFilters.has('file') &&
    !activeTypeFilters.has('document')
  ) {
    // Non-md/canvas files
    fileTypes = undefined; // Will filter client-side
  }

  return {
    limit: 100,
    sort_method: sortMethod as PostSoupRequest['sort_method'],
    emailView: emailView as PostSoupRequest['emailView'],
    document_filters: {
      document_ids: includeDocuments ? [] : [NIL_UUID],
      file_types: fileTypes,
    },
    email_filters: {
      recipients: includeEmails ? [] : [NIL_UUID],
    },
    channel_filters: {
      channel_ids: includeChannels ? [] : [NIL_UUID],
    },
    chat_filters: {
      chat_ids: includeChats ? [] : [NIL_UUID],
    },
    project_filters: {
      project_ids: includeProjects ? [] : [NIL_UUID],
    },
  };
}

/**
 * Get client-side filter function based on active filters.
 *
 * Some filters must be applied client-side:
 * - Signal/Noise (requires email label inspection)
 * - Unread (requires notification data)
 * - People vs Teams (requires channelType)
 * - Tasks vs Documents (requires subType)
 *
 * Focus filter logic:
 * - signal active && !noise: show only signal items
 * - noise active && !signal: show only noise items
 * - neither active: hide explicit noise items (emails with depriority indicators)
 * - both active: show all items (unusual but supported)
 */
function getClientFilterFn(
  activeFilters: Set<string>
): (entity: EnhancedEntity) => boolean {
  const predicates: ((entity: EnhancedEntity) => boolean)[] = [];

  // Signal/Noise filters
  const hasSignalFilter = activeFilters.has('signal');
  const hasNoiseFilter = activeFilters.has('noise');

  if (hasSignalFilter && !hasNoiseFilter) {
    // Only signal active: show signal items that are not done
    predicates.push(signalFilter);
    predicates.push(notDoneFilter);
  } else if (hasNoiseFilter && !hasSignalFilter) {
    // Only noise active: show noise items that are not done
    predicates.push(noiseFilter);
    predicates.push(notDoneFilter);
  } else if (!hasSignalFilter && !hasNoiseFilter) {
    // Neither active: hide explicit noise items (emails with depriority indicators)
    predicates.push((entity) => !explicitNoiseFilter(entity));
  }
  // If both are active, show all items (unusual but supported)

  // Unread filter
  if (activeFilters.has('unread')) {
    predicates.push(unreadFilter);
  }

  // Type-specific filters - entity must match at least one active type filter
  const activeTypeFilters = getActiveTypeFilters(activeFilters);

  if (activeTypeFilters.size > 0) {
    predicates.push((entity) => {
      for (const filterId of activeTypeFilters) {
        const filterFn = TYPE_FILTER_MAP.get(filterId);
        if (filterFn?.(entity)) return true;
      }
      return false;
    });
  }

  if (predicates.length === 0) {
    return () => true;
  }

  return (entity) => predicates.every((pred) => pred(entity));
}

/**
 * Hook to fetch soup data with proper server + client filtering.
 *
 * Search behavior:
 * - When isServerSearchActive() is true (from search plugin store):
 *   - Search service is called for content search results
 *   - Results are merged with DSS results (search results take precedence for same entity)
 * - enhancingSearchFilter is applied to DSS results only (not search service results)
 */
export function useSoupQuery(filters: SoupQueryFilters): SoupQueryResult {
  const activeFilters = filters.activeFilterIds;
  const sortMethod = filters.sortMethod ?? (() => SOUP_DEFAULTS.sortMethod);
  const emailView = filters.emailView;
  const serverSearchText = filters.serverSearchText;
  const enhancingSearchFilter = filters.enhancingSearchFilter;
  const notificationSource = filters.notificationSource;

  // Server search active: provided by search plugin store (considers focus filters)
  const isServerSearchActive = filters.isServerSearchActive ?? (() => false);

  // Build DSS request body reactively
  // Default emailView to SOUP_DEFAULTS.emailView ('all') if not provided
  const requestBody = createMemo<PostSoupRequest>(() =>
    buildRequestBody(
      activeFilters(),
      sortMethod(),
      emailView?.() ?? SOUP_DEFAULTS.emailView
    )
  );

  // Build search query params
  const searchQueryParams = createMemo(
    (): SearchArgs => ({
      params: {
        cursor: null,
        page_size: 100,
      },
      request: {
        search_on: 'name_content',
        match_type: 'partial',
        terms:
          (serverSearchText?.() ?? '').length > 0
            ? [serverSearchText?.() ?? '']
            : undefined,
        filters: {
          document: null,
          chat: null,
          channel: null,
          email: null,
          project: null,
        },
        include: buildSearchIncludeArray(activeFilters()),
      },
    })
  );

  // Create DSS query
  const dssQuery = createDssInfiniteQuery(undefined, requestBody);

  // Create search query (disabled when not needed)
  const searchQuery = createUnifiedSearchInfiniteQuery(searchQueryParams, {
    disabled: createMemo(() => !isServerSearchActive()),
  });

  // Raw entities from server (with notification enhancement)
  // Merges DSS results with search results when search is active
  // Applies enhancingSearchFilter to DSS results only (search results already have highlights)
  const rawEntities = createMemo<EnhancedEntity[]>(() => {
    // Guard against suspense - only access data when not loading
    const dssLoading = dssQuery.isLoading || dssQuery.isPending;
    const searchLoading =
      isServerSearchActive() &&
      (searchQuery.isLoading || searchQuery.isPending);

    if (dssLoading) return [];

    const dssData = dssQuery.data ?? [];

    // Get the enhancing filter (may be undefined if no search text)
    const searchFilter = enhancingSearchFilter?.();

    // Helper to enhance entity with notifications
    const enhanceWithNotifications = (
      entity: EntityData | WithSearch<EntityData>
    ): EnhancedEntity => ({
      ...entity,
      notifications: useNotificationsForEntity(
        notificationSource,
        entity as EntityData
      ),
    });

    // If search is active and has results, merge them
    if (isServerSearchActive() && !searchLoading && searchQuery.data) {
      const searchData = searchQuery.data as WithSearch<EntityData>[];

      // Create a map of search results by ID (they include search highlight data)
      const searchMap = new Map<string, WithSearch<EntityData>>();
      for (const entity of searchData) {
        searchMap.set(entity.id, entity);
      }

      // Apply local fuzzy search to DSS entities that are NOT in search results
      // (Search results already have nameHighlight from server)
      const dssEntitiesNotInSearch = dssData.filter(
        (entity: EntityData) => !searchMap.has(entity.id)
      );

      // Apply enhancing filter to DSS-only entities if available
      const enhancedDssEntities = searchFilter
        ? searchFilter(
            dssEntitiesNotInSearch as unknown as EnhancedEntity[]
          ).map(enhanceWithNotifications)
        : dssEntitiesNotInSearch.map(enhanceWithNotifications);

      // Merge: search entities (have server highlights) + enhanced DSS entities
      const merged: EnhancedEntity[] = [
        // Search results with notifications
        ...searchData.map(enhanceWithNotifications),
        // DSS entities not in search (with local fuzzy highlights if filter active)
        ...enhancedDssEntities,
      ];

      return merged;
    }

    // No server search active - apply local fuzzy search filter to all DSS entities
    if (searchFilter) {
      return searchFilter(dssData as unknown as EnhancedEntity[]).map(
        enhanceWithNotifications
      );
    }

    // No search at all - just return DSS entities with notifications
    return dssData.map(enhanceWithNotifications);
  });

  // Get client filter function
  const clientFilterFn = createMemo(() => getClientFilterFn(activeFilters()));

  // Apply client-side filtering
  const entities = createMemo<EnhancedEntity[]>(() => {
    const raw = rawEntities();
    const filterFn = clientFilterFn();
    return raw.filter(filterFn);
  });

  // Query state accessors
  const isLoading = createMemo(
    () =>
      dssQuery.isLoading || (isServerSearchActive() && searchQuery.isLoading)
  );
  const hasMore = createMemo(() => dssQuery.hasNextPage ?? false);
  const isFetchingNextPage = createMemo(() => dssQuery.isFetchingNextPage);

  const fetchNextPage = () => {
    if (dssQuery.hasNextPage && !dssQuery.isFetchingNextPage) {
      dssQuery.fetchNextPage();
    }
  };

  const refetch = () => {
    dssQuery.refetch();
    if (isServerSearchActive()) {
      searchQuery.refetch();
    }
  };

  return {
    entities,
    isLoading,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  };
}
