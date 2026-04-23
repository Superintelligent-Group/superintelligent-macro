import { useGlobalNotificationSource } from '@app/component/GlobalAppState';
import {
  createSoupState,
  type SoupState,
} from '@app/component/next-soup/create-soup-state';
import { createSearchState } from '@app/component/next-soup/soup-view/create-search-state';
import { deduplicateEntities } from '@app/component/next-soup/utils';
import {
  isTaskEntity,
  isWithNotification,
  type EntityData,
  type TaskEntityWithProperties,
  type WithNotification,
  type WithSearch,
} from '@entity';
import { ENABLE_FEATURED_SEARCH_RESULTS } from '@core/constant/featureFlags';
import { useNotificationsForEntity } from '@notifications';
import {
  type SoupParams,
  useSoupItemsQuery,
  type SoupBody,
} from '@queries/soup/items';
import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  type FlowComponent,
  type JSX,
  on,
  type Setter,
  Suspense,
  useContext,
} from 'solid-js';
import { matchesTaskSubFilters } from './task-sub-filter-matcher';
import {
  GROUP_CONFIGS,
  type GroupOptionId,
} from '@app/component/next-soup/soup-view/group-options';
import { useQueryClient } from '@queries/client';
import { soupKeys } from '@queries/soup/keys';
import type { InfiniteData } from '@tanstack/solid-query';
import type { SoupPage } from '@service-storage/generated/schemas';

type GroupMeta = {
  id: string;
  value: unknown;
  label: string;
  count: number;
  isExpanded: () => boolean;
  toggle: () => void;
  renderHeader?: (props: {
    value: unknown;
    label: string;
    count: number;
  }) => JSX.Element;
};

type Row<T> = {
  original: T;
  id: string;
  depth: number;
  group?: GroupMeta;
  parentGroupId: string | null;
  isSelected: () => boolean;
  isExpanded: () => boolean;
  isGrouped: () => boolean;
  isFocused: () => boolean;
  toggleExpanded: (expanded?: boolean) => void;
};

export type SoupRow = Row<SoupEntity>;

export type SoupEntity = WithNotification<EntityData | WithSearch<EntityData>>;

type DataSource<T> = {
  data: Accessor<T[]>;
  isLoading: Accessor<boolean>;
  isFetching: Accessor<boolean>;
  isFetchingNextPage: Accessor<boolean>;
  hasNextPage: Accessor<boolean>;
  fetchNextPage: VoidFunction;
};

interface SoupViewContextValues {
  soup: SoupState;
  source: DataSource<EntityData>;
  searchText: Accessor<string>;
  setSearchText: (value: string) => void;
  searchPaused: Accessor<boolean>;
  setSearchPaused: Setter<boolean>;
  searchMentions: Accessor<string[]>;
  setSearchMentions: Setter<string[]>;
  featuredIds: Accessor<string[]>;
  rows: Accessor<SoupRow[]>;
  isSearchServiceLoading: Accessor<boolean>;
  isLocalSearchSettling: Accessor<boolean>;
  queryFilters: Accessor<SoupBody>;
  setQueryFilters: Setter<SoupBody>;
  assigneeFilter: Accessor<string[]>;
  setAssigneeFilter: Setter<string[]>;
  activeTab: Accessor<string | undefined>;
  setActiveTab: Setter<string | undefined>;
}

export const SoupViewContext = createContext<SoupViewContextValues>();

export const useSoupView = () => {
  const context = useContext(SoupViewContext);

  if (!context) {
    throw new Error(
      'useSoupView can only be used under a SoupViewContext.Provider'
    );
  }

  return context;
};

export const useMaybeSoupView = () => useContext(SoupViewContext);

interface SoupViewContextProviderProps {
  soup?: SoupState;
  queryFilters?: SoupBody;
  disableLocalSearch?: boolean;
  /**
   * Additional client-side entities to merge into the soup item stream.
   * Visibility is still controlled by the active client filters.
   */
  additionalEntities?: Accessor<EntityData[]>;
}

type ApiSortMethod = NonNullable<SoupParams['sort_method']>;
const VALID_API_SORT_METHODS: ApiSortMethod[] = [
  'viewed_at',
  'created_at',
  'updated_at',
  'viewed_updated',
];

export const SoupViewContextProvider: FlowComponent<
  SoupViewContextProviderProps
