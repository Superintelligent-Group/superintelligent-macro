/**
 * Indicator Slot - Unread indicator and checkbox.
 */

import { Show, type JSX } from 'solid-js';
import type { EntityData } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import CheckIcon from '@icon/regular/check.svg';

export type IndicatorSlotConfig = {
  showUnread?: boolean;
  showCheckbox?: boolean;
  onCheckboxToggle?: (
    entity: EntityData,
    checked: boolean,
    shiftKey?: boolean
  ) => void;
};

/** Unread indicator dot */
export function UnreadIndicator(props: { active?: boolean }): JSX.Element {
  return (
    <div class="flex size-4 items-center justify-center">
      <div
        classList={{
          'bg-accent rounded-full size-2': true,
          'opacity-0': !props.active,
        }}
      />
    </div>
  );
}

/** Checkbox component */
export function Checkbox(props: {
  checked: boolean;
  highlighted?: boolean;
  onToggle: (checked: boolean, shiftKey?: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      class="size-full relative group/button flex items-center justify-center bracket-never"
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        props.onToggle(!props.checked, e.shiftKey);
      }}
      data-blocks-navigation
    >
      <div
        class="size-4 p-0.5 flex items-center justify-center rounded-xs group-hover/button:border-accent group-hover/button:border pointer-events-none"
        classList={{
          'ring ring-edge-muted': props.highlighted,
          'bg-panel': !props.checked && props.highlighted,
          'bg-accent border border-accent': props.checked,
        }}
      >
        <Show when={props.checked}>
          <CheckIcon class="w-full h-full text-panel" />
        </Show>
      </div>
    </button>
  );
}

/**
 * Check if entity is unread.
 * - Emails: Uses isRead boolean
 * - Everything else: Has notification with viewedAt === null/undefined
 */
function isEntityUnread(entity: SlotProps<EntityData>['entity']): boolean {
  if (entity.type === 'email') {
    return !entity.isRead;
  }
  return entity.notifications?.()?.some((n) => !n.viewedAt) ?? false;
}

/** Indicator slot component */
export function IndicatorSlot<T extends EntityData>(
  props: SlotProps<T> & IndicatorSlotConfig
): JSX.Element {
  const hasUnread = () => isEntityUnread(props.entity);

  return (
    <div class="col-1 size-full relative flex items-center justify-center @max-md/uList:hidden">
      <Show
        when={props.showCheckbox}
        fallback={
          <Show when={props.showUnread}>
            <UnreadIndicator active={hasUnread()} />
          </Show>
        }
      >
        <Checkbox
          checked={props.isChecked}
          highlighted={props.isFocused && !props.isChecked}
          onToggle={(checked, shiftKey) =>
            props.onCheckboxToggle?.(props.entity, checked, shiftKey)
          }
        />
        <Show when={props.showUnread && !props.isChecked && !props.isFocused}>
          <div class="absolute inset-0 flex items-center justify-center group-hover/button:opacity-0">
            <UnreadIndicator active={hasUnread()} />
          </div>
        </Show>
      </Show>
    </div>
  );
}

/** Factory function to create indicator slot renderer */
export function createIndicatorSlot<T extends EntityData>(
  config: IndicatorSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <IndicatorSlot
      {...props}
      showUnread={config.showUnread ?? true}
      showCheckbox={config.showCheckbox ?? true}
      onCheckboxToggle={config.onCheckboxToggle}
    />
  );
}
