/**
 * Example: Soup-like list using the unified-list package.
 *
 * This shows how to compose the unified-list primitives to create
 * a feature-rich entity list similar to the existing Soup component.
 */

import { onCleanup, Show, type JSX } from 'solid-js';
import type { EntityData } from '@macro-entity';

// Import from unified-list
import {
  // Factory
  createUnifiedListBuilder,
  // Filter utilities
  entityTypeFilter,
  createFilterGroup,
  negateFilter,
  // Sort utilities
  updatedAtSort,
  createdAtSort,
  viewedAtSort,
  frecencySort,
  // Search
  fuzzyMatch,
  // Actions
  createMarkDoneAction,
  // Components
  UnifiedList,
  createUnreadIndicatorSlot,
  createCheckboxSlot,
  createTimestampSlot,
  // Types
  type EntityRowConfig,
  type SlotRenderProps,
} from '../index';

// ============================================================================
// Filter Configuration
// ============================================================================

// Entity type filters
const documentFilter = entityTypeFilter<EntityData>('document', 'Documents', [
  'document',
]);
const emailFilter = entityTypeFilter<EntityData>('email', 'Emails', ['email']);
const channelFilter = entityTypeFilter<EntityData>('channel', 'Channels', [
  'channel',
]);
const projectFilter = entityTypeFilter<EntityData>('project', 'Projects', [
  'project',
]);
const chatFilter = entityTypeFilter<EntityData>('chat', 'Chats', ['chat']);

// Entity type filter group (mutually exclusive)
const entityTypeGroup = createFilterGroup(
  'entity-types',
  'Entity Types',
  ['document', 'email', 'channel', 'project', 'chat'],
  true // Allow multiple selections
);

// Signal/Noise filters (for email priority)
const signalFilter = {
  id: 'signal',
  label: 'Inbox',
  predicate: (entity: EntityData) => {
    if (entity.type === 'email') {
      return entity.isImportant || !entity.isRead;
    }
    // For non-email, show recently viewed items
    return entity.viewedAt !== undefined;
  },
  group: 'focus',
};

const noiseFilter = {
  id: 'noise',
  label: 'Other',
  predicate: negateFilter(signalFilter.predicate),
  group: 'focus',
};

// Focus filter group (mutually exclusive)
const focusGroup = createFilterGroup(
  'focus',
  'Focus',
  ['signal', 'noise'],
  false // Only one can be active
);

// Unread filter (can combine with others)
const unreadFilter = {
  id: 'unread',
  label: 'Unread',
  predicate: (entity: EntityData) => {
    if (entity.type === 'email') {
      return !entity.isRead;
    }
    // For other entities, check if there are unread notifications
    // This would come from the notification enhancement
    return false;
  },
};

// ============================================================================
// Sort Configuration
// ============================================================================

const sortConfigs = [
  updatedAtSort<EntityData>(),
  createdAtSort<EntityData>(),
  viewedAtSort<EntityData>(),
  frecencySort<EntityData>(),
];

// ============================================================================
// Entity Row Configuration
// ============================================================================

/** Create icon slot renderer */
function createIconSlot(): (props: SlotRenderProps<EntityData>) => JSX.Element {
  return (props) => {
    const entity = props.entity;
    const iconMap: Record<EntityData['type'], string> = {
      document: '📄',
      email: entity.type === 'email' && entity.isRead ? '📧' : '📬',
      channel: '💬',
      project: '📁',
      chat: '🗨️',
    };
    return <span class="text-lg">{iconMap[entity.type]}</span>;
  };
}

/** Create title slot renderer */
function createTitleSlot(): (
  props: SlotRenderProps<EntityData>
) => JSX.Element {
  return (props) => (
    <span class="font-medium truncate">{props.entity.name}</span>
  );
}

/** Create subtitle slot for emails */
function createSubtitleSlot(): (
  props: SlotRenderProps<EntityData>
) => JSX.Element | null {
  return (props) => {
    const entity = props.entity;
    if (entity.type === 'email' && entity.snippet) {
      return (
        <span class="text-ink-muted text-sm truncate">{entity.snippet}</span>
      );
    }
    if (entity.type === 'channel' && entity.latestMessage) {
      return (
        <span class="text-ink-muted text-sm truncate">
          {entity.latestMessage.content}
        </span>
      );
    }
    return null;
  };
}

// ============================================================================
// Example Component
// ============================================================================

export type SoupExampleProps = {
  /** Callback when an entity is opened */
  onOpenEntity?: (entity: EntityData) => void;
  /** Callback when entities are marked as done */
  onMarkDone?: (entities: EntityData[]) => Promise<void>;
};

