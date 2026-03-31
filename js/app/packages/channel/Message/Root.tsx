import { createSignal, splitProps, type JSX } from 'solid-js';
import { cn } from '@ui/utils/classname';
import { touchHandler } from '@core/directive/touchHandler';
import {
  MessageActionsProvider,
  MessageDrawerProvider,
  MessageProvider,
} from './context';
import type { MessageActions, MessageData } from './types';

type RootProps = JSX.HTMLAttributes<HTMLDivElement> & {
  message: MessageData;
  actions?: MessageActions;
  highlighted?: boolean;
};

export function Root(props: RootProps) {
  const [local, rest] = splitProps(props, [
    'children',
    'class',
    'message',
    'actions',
    'highlighted',
  ]);

  const [isDrawerOpen, setIsDrawerOpen] = createSignal(false);
  const drawerState = {
    isOpen: isDrawerOpen,
    open: () => setIsDrawerOpen(true),
    close: () => setIsDrawerOpen(false),
  };

  return (
    <div
      ref={(el) =>
        touchHandler(el, () => ({ onLongPress: () => setIsDrawerOpen(true) }))
      }
      class={cn('group/message relative touch:no-select-children', local.class)}
      data-message
      data-message-id={local.message.id}
      data-highlighted={local.highlighted ? '' : undefined}
      {...rest}
    >
      <div class="absolute h-full w-[3px] left-0 top-0 bg-accent opacity-0 message-accent-bar" />
      <MessageProvider value={() => local.message}>
        <MessageActionsProvider value={local.actions}>
          <MessageDrawerProvider value={drawerState}>
            {props.children}
          </MessageDrawerProvider>
        </MessageActionsProvider>
      </MessageProvider>
    </div>
  );
}
