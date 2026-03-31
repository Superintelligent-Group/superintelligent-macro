import { createContext, useContext, type Accessor } from 'solid-js';
import type { MessageActions, MessageData } from './types';

type MessageDrawerState = {
  isOpen: Accessor<boolean>;
  open: () => void;
  close: () => void;
};

const MessageContext = createContext<Accessor<MessageData>>();
const MessageActionsContext = createContext<MessageActions>();

export const MessageProvider = MessageContext.Provider;
export const MessageActionsProvider = MessageActionsContext.Provider;

export function useMessage(): Accessor<MessageData> {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessage must be used within <Msg.Root>');
  return ctx;
}

export function useMessageActions(): MessageActions | undefined {
  return useContext(MessageActionsContext);
}

const MessageDrawerContext = createContext<MessageDrawerState>();
export const MessageDrawerProvider = MessageDrawerContext.Provider;

export function useMessageDrawer(): MessageDrawerState | undefined {
  return useContext(MessageDrawerContext);
}

export type MessageSelectionState = {
  isSelected: boolean;
};

const MessageSelectionContext = createContext<MessageSelectionState>();
export const MessageSelectionProvider = MessageSelectionContext.Provider;

export function useMessageSelection(): MessageSelectionState | undefined {
  return useContext(MessageSelectionContext);
}
