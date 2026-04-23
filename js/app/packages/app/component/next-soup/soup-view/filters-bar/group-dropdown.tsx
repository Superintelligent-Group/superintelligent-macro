import { type Component, For, Show } from 'solid-js';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import CheckIcon from '@icon/regular/check.svg';
import ChevronDownIcon from '@icon/regular/caret-down.svg';
import StackSimpleIcon from '@icon/regular/stack-simple.svg';
import type {
  GroupOption,
  GroupOptionId,
} from '@app/component/next-soup/soup-view/group-options';
import { Button } from '@app/component/next-soup/soup-view/filters-bar/button';
import { LabelAndHotKey, Tooltip } from '@core/component/Tooltip';

export interface GroupDropdownProps {
  value: () => GroupOptionId | 'none';
  onChange: (value: GroupOptionId | 'none') => void;
  options: GroupOption[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const GroupDropdown: Component<GroupDropdownProps> = (props) => {
  const options = () => props.options ?? [];

  return (
    <DropdownMenu
      open={props.open}
      onOpenChange={props.onOpenChange}
      placement="bottom-start"
      gutter={4}
    >
      <Tooltip tooltip={<LabelAndHotKey label="Group by" shortcut="G" />}>
        <DropdownMenu.Trigger
          as={Button}
          variant="secondary"
          size="sm"
          class="whitespace-nowrap rounded-xs [&_svg]:size-4"
        >
          <StackSimpleIcon />
          <ChevronDownIcon class="size-4" />
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-action-menu bg-surface-0 border border-edge-muted rounded-sm shadow-sm min-w-[140px] p-1">
          <For each={options()}>
            {(option) => (
              <DropdownMenu.Item
                class="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors hover:bg-ink/5 focus:bg-ink/5 outline-none cursor-default rounded-md"
                onSelect={() => props.onChange(option.value)}
              >
                <span
                  class="flex-1 truncate"
                  classList={{
                    'text-ink font-medium': props.value() === option.value,
                    'text-ink-muted': props.value() !== option.value,
                  }}
                >
                  {option.label}
                </span>
                <span class="size-3.5 flex items-center justify-center shrink-0">
                  <Show when={props.value() === option.value}>
                    <CheckIcon class="size-3 text-accent" />
                  </Show>
                </span>
              </DropdownMenu.Item>
            )}
          </For>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  );
};
