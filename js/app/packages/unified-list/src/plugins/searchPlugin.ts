/**
 * Search Plugin - local and remote search support.
 *
 * Design:
 * - Dual debounce: fast local (20ms), slow server (300ms)
 * - Local fuzzy search for immediate name-matching feedback
 * - Remote search for full-text/content search
 * - Search highlighting support
 *
 * Based on UnifiedListView pattern:
 * - LOCAL_FUZZY_SEARCH_DEBOUNCE_MS = 20  (immediate local filtering)
 * - SEARCH_SERVICE_DEBOUNCE_MS = 300     (server content search)
 */

import { createSignal, type Accessor, type Setter, createMemo } from 'solid-js';
import type { Plugin, CleanupFn, ListController } from '../types';
import { CommandPriority } from '../types';
import { ListCommands } from '../core/commands';
import { fuzzyMatch as coreUtilFuzzyMatch } from '@core/util/fuzzy';
import type { SearchData } from '@macro-entity';

// ============================================================================
// Search Constants
// ============================================================================

/** Fast local debounce for fuzzy name matching */
export const LOCAL_SEARCH_DEBOUNCE_MS = 20;

/** Slower server debounce for content search */
export const SERVER_SEARCH_DEBOUNCE_MS = 300;

/** Minimum characters before triggering server search */
export const MIN_SERVER_SEARCH_CHARS = 3;

// ============================================================================
// Search Types
// ============================================================================

/** Type for enhancing filter that filters AND adds search data */
export type EnhancingSearchFilter<T> = (
  items: T[]
) => (T & { search: SearchData })[];

export type SearchStore<T = unknown> = {
  /** Current search text (raw, no debounce) */
  searchText: Accessor<string>;
  /** Set search text */
  setSearchText: Setter<string>;
  /** Whether search is active (any text entered) */
  isActive: Accessor<boolean>;
  /** Whether we're waiting for remote results */
  isSearching: Accessor<boolean>;
  /** Set searching state */
  setIsSearching: Setter<boolean>;
  /** Debounced search text for local filtering (fast, 20ms) */
  localDebouncedText: Accessor<string>;
  /** Debounced search text for server search (slow, 300ms) */
  serverDebouncedText: Accessor<string>;
  /** Whether server search is valid (>= min chars, debounced) */
  isServerSearchActive: Accessor<boolean>;
  /** Legacy alias for serverDebouncedText */
  debouncedSearchText: Accessor<string>;
  /**
   * Enhancing search filter that filters AND enhances entities with search data.
   * Returns undefined when no search text (filter disabled).
   * Uses `fuzzyMatch` from @core/util/fuzzy for proper nameHighlight.
   */
  enhancingSearchFilter: Accessor<EnhancingSearchFilter<T> | undefined>;
  /**
   * Set the predicate that determines if server search is active.
   * Use this to disable server search when focus filters are active.
   */
  setIsServerSearchActiveOverride: (
    override: Accessor<boolean> | undefined
  ) => void;
};

export type DualDebounceConfig = {
  /** Local debounce time (default 20ms) */
  localDebounceMs?: number;
  /** Server debounce time (default 300ms) */
  serverDebounceMs?: number;
  /** Minimum chars for server search (default 3) */
  minServerSearchChars?: number;
};

export type SearchStoreConfig = DualDebounceConfig & {
  /** Enable enhancing filter using fuzzyMatch from @core/util/fuzzy */
  useNameFuzzySearch?: boolean;
};

/** Create search store with dual debounce */
export function createSearchStore<T>(
  config: SearchStoreConfig | DualDebounceConfig | number = {}
): SearchStore<T> {
  // Support legacy single number param
  const resolvedConfig =
    typeof config === 'number' ? { serverDebounceMs: config } : config;

  const {
    localDebounceMs = LOCAL_SEARCH_DEBOUNCE_MS,
    serverDebounceMs = SERVER_SEARCH_DEBOUNCE_MS,
    minServerSearchChars = MIN_SERVER_SEARCH_CHARS,
  } = resolvedConfig;

  const useNameFuzzySearch =
    'useNameFuzzySearch' in resolvedConfig
      ? resolvedConfig.useNameFuzzySearch
      : false;

  const [searchText, setSearchTextInternal] = createSignal<string>('');
  const [localDebouncedText, setLocalDebouncedText] = createSignal<string>('');
  const [serverDebouncedText, setServerDebouncedText] =
    createSignal<string>('');
  const [isSearching, setIsSearching] = createSignal<boolean>(false);

  // Override for isServerSearchActive (e.g., to disable when focus filters active)
  const [isServerSearchActiveOverride, setIsServerSearchActiveOverride] =
    createSignal<Accessor<boolean> | undefined>(undefined);

  // Debounce timeouts
  let localDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  let serverDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

  // Wrap setter with dual debounce logic
  const setSearchText: Setter<string> = (
    value: string | ((prev: string) => string)
  ) => {
    const newValue = typeof value === 'function' ? value(searchText()) : value;
    setSearchTextInternal(newValue);

    // Fast local debounce (20ms)
    if (localDebounceTimeout) {
      clearTimeout(localDebounceTimeout);
    }
    localDebounceTimeout = setTimeout(() => {
      setLocalDebouncedText(newValue);
    }, localDebounceMs);

    // Slow server debounce (300ms)
    if (serverDebounceTimeout) {
      clearTimeout(serverDebounceTimeout);
    }
    serverDebounceTimeout = setTimeout(() => {
      setServerDebouncedText(newValue);
    }, serverDebounceMs);

    return newValue;
  };

  const isActive = createMemo(() => searchText().length > 0);

  // Server search active: considers override if provided
  const isServerSearchActive = createMemo(() => {
    const override = isServerSearchActiveOverride();
    if (override) return override();
    return serverDebouncedText().trim().length >= minServerSearchChars;
  });

  // Enhancing search filter using fuzzyMatch from @core/util/fuzzy
  // Returns undefined when no search text, otherwise returns filter function
  const enhancingSearchFilter = createMemo(
    (): EnhancingSearchFilter<T> | undefined => {
      if (!useNameFuzzySearch) return undefined;
      const query = localDebouncedText();
      if (!query || query.length === 0) return undefined;

      return (items: T[]) => {
        // Extract name from items - requires T to have name property at runtime
        const getName = (item: T): string => {
          const name = (item as T & { name?: string }).name;
          return name ?? '';
        };

        const results = coreUtilFuzzyMatch(query, items, getName);
        return results.map((result) => ({
          ...result.item,
          search: {
            nameHighlight: result.nameHighlight,
            contentHitData: null,
            source: 'local' as const,
          },
        }));
      };
    }
  );

  return {
    searchText,
    setSearchText,
    isActive,
    isSearching,
    setIsSearching,
    localDebouncedText,
    serverDebouncedText,
    isServerSearchActive,
    enhancingSearchFilter,
    setIsServerSearchActiveOverride,
    // Legacy alias
    debouncedSearchText: serverDebouncedText,
  };
}

