/**
 * Actions Slot - Row action buttons (mark done, etc).
 */

import { Show, type JSX } from 'solid-js';
import type { EntityData } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import { LabelAndHotKey, Tooltip } from '@core/component/Tooltip';
import { TOKENS } from '@core/hotkey/tokens';
import CheckIcon from '@icon/regular/check.svg';

export type ActionsSlotConfig = {
  showDone?: boolean;
  onRowAction?: (entity: EntityData, action: 'done' | 'delete') => void;
};

/** Actions slot component */
export function ActionsSlot<T extends EntityData>(
  props: SlotProps<T> & ActionsSlotConfig
): JSX.Element {
  const shouldShow = () =>
    props.showDone &&
    (props.isSelected || props.isHovered) &&
    props.onRowAction;

  return (
    <Show when={shouldShow()}>
      <div class="absolute top-1 right-1 items-center flex @max-sm/uList:hidden">
        <Tooltip
          tooltip={
            <LabelAndHotKey
              label="Mark as done"
              hotkeyToken={TOKENS.entity.action.markDone}
            />
          }
        >
          <button
            class="bg-panel flex items-center justify-center size-8 border border-edge-muted hover:bg-accent hover:text-panel"
            onClick={(e) => {
              e.stopPropagation();
              props.onRowAction?.(props.entity, 'done');
            }}
            data-blocks-navigation
          >
            <CheckIcon class="w-4 h-4 pointer-events-none" />
          </button>
        </Tooltip>
      </div>
    </Show>
  );
}

/** Factory function to create actions slot renderer */
export function createActionsSlot<T extends EntityData>(
  config: ActionsSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <ActionsSlot
      {...props}
      showDone={config.showDone ?? true}
      onRowAction={config.onRowAction}
    />
  );
}
