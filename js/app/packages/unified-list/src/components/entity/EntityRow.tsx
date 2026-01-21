/**
 * EntityRow - Composable entity row component.
 *
 * This is the main component for rendering a single entity in a list.
 * It uses a slot-based system for flexible composition.
 */

import { createSignal, createMemo, Show, type JSX } from 'solid-js';
import { mergeRefs } from '@solid-primitives/refs';
import { isTouchDevice } from '@core/mobile/isTouchDevice';
import type { EntityData } from '@macro-entity';
import type {
  EnhancedEntity,
  EntityRowConfig,
  EntitySlots,
  SlotProps,
} from './types';

// Slot imports
import { createIndicatorSlot } from './slots/IndicatorSlot';
import { createIconSlot } from './slots/IconSlot';
import { createTitleSlot } from './slots/TitleSlot';
import { createSubtitleSlot } from './slots/SubtitleSlot';
import { createBadgesSlot } from './slots/BadgesSlot';
import { createTimestampSlot } from './slots/TimestampSlot';
import { createActionsSlot } from './slots/ActionsSlot';
import { createNotificationsSlot } from './slots/NotificationsSlot';
import { createSearchHitsSlot } from './slots/SearchHitsSlot';
import { createPropertiesSlot } from './slots/PropertiesSlot';
import { ChildrenSlot } from './slots/ChildrenSlot';

export const ENTITY_HEIGHT = 40;

// Global hovered entity ID for hover state management
const [hoveredEntityId, setHoveredEntityId] = createSignal<string | null>(null);

export type EntityRowProps<T extends EntityData = EntityData> = {
  entity: EnhancedEntity<T>;
  index: number;
  focused: boolean;
  selected: { active: boolean; muted?: boolean };
  checked: boolean;
  config: EntityRowConfig<T>;
  searchActive?: boolean;
  ref?: (el: HTMLDivElement) => void;
};

/** The main click handler for the entity row should navigate to an entity
 * without forcing focus back to the source split until after navigation.
 * Certain buttons in the entity need to NOT Navigate AND return focus to
 * the split. Those buttons should have a 'data-blocks-navigation' attribute.
 */
function blocksNavigation(
  e: PointerEvent | MouseEvent,
  containerRef: HTMLDivElement | null
): boolean {
  const { target } = e;
  if (target instanceof Element) {
    const closest = target.closest('[data-blocks-navigation]');
    if (closest && containerRef?.contains(closest)) return true;
  }
  return false;
}

