/**
 * ChildRow - Single child row with configurable slot system.
 *
 * Layout: [UserIcon] [Label] [Content] [Date] [Actions]
 * Each slot is optional and only renders if provided.
 */

import { Show, type JSX } from 'solid-js';
import type {
  ChildRowSlotName,
  ChildRowSlotProps,
  ChildRowConfig,
  ChildItemId,
} from '../../types';

// ============================================================================
// Thread Border Component
// ============================================================================

/**
 * Thread border connector - visual line connecting child to parent.
 */
export function ThreadBorder(): JSX.Element {
  return (
    <div
      class="absolute left-[calc(0.5rem+1px)] w-[1px] border-l border-edge-muted -top-0.75"
      style={{ height: '6px' }}
    />
  );
}

// ============================================================================
// ChildRow Component
// ============================================================================

export type ChildRowProps<TChild> = {
  /** The child item data */
  child: TChild;
  /** Index within the children list */
  index: number;
  /** Total count of children */
  totalCount: number;
  /** Child's unique identifier for selection targeting */
  childId: ChildItemId;
  /** Whether this specific child is focused (for future keyboard nav) */
  isChildFocused: boolean;
  /** Configuration for rendering this child row */
  config: ChildRowConfig<TChild>;
};

/**
 * ChildRow - renders a single child item with configurable slots.
 *
 * Layout: [UserIcon 20px] [Label] [Content flex-1] [Date] [Actions]
 * All slots are optional and fall back to nothing if not provided.
 */
export function ChildRow<TChild>(props: ChildRowProps<TChild>): JSX.Element {
  const slotProps = (): ChildRowSlotProps<TChild> => ({
    child: props.child,
    index: props.index,
    totalCount: props.totalCount,
    childId: props.childId,
    isChildFocused: props.isChildFocused,
  });

  const renderSlot = (slotName: ChildRowSlotName) => {
    const renderer = props.config.slots[slotName];
    if (!renderer) return null;
    return renderer(slotProps());
  };

  const handleClick = (e: MouseEvent) => {
    if (props.config.blocksNavigation) {
      e.stopPropagation();
    }
    props.config.onClick?.(props.child, e);
  };

  return (
    <div
      class="relative flex gap-1 items-center min-w-0 min-h-8 transition-all"
      classList={{
        'hover:bg-hover/50 hover:opacity-85 cursor-pointer':
          !!props.config.onClick,
        'ring-1 ring-accent/50': props.isChildFocused,
        ...props.config.classList,
      }}
      onClick={handleClick}
      data-blocks-navigation={props.config.blocksNavigation || undefined}
      data-child-id={props.childId}
    >
      <Show when={props.config.showThreadBorder}>
        <ThreadBorder />
      </Show>

      {/* UserIcon slot: fixed width container */}
      <div class="flex size-5 shrink-0 items-center justify-center mr-1">
        {renderSlot('userIcon')}
      </div>

      {/* Main content area: label + content */}
      <div class="flex gap-1 text-sm w-full min-w-0 overflow-hidden items-baseline">
        {/* Label slot: constrained width */}
        <Show when={props.config.slots.label}>
          <div class="text-sm shrink-0 truncate min-w-0 max-w-[20cqw]">
            {renderSlot('label')}
          </div>
        </Show>

        {/* Content slot: flex grow */}
        <div class="flex-1 min-w-0 truncate">{renderSlot('content')}</div>
      </div>

      {/* Date slot */}
      <Show when={props.config.slots.date}>
        <div class="shrink-0 font-mono text-xs uppercase text-ink-extra-muted ml-2">
          {renderSlot('date')}
        </div>
      </Show>

      {/* Actions slot */}
      <Show when={props.config.slots.actions}>
        <div class="shrink-0 ml-2">{renderSlot('actions')}</div>
      </Show>
    </div>
  );
}
