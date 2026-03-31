import { createSignal, type JSX } from 'solid-js';
import {
  MessageActionDrawerContextProvider,
  type MessageActionDrawerState,
} from './context';
import { ActionDrawer } from './ActionDrawer';
import type { MessageActions, MessageData } from './types';

export function MessageActionDrawerManager(props: { children: JSX.Element }) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [message, setMessage] = createSignal<MessageData | undefined>();
  const [actions, setActions] = createSignal<MessageActions | undefined>();

  const ctx: MessageActionDrawerState = {
    isOpen,
    message,
    actions,
    open: (msg: MessageData, acts: MessageActions | undefined) => {
      setMessage(() => msg);
      setActions(() => acts);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  };

  return (
    <MessageActionDrawerContextProvider value={ctx}>
      {props.children}
      <ActionDrawer />
    </MessageActionDrawerContextProvider>
  );
}