/** EntityRow component */
export function EntityRow<T extends EntityData>(
  props: EntityRowProps<T>
): JSX.Element {
  const [entityDivRef, setEntityDivRef] = createSignal<HTMLDivElement | null>(
    null
  );


  // Compute slot props
  const slotProps = createMemo<SlotProps<T>>(() => ({
    entity: props.entity,
    index: props.index,
    isFocused: props.focused,
    isSelected: props.selected.active,
    isChecked: props.checked,
    isHovered: hoveredEntityId() === props.entity.id,
    searchActive: props.searchActive ?? false,
  }));

  // Get slot renderers from config or use defaults
  const slots = createMemo<EntitySlots<T>>(() => {
    const configSlots = props.config.slots ?? {};
    return {
      leftIndicator:
        configSlots.leftIndicator ??
        createIndicatorSlot({
          showUnread: props.config.showUnreadIndicator ?? true,
          showCheckbox: true,
          onCheckboxToggle: props.config.onCheckboxToggle,
        }),
      icon: configSlots.icon ?? createIconSlot({ showDmParticipant: true }),
      title:
        configSlots.title ?? createTitleSlot({ showSearchHighlight: true }),
      subtitle:
        configSlots.subtitle ??
        createSubtitleSlot({
          showLatestMessage: true,
          showUnrollNotifications: props.config.showUnrollNotifications,
        }),
      badges:
        configSlots.badges ??
        createBadgesSlot({
          showShared: true,
          showProject: true,
          onClick: props.config.onClick,
          onPointerDown: props.config.onPointerDown,
        }),
      properties:
        configSlots.properties ??
        createPropertiesSlot({
          properties: props.config.properties,
        }),
      timestamp: configSlots.timestamp ?? createTimestampSlot(),
      actions:
        configSlots.actions ??
        createActionsSlot({
          showDone: props.config.showDoneButton ?? true,
          onRowAction: props.config.onRowAction,
        }),
      notifications:
        configSlots.notifications ??
        createNotificationsSlot({
          maxVisible: 3,
          onNotificationClick: props.config.onNotificationClick,
          onToggleExpand: props.config.onToggleExpand,
        }),
      searchHits:
        configSlots.searchHits ??
        createSearchHitsSlot({
          maxVisible: 1,
          onClick: props.config.onClick,
          onToggleExpand: props.config.onToggleExpand,
        }),
    };
  });

  // Render a slot
  const renderSlot = (slotName: keyof EntitySlots<T>) => {
    const slot = slots()[slotName];
    if (!slot) return null;
    return slot(slotProps());
  };

  const height = () => props.config.height ?? ENTITY_HEIGHT;

  return (
    <div
      data-checked={props.checked}
      class="everything-entity w-full relative group/entity hover:bg-hover/30 mx-[1px]"
      style={{
        'min-height': `${height()}px`,
      }}
      classList={{
        'outline outline-accent/20 outline-offset-[-1px]':
          !isTouchDevice() && props.selected.active && !props.checked,
        '!bg-accent/5 outline outline-accent/20 outline-offset-[-1px]':
          props.checked,
        'bracket outline outline-accent/20 outline-offset-[-1px]':
          !isTouchDevice() && props.selected.active,
        'after:opacity-20 !outline-accent/10':
          !isTouchDevice() && props.selected.active && props.selected.muted,
        'active:bracket active:outline active:outline-accent/20 active:outline-offset-[-1px]':
          isTouchDevice() && !props.checked,
      }}
      onMouseMove={() => {
        if (isTouchDevice()) return;
        setHoveredEntityId(props.entity.id);
      }}
      onMouseLeave={() => {
        setHoveredEntityId(null);
      }}
      onContextMenu={() => {
        props.config.onContextMenu?.(props.entity);
      }}
    >
      <div
        data-entity
        data-entity-id={props.entity.id}
        class="w-full min-w-0 grid flex-1 items-start suppress-css-bracket grid-cols-[2rem_1fr_auto] grid-rows-[auto_auto] @max-md/uList:flex @max-md/uList:flex-col pr-2 @max-md/uList:px-2 @max-md/uList:py-2"
        onClick={(e) => {
          if (blocksNavigation(e, entityDivRef())) return;
          props.config.onClick?.({
            type: 'entity',
            entity: props.entity,
            event: e,
          });
        }}
        onDblClick={(e) => {
          if (blocksNavigation(e, entityDivRef())) return;
          props.config.onDoubleClick?.({
            type: 'entity',
            entity: props.entity,
            event: e,
          });
        }}
        onMouseDown={(e) => {
          if (blocksNavigation(e, entityDivRef())) return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          if (blocksNavigation(e, entityDivRef())) return;
          props.config.onPointerDown?.({
            type: 'entity',
            entity: props.entity,
            event: e,
          });
        }}
        role="button"
        tabIndex={0}
        ref={mergeRefs(setEntityDivRef, props.ref)}
      >
        {/* Left indicator column - row 1, col 1 */}
        <div class="row-start-1 col-start-1 self-center">
          {renderSlot('leftIndicator')}
        </div>

        {/* Main content area - row 1, col 2 */}
        <div
          class="row-start-1 col-start-2 min-h-10 min-w-[50px] flex flex-row items-center gap-2 @max-md/uList:col-auto @max-md/uList:w-full @max-md/uList:min-h-0 @max-md/uList:items-start"
          classList={{
            grow: props.config.layout === 'expanded',
          }}
        >
          {/* Left unread indicator for narrow mode */}
          <Show
            when={
              props.config.showLeftColumnIndicator &&
              !props.checked &&
              !props.focused
            }
          >
            <div class="flex size-4 items-center justify-center @min-md/split:hidden">
              {renderSlot('leftIndicator')}
            </div>
          </Show>

          {/* Icon */}
          {renderSlot('icon')}

          {/* Title and subtitle */}
          <div class="flex flex-col min-w-0 flex-1">
            {renderSlot('title')}
            {renderSlot('subtitle')}
          </div>
        </div>

        {/* Right section - row 1, col 3 */}
        <div
          class="row-start-1 col-start-3 ml-2 @md:ml-4 self-center min-w-0 @max-md/uList:col-auto @max-md/uList:row-auto @max-md/uList:ml-0 @max-md/uList:mt-1 @max-md/uList:self-start @max-md/uList:w-full"
          classList={{
            'opacity-50': props.config.fadeIfRead && !hasUnread(props.entity),
          }}
        >
          <div class="flex flex-row items-center justify-end gap-2 min-w-0 @max-md/uList:justify-start @max-md/uList:flex-wrap">
            {renderSlot('badges')}
            {renderSlot('properties')}
            {renderSlot('timestamp')}
            {renderSlot('actions')}
          </div>
        </div>

        {/* Search hits */}
        {renderSlot('searchHits')}

        {/* Notifications */}
        <Show when={props.config.showUnrollNotifications}>
          {renderSlot('notifications')}
        </Show>

        {/* Children slot - unified children rendering (row 2, col 2-4) */}
        <Show when={props.config.childrenSlot}>
          <ChildrenSlot
            children={props.config.childrenSlot!.children}
            rowConfig={props.config.childrenSlot!.rowConfig}
            maxVisible={props.config.childrenSlot?.maxVisible}
            collapsible={props.config.childrenSlot?.collapsible}
            moreLabel={props.config.childrenSlot?.moreLabel}
            getChildId={props.config.childrenSlot?.getChildId}
            parentId={props.entity.id}
          />
        </Show>
      </div>
    </div>
  );
}

/**
 * Check if entity is unread.
 * - Emails: Uses isRead boolean
 * - Everything else: Has notification with viewedAt === null
 */
function hasUnread(entity: EnhancedEntity<EntityData>): boolean {
  if (entity.type === 'email') {
    return !entity.isRead;
  }
  return entity.notifications?.()?.some((n) => !n.viewedAt) ?? false;
}

/** Export slot factories for custom composition */
export {
  createIndicatorSlot,
  createIconSlot,
  createTitleSlot,
  createSubtitleSlot,
  createBadgesSlot,
  createPropertiesSlot,
  createTimestampSlot,
  createActionsSlot,
  createNotificationsSlot,
  createSearchHitsSlot,
};

/** Default entity row configuration */
export function createDefaultEntityRowConfig<T extends EntityData>(
  overrides: Partial<EntityRowConfig<T>> = {}
): EntityRowConfig<T> {
  return {
    slots: {},
    height: ENTITY_HEIGHT,
    layout: 'default',
    showUnreadIndicator: true,
    showLeftColumnIndicator: true,
    showUnrollNotifications: false,
    showDoneButton: true,
    fadeIfRead: false,
    ...overrides,
  };
}