// ============================================================================
// Search Plugin Configuration
// ============================================================================

export type SearchPluginConfig<T> = SearchStoreConfig & {
  /** Local search filter function (simple boolean match) */
  localFilter?: (entity: T, searchText: string) => boolean;
  /** Callback when search text changes */
  onSearchChange?: (searchText: string) => void;
  /** Callback when remote search should be triggered */
  onRemoteSearch?: (searchText: string) => Promise<void>;
};

// ============================================================================
// Search Plugin Factory
// ============================================================================

/** Create a search plugin */
export function createSearchPlugin<T extends { id: string }>(
  config: SearchPluginConfig<T> = {}
): Plugin<T, ListController<T>> & { store: SearchStore<T> } {
  const {
    localDebounceMs,
    serverDebounceMs,
    minServerSearchChars,
    useNameFuzzySearch,
    localFilter: _localFilter,
    onSearchChange,
    onRemoteSearch: _onRemoteSearch,
  } = config;

  // Cast T to include 'name' for the search store - runtime checks will ensure it exists when needed
  const store = createSearchStore<T & { name?: string }>({
    localDebounceMs,
    serverDebounceMs,
    minServerSearchChars,
    useNameFuzzySearch,
  }) as unknown as SearchStore<T>;

  const plugin: Plugin<T, ListController<T>> = (
    controller: ListController<T>
  ): CleanupFn => {
    const cleanups: CleanupFn[] = [];

    // Register focus search command
    cleanups.push(
      controller.commands.register(
        ListCommands.FOCUS_SEARCH,
        () => {
          // This would be handled by the UI component
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    // Register clear search command
    cleanups.push(
      controller.commands.register(
        ListCommands.CLEAR_SEARCH,
        () => {
          store.setSearchText('');
          onSearchChange?.('');
          return true;
        },
        CommandPriority.NORMAL
      )
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  };

  return Object.assign(plugin, { store });
}

// ============================================================================
// Search Utilities
// ============================================================================

/** Simple fuzzy match implementation */
export function fuzzyMatch(text: string, query: string): boolean {
  if (query.length === 0) return true;
  if (text.length === 0) return false;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
}

/** Create a local search filter for entities */
export function createLocalSearchFilter<T extends { name: string }>(
  searchText: Accessor<string>
): (entity: T) => boolean {
  return (entity: T) => {
    const query = searchText();
    if (!query) return true;
    return fuzzyMatch(entity.name, query);
  };
}

/** Highlight matching text in a string */
export function highlightMatches(
  text: string,
  query: string,
  highlightTag = 'mark'
): string {
  if (!query) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let result = '';
  let lastIndex = 0;
  let queryIndex = 0;

  for (let i = 0; i < text.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      // Add non-matching text before this match
      if (i > lastIndex) {
        result += text.slice(lastIndex, i);
      }
      // Add matching character with highlight
      result += `<${highlightTag}>${text[i]}</${highlightTag}>`;
      lastIndex = i + 1;
      queryIndex++;
    }
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result += text.slice(lastIndex);
  }

  return result;
}

/** Create search result with highlight data */
export type SearchResult<T> = T & {
  searchHighlight?: {
    name?: string;
    content?: string;
  };
};

/** Enhance entity with search highlight data */
export function enhanceWithSearchHighlight<T extends { name: string }>(
  entity: T,
  query: string
): SearchResult<T> {
  if (!query) return entity;

  return {
    ...entity,
    searchHighlight: {
      name: highlightMatches(entity.name, query),
    },
  };
}