> = (props) => {
  const soup = props.soup ?? createSoupState();

  const queryClient = useQueryClient();

  const soupParams = createMemo((): SoupParams => {
    const sortId = soup.sort.active()[0]?.id ?? 'updated_at';

    // Client-only sorts (priority, status) fall back to created_at for the API
    const sortMethod = VALID_API_SORT_METHODS.includes(sortId as ApiSortMethod)
      ? (sortId as ApiSortMethod)
      : 'created_at';

    return {
      limit: 100,
      sort_method: sortMethod,
    };
  });

  const [internalQueryFilters, setInternalQueryFilters] =
    createSignal<SoupBody>({ ...(props.queryFilters ?? {}) });

  const [searchPaused, setSearchPaused] = createSignal(false);
  const [searchMentions, setSearchMentions] = createSignal<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = createSignal<string[]>([]);
  const [activeTab, setActiveTab] = createSignal<string | undefined>(undefined);

  // Clear sub-filters when task filter is deactivated
  createEffect(() => {
    if (!soup.filters.isActive('task')) {
      setAssigneeFilter([]);
    }
  });

  const queryFilters = createMemo(() => {
    const base = internalQueryFilters();

    return {
      ...base,
    };
  });

  const soupBody = createMemo(
    (): SoupBody => ({
      ...queryFilters(),
    })
  );

  const search = createSearchState({
    soup,
    queryFilters,
    disableLocalSearch: props.disableLocalSearch,
    searchPaused,
    searchMentions,
  });

  const notificationSource = useGlobalNotificationSource();

  const attachNotifications = (entity: EntityData) => {
    return {
      ...entity,
      notifications: useNotificationsForEntity(notificationSource, entity),
    };
  };

  const attachMethods = (
    entity: WithNotification<EntityData>,
    options: {
      depth?: number;
      group?: GroupMeta;
      parentGroupId?: string | null;
    } = {}
  ): SoupRow => {
    const { depth = 0, group, parentGroupId = null } = options;
    return {
      original: entity,
      id: entity.id,
      depth,
      group,
      parentGroupId,
      isFocused() {
        return soup.focus.id() === entity.id;
      },
      isSelected() {
        return soup.selection.isSelected(entity.id);
      },
      isGrouped() {
        return parentGroupId !== null;
      },
      isExpanded() {
        return soup.selection.isSelected(entity.id);
      },
      toggleExpanded() {
        return soup.selection.isSelected(entity.id);
      },
    };
  };

  const itemsQuery = useSoupItemsQuery(
    () => ({
      params: soupParams(),
      body: soupBody(),
    }),
    () => ({
      enabled: !search.isSearching(),
    })
  );

  const setQueryFilters: Setter<SoupBody> = (next) => {
    // To avoid fetching all pages again when coming back to the current query filters,
    // we set the query cache to only contain the first page of data which is the only
    // one to be refetched
    queryClient.setQueryData(
      soupKeys.items({
        params: soupParams(),
        body: soupBody(),
      }).queryKey,
      (prev: InfiniteData<SoupPage> | SoupPage) => {
        if (!prev) return;

        if ('pages' in prev) {
          // Just to avoid spreading and new array creation, works the same but slightly
          // better performance
          prev.pages.splice(1, prev.pages.length);
          return prev;
        }

        return prev;
      }
    );

    setInternalQueryFilters(next);
  };

  const items = createMemo<SoupEntity[]>(
    (prev) => {
      const searching = search.isSearching();

      if (!searching) {
        const data = itemsQuery.data;
        if (!data) return prev;
        const base = data.map((e) =>
          isWithNotification(e) ? e : attachNotifications(e)
        ) as SoupEntity[];
        const extras = props.additionalEntities?.() ?? [];
        if (extras.length === 0) return base;
        const extraEntities = extras.map((e) =>
          isWithNotification(e) ? e : attachNotifications(e)
        ) as SoupEntity[];
        return [...extraEntities, ...base];
      }

      const local = search.localFuzzyResults();
      const service = search.serviceSearchResults();

      const merged: SoupEntity[] = [...service, ...local];

      if (
        merged.length === 0 &&
        prev.length > 0 &&
        search.isLocalSearchSettling()
      ) {
        return prev;
      }

      for (let i = 0; i < merged.length; i++) {
        const entity = merged[i];
        if (entity.notifications) continue;
        merged[i] = attachNotifications(entity);
      }

      return merged;
    },
    [],
    {
      equals: false,
    }
  );

  const baseEntities = () => {
    let transformed = items();

    const next = [];

    const currentAssigneeFilter = assigneeFilter();

    for (const entity of transformed) {
      if (!soup.filters.test(entity)) {
        continue;
      }

      // Apply task sub-filters
      if (currentAssigneeFilter.length > 0 && isTaskEntity(entity)) {
        const taskEntity = entity as unknown as TaskEntityWithProperties;
        if (
          !matchesTaskSubFilters(taskEntity, {
            assigneeFilter: currentAssigneeFilter,
          })
        ) {
          continue;
        }
      }

      next.push(entity);
    }

    transformed = deduplicateEntities(next);

    const sorts = soup.sort.active();
    if (sorts.length > 0 && !search.isSearching()) {
      transformed.sort((a, b) => {
        for (const sort of sorts) {
          const result = sort.fn(a, b);
          if (result !== 0) return result;
        }
        return 0;
      });
    }

    return transformed;
  };

  const entities = () => {
    const base = baseEntities();
    if (!ENABLE_FEATURED_SEARCH_RESULTS || !search.isSearching()) return base;

    const featuredIds = search.featuredIds();
    if (featuredIds.length === 0) return base;

    const entityMap = new Map(base.map((e) => [e.id, e]));
    const featuredIdSet = new Set(featuredIds);
    const featured: SoupEntity[] = [];
    for (const id of featuredIds) {
      const e = entityMap.get(id);
      if (e) featured.push(e);
    }
    const rest = base.filter((e) => !featuredIdSet.has(e.id));
    return [...featured, ...rest];
  };

  const rows = createMemo(() => {
    const allEntities = entities();
    const groupId = soup.grouping.activeGroupId();

    if (!groupId || !(groupId in GROUP_CONFIGS)) {
      return allEntities.map((e) => attachMethods(e));
    }

    const config = GROUP_CONFIGS[groupId as GroupOptionId];
    const groupMap = new Map<unknown, SoupEntity[]>();
    const groupOrder: unknown[] = [];

    for (const entity of allEntities) {
      const value = config.getValue(entity);
      if (!groupMap.has(value)) {
        groupMap.set(value, []);
        groupOrder.push(value);
      }
      groupMap.get(value)!.push(entity);
    }

    const result: SoupRow[] = [];

    for (const groupValue of groupOrder) {
      const groupEntities = groupMap.get(groupValue)!;
      const groupIdStr = `group-${config.id}-${String(groupValue)}`;
      const label = config.getLabel
        ? config.getLabel(groupValue)
        : String(groupValue);

      const groupMeta: GroupMeta = {
        id: groupIdStr,
        value: groupValue,
        label,
        count: groupEntities.length,
        isExpanded: () => soup.grouping.isExpanded(groupIdStr),
        toggle: () => soup.grouping.toggle(groupIdStr),
        renderHeader: config.renderHeader,
      };

      const firstEntity = groupEntities[0];
      result.push(
        attachMethods(firstEntity, {
          group: groupMeta,
          parentGroupId: groupIdStr,
        })
      );

      if (soup.grouping.isExpanded(groupIdStr)) {
        for (let i = 1; i < groupEntities.length; i++) {
          result.push(
            attachMethods(groupEntities[i], {
              parentGroupId: groupIdStr,
            })
          );
        }
      }
    }

    return result;
  });

  const { searchQuery } = search;

  const context = {
    soup,
    source: {
      data: entities,
      isLoading: () => itemsQuery.isLoading,
      isFetching: () => itemsQuery.isFetching || searchQuery.isFetching,
      isFetchingNextPage: () =>
        itemsQuery.isFetchingNextPage || searchQuery.isFetchingNextPage,
      hasNextPage: () => {
        return (
          (itemsQuery.isEnabled && itemsQuery.hasNextPage) ||
          (searchQuery.isEnabled && searchQuery.hasNextPage)
        );
      },
      fetchNextPage: () => {
        if (itemsQuery.isEnabled) {
          itemsQuery.fetchNextPage();
        }
        if (searchQuery.isEnabled) {
          searchQuery.fetchNextPage();
        }
      },
    },
    rows,
    searchText: search.searchText,
    setSearchText: search.setSearchText,
    searchPaused,
    setSearchPaused,
    searchMentions,
    setSearchMentions,
    featuredIds: search.featuredIds,
    isSearchServiceLoading: search.isSearchServiceLoading,
    isLocalSearchSettling: search.isLocalSearchSettling,
    queryFilters,
    setQueryFilters,
    assigneeFilter,
    setAssigneeFilter,
    activeTab,
    setActiveTab,
  };

  return (
    <SoupViewContext.Provider value={context}>
      {props.children}
      <Suspense>
        <SyncWithSoup soup={soup} entities={entities()} />
      </Suspense>
    </SoupViewContext.Provider>
  );
};

interface SyncWithSoupProps {
  soup: SoupState;
  entities: SoupEntity[];
}

const SyncWithSoup = (props: SyncWithSoupProps) => {
  createRenderEffect(on(() => props.entities, props.soup.setData));

  return null;
};
