/**
 * GroupBy Plugin - composable entity grouping system.
 *
 * Design:
 * - Groups entities by a key function
 * - Produces flat displayItems list (headers + entities) for virtualization
 * - Supports collapsible groups
 * - Configurable group order and labels via registry
 */

import { createSignal } from 'solid-js';
import type {
  EntityConstraint,
  Plugin,
  ListController,
  PluginWithStore,
} from '../core/types';
import { CommandPriority } from '../core/types';
import { mergeRegister } from '../core/commands';
import type {
  GroupId,
  GroupKeyFn,
  GroupRegistry,
  GroupStore,
  GroupByPluginConfig,
  DisplayItem,
  HeaderDisplayItem,
  EntityDisplayItem,
} from '../types/groupBy';

// ============================================================================
// Group Store Creation
// ============================================================================

/** Create reactive group store */
export function createGroupStore<T extends EntityConstraint>(
  groupKeyFn: GroupKeyFn<T>,
  groupRegistry: GroupRegistry,
  initialCollapsed: Set<GroupId> = new Set(),
  initialEnabled = true
): GroupStore<T> {
  const [enabled, setEnabled] = createSignal(initialEnabled);
  const [collapsedGroups, setCollapsedGroups] =
    createSignal<Set<GroupId>>(initialCollapsed);

  // Pre-compute sorted group order from registry
  const sortedGroupIds = Array.from(groupRegistry.entries())
    .sort((a, b) => {
      const orderA = a[1].order ?? Infinity;
      const orderB = b[1].order ?? Infinity;
      if (orderA !== orderB) return orderA - orderB;
      return a[1].label.localeCompare(b[1].label);
    })
    .map(([id]) => id);

  /** Toggle a specific group's collapsed state */
  const toggleGroup = (groupId: GroupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  /** Collapse all groups */
  const collapseAll = () => {
    // Collapse all groups that have entities
    setCollapsedGroups(new Set<GroupId>(groupRegistry.keys()));
  };

  /** Expand all groups */
  const expandAll = () => {
    setCollapsedGroups(new Set<GroupId>());
  };

  /** Get visible group IDs (groups with at least one entity) */
  const getVisibleGroupIds = (entities: T[]): GroupId[] => {
    const groupedKeys = new Set<GroupId>();
    for (const entity of entities) {
      groupedKeys.add(groupKeyFn(entity));
    }

    // Return sorted group IDs that have entities
    const visibleSorted = sortedGroupIds.filter((id) => groupedKeys.has(id));

    // Add any ungrouped keys (not in registry) at the end
    for (const key of groupedKeys) {
      if (!sortedGroupIds.includes(key)) {
        visibleSorted.push(key);
      }
    }

    return visibleSorted;
  };

  /** Transform entities into display items (headers + entities) */
  const createDisplayItems = (entities: T[]): DisplayItem<T>[] => {
    // When disabled, wrap entities without headers
    if (!enabled()) {
      return entities.map(
        (entity): EntityDisplayItem<T> => ({
          type: 'entity',
          entity,
          groupId: groupKeyFn(entity),
        })
      );
    }

    // Group entities by key
    const grouped = new Map<GroupId, T[]>();
    for (const entity of entities) {
      const key = groupKeyFn(entity);
      const group = grouped.get(key) ?? [];
      group.push(entity);
      grouped.set(key, group);
    }

    // Build flat display items list
    const items: DisplayItem<T>[] = [];
    const collapsed = collapsedGroups();

    // First, process groups in registry order
    for (const groupId of sortedGroupIds) {
      const groupEntities = grouped.get(groupId);
      if (!groupEntities || groupEntities.length === 0) continue;

      const config = groupRegistry.get(groupId);
      const isCollapsed = collapsed.has(groupId);

      // Add header
      const header: HeaderDisplayItem = {
        type: 'header',
        groupId,
        label: config?.label ?? groupId,
        icon: config?.icon,
        count: groupEntities.length,
        collapsed: isCollapsed,
      };
      items.push(header);

      // Add entities (unless collapsed)
      if (!isCollapsed) {
        for (const entity of groupEntities) {
          items.push({
            type: 'entity',
            entity,
            groupId,
          });
        }
      }
    }

    // Then, process ungrouped entities (keys not in registry)
    for (const [groupId, groupEntities] of grouped.entries()) {
      if (sortedGroupIds.includes(groupId)) continue;

      const isCollapsed = collapsed.has(groupId);

      const header: HeaderDisplayItem = {
        type: 'header',
        groupId,
        label: groupId,
        count: groupEntities.length,
        collapsed: isCollapsed,
      };
      items.push(header);

      if (!isCollapsed) {
        for (const entity of groupEntities) {
          items.push({ type: 'entity', entity, groupId });
        }
      }
    }

    return items;
  };

  return {
    enabled,
    setEnabled,
    groupKeyFn,
    groupRegistry,
    collapsedGroups,
    setCollapsedGroups,
    toggleGroup,
    collapseAll,
    expandAll,
    createDisplayItems,
    getVisibleGroupIds,
  };
}

// ============================================================================
// GroupBy Plugin Commands
// ============================================================================

export const GroupByCommands = {
  TOGGLE_GROUP: 'unified-list:toggle-group',
  COLLAPSE_ALL_GROUPS: 'unified-list:collapse-all-groups',
  EXPAND_ALL_GROUPS: 'unified-list:expand-all-groups',
  SET_GROUP_BY_ENABLED: 'unified-list:set-group-by-enabled',
} as const;

// ============================================================================
// GroupBy Plugin Factory
// ============================================================================

/** Create a group-by plugin */
export function createGroupByPlugin<T extends EntityConstraint>(
  config: GroupByPluginConfig<T>
): PluginWithStore<T, GroupStore<T>> {
  const {
    groupKeyFn,
    groupRegistry,
    initialCollapsed = new Set(),
    initialEnabled = true,
    onCollapseChange,
    onEnabledChange,
  } = config;

  const store = createGroupStore<T>(
    groupKeyFn,
    groupRegistry,
    initialCollapsed,
    initialEnabled
  );

  const plugin: Plugin<T> = (controller: ListController<T>) => {
    return mergeRegister(
      controller.commands.register<{ groupId: GroupId }>(
        GroupByCommands.TOGGLE_GROUP,
        (payload) => {
          store.toggleGroup(payload.groupId);
          onCollapseChange?.(store.collapsedGroups());
          return true;
        },
        CommandPriority.NORMAL
      ),
      controller.commands.register(
        GroupByCommands.COLLAPSE_ALL_GROUPS,
        () => {
          store.collapseAll();
          onCollapseChange?.(store.collapsedGroups());
          return true;
        },
        CommandPriority.NORMAL
      ),
      controller.commands.register(
        GroupByCommands.EXPAND_ALL_GROUPS,
        () => {
          store.expandAll();
          onCollapseChange?.(store.collapsedGroups());
          return true;
        },
        CommandPriority.NORMAL
      ),
      controller.commands.register<{ enabled: boolean }>(
        GroupByCommands.SET_GROUP_BY_ENABLED,
        (payload) => {
          store.setEnabled(payload.enabled);
          onEnabledChange?.(payload.enabled);
          return true;
        },
        CommandPriority.NORMAL
      )
    );
  };

  return Object.assign(plugin, { store });
}

// ============================================================================
// Utility Functions
// ============================================================================

/** Get entity from display item (returns undefined for headers) */
export function getEntityFromDisplayItem<T>(
  item: DisplayItem<T>
): T | undefined {
  return item.type === 'entity' ? item.entity : undefined;
}

/** Find entity index in display items by entity ID */
export function findEntityDisplayIndex<T extends { id: string }>(
  displayItems: DisplayItem<T>[],
  entityId: string
): number {
  return displayItems.findIndex(
    (item) => item.type === 'entity' && item.entity.id === entityId
  );
}

/** Get all entities from display items (excluding headers) */
export function getEntitiesFromDisplayItems<T>(
  displayItems: DisplayItem<T>[]
): T[] {
  return displayItems
    .filter((item): item is EntityDisplayItem<T> => item.type === 'entity')
    .map((item) => item.entity);
}

/** Find next entity display index (skipping headers) */
export function findNextEntityIndex<T>(
  displayItems: DisplayItem<T>[],
  currentIndex: number
): number {
  for (let i = currentIndex + 1; i < displayItems.length; i++) {
    if (displayItems[i].type === 'entity') return i;
  }
  return -1;
}

/** Find previous entity display index (skipping headers) */
export function findPrevEntityIndex<T>(
  displayItems: DisplayItem<T>[],
  currentIndex: number
): number {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (displayItems[i].type === 'entity') return i;
  }
  return -1;
}