/** Example Soup-like component using unified-list */
export function SoupExample(props: SoupExampleProps): JSX.Element {
  // Build the unified list with all features
  const listInstance = createUnifiedListBuilder<EntityData>('soup-example')
    .withFilters({
      filters: [
        documentFilter,
        emailFilter,
        channelFilter,
        projectFilter,
        chatFilter,
        signalFilter,
        noiseFilter,
        unreadFilter,
      ],
      groups: [entityTypeGroup, focusGroup],
    })
    .withSorts({
      sorts: sortConfigs,
      defaultSortId: 'updated_at',
      defaultOrder: 'descending',
    })
    .withNavigation({
      autoScroll: true,
      autoSelectFirst: true,
    })
    .withSelection({
      mode: 'multi',
    })
    .withHotkeys()
    .withSearch({
      localFilter: (entity, searchText) => fuzzyMatch(entity.name, searchText),
    })
    .withActions({
      actions: [
        createMarkDoneAction<EntityData>(async (entities) => {
          await props.onMarkDone?.(entities);
        }),
      ],
      onOpenEntity: props.onOpenEntity,
    })
    .build();

  // Cleanup on unmount
  onCleanup(() => {
    listInstance.cleanup();
  });

  const { controller, filterStore, sortStore, selectionStore, searchStore } =
    listInstance;

  // Create row configuration
  const rowConfig: EntityRowConfig<EntityData> = {
    slots: {
      indicator: createUnreadIndicatorSlot((entity) => {
        if (entity.type === 'email') return !entity.isRead;
        return false;
      }),
      checkbox: createCheckboxSlot(
        (entity) => selectionStore?.selectedIds().has(entity.id) ?? false,
        (entity) => {
          controller.commands.dispatch('unified-list:toggle-selection', {
            entityId: entity.id,
          });
        }
      ),
      icon: createIconSlot(),
      title: createTitleSlot(),
      subtitle: createSubtitleSlot(),
      timestamp: createTimestampSlot((entity) => entity.updatedAt),
    },
    height: 48,
    onClick: (entity) => {
      controller.setters.setFocusedId(entity.id);
    },
    onDoubleClick: (entity) => {
      props.onOpenEntity?.(entity);
    },
  };

  return (
    <div class="h-full flex flex-col">
      {/* Search bar */}
      <div class="p-4 border-b border-divider">
        <input
          type="text"
          placeholder="Search..."
          class="w-full px-3 py-2 rounded border border-divider bg-panel"
          value={searchStore?.searchText() ?? ''}
          onInput={(e) => searchStore?.setSearchText(e.currentTarget.value)}
        />
      </div>

      {/* Filter toolbar */}
      <div class="flex gap-2 p-2 border-b border-divider">
        {/* Focus filters */}
        <button
          class="px-3 py-1 rounded text-sm"
          classList={{
            'bg-accent text-white': filterStore
              ?.activeFilterIds()
              .has('signal'),
            'bg-panel': !filterStore?.activeFilterIds().has('signal'),
          }}
          onClick={() =>
            controller.commands.dispatch('unified-list:toggle-filter', {
              filterId: 'signal',
            })
          }
        >
          Inbox
        </button>
        <button
          class="px-3 py-1 rounded text-sm"
          classList={{
            'bg-accent text-white': filterStore?.activeFilterIds().has('noise'),
            'bg-panel': !filterStore?.activeFilterIds().has('noise'),
          }}
          onClick={() =>
            controller.commands.dispatch('unified-list:toggle-filter', {
              filterId: 'noise',
            })
          }
        >
          Other
        </button>

        <div class="w-px bg-divider mx-2" />

        {/* Unread filter */}
        <button
          class="px-3 py-1 rounded text-sm"
          classList={{
            'bg-accent text-white': filterStore
              ?.activeFilterIds()
              .has('unread'),
            'bg-panel': !filterStore?.activeFilterIds().has('unread'),
          }}
          onClick={() =>
            controller.commands.dispatch('unified-list:toggle-filter', {
              filterId: 'unread',
            })
          }
        >
          Unread
        </button>
      </div>

      {/* Entity type filters */}
      <div class="flex gap-2 p-2 border-b border-divider flex-wrap">
        {['document', 'email', 'channel', 'project', 'chat'].map((type) => (
          <button
            class="px-3 py-1 rounded text-sm"
            classList={{
              'bg-accent text-white': filterStore?.activeFilterIds().has(type),
              'bg-panel': !filterStore?.activeFilterIds().has(type),
            }}
            onClick={() =>
              controller.commands.dispatch('unified-list:toggle-filter', {
                filterId: type,
              })
            }
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}s
          </button>
        ))}
      </div>

      {/* Selection toolbar */}
      <Show when={(selectionStore?.selectedIds().size ?? 0) > 0}>
        <div class="flex items-center gap-4 p-2 bg-accent/10 border-b border-divider">
          <span class="text-sm">
            {selectionStore?.selectedIds().size} selected
          </span>
          <button
            class="px-3 py-1 rounded text-sm bg-accent text-white"
            onClick={() =>
              controller.commands.dispatch('unified-list:mark-done', undefined)
            }
          >
            Mark Done
          </button>
          <button
            class="px-3 py-1 rounded text-sm bg-panel"
            onClick={() =>
              controller.commands.dispatch(
                'unified-list:clear-selection',
                undefined
              )
            }
          >
            Clear
          </button>
        </div>
      </Show>

      {/* The unified list */}
      <div class="flex-1 overflow-hidden">
        <UnifiedList
          controller={controller}
          rowConfig={rowConfig}
          rowHeight={48}
          overscan={8}
          emptyState={
            <div class="flex items-center justify-center h-full text-ink-muted">
              <span>No entities match your filters</span>
            </div>
          }
        />
      </div>

      {/* Status bar */}
      <div class="flex items-center justify-between p-2 border-t border-divider text-xs text-ink-muted">
        <span>{controller.state.entities().length} items</span>
        <span>
          Sort: {sortStore?.activeSortId()} ({sortStore?.sortOrder()})
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Usage Example
// ============================================================================

/**
 * Usage:
 *
 * ```tsx
 * import { SoupExample } from '@unified-list/examples/SoupExample';
 *
 * function MyApp() {
 *   return (
 *     <SoupExample
 *       onOpenEntity={(entity) => {
 *         // Open in split or navigate to entity
 *         console.log('Opening:', entity);
 *       }}
 *       onMarkDone={async (entities) => {
 *         // Mark entities as done via API
 *         await markEntitiesDone(entities);
 *       }}
 *     />
 *   );
 * }
 * ```
 */
