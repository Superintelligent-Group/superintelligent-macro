import type { MessageWithBodyReplyless } from '@service-email/generated/schemas';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { EmailMessageTopBar } from './EmailMessageTopBar';
import type { SetStoreFunction } from 'solid-js/store';
import { EmailAttachmentPill } from './AttachmentPill';
import { EmailMessageBody } from './EmailMessageBody';
import { Message } from '@core/component/Message';
import { useEmailContext } from './EmailContext';
import { useUserId } from '@service-gql/client';
import { useDisplayName } from '@core/user';
import { EmailInput } from './EmailInput';
import { Portal } from 'solid-js/web';


interface MessageContainerProps {
  setExpandedMessageBodyIds: SetStoreFunction<Record<string, boolean>>;
  expandedMessageBodyIds: Record<string, boolean>;
  message: MessageWithBodyReplyless;
  isFirstMessage: boolean;
  isLastMessage: boolean;
  isFocused: boolean;
  isTarget: boolean;
}

export function MessageContainer(props: MessageContainerProps) {
  const context = useEmailContext();
  const draftChild = createMemo(() => {
    const draft = context.messageDbIdToDraftChildren[props.message.db_id ?? ''];
    if(!draft){return undefined};
    return draft;
  });

  const [expandedHeader, setExpandedHeader] = createSignal<boolean>(false);
  const [threadAppendMountTarget, setThreadAppendMountTarget] = createSignal<HTMLElement | undefined>();
  const [showReply, setShowReply] = createSignal<boolean>(!!context.messageDbIdToDraftChildren[props.message.db_id ?? '']);
  const userId = useUserId();
  const [currentUserName] = useDisplayName(userId());

  const isBodyExpanded = createMemo(() => {
    return props.expandedMessageBodyIds[props.message.db_id ?? ''];
  });

  const isNewMessage = createMemo(() => {
    return (
      props.message.labels.find((l) => l.provider_label_id === 'UNREAD') !== undefined
    );
  });

  // Hide attachments that are referenced in inline images
  const inlineContentIds = createMemo(() => {
    const set = new Set<string>();
    const collectFromHtml = (html: string) => {
      const regex = /src=["']cid:([^"']+)["']/gi;
      let match = regex.exec(html);
      while(match !== null){
        const raw = match[1];
        const normalized = raw.replace(/[<>]/g, '').trim();
        if(normalized){set.add(normalized)};
        match = regex.exec(html);
      }
    };
    collectFromHtml(props.message.body_html_sanitized ?? '');
    return set;
  });

  const visibleAttachments = createMemo(() => {
    return props.message.attachments.filter((a) => {
      if (!a.db_id) return false;
      const contentId = a.content_id?.toString();
      if (!contentId) return true;
      const normalized = contentId.replace(/[<>]/g, '').trim();
      return !inlineContentIds().has(normalized);
    });
  });

  // expand appropriate messages
  createEffect(() => {
    const id = props.message.db_id;
    if(props.isLastMessage && id){props.setExpandedMessageBodyIds(id, true)}
    if(isNewMessage() && id){props.setExpandedMessageBodyIds(id, true)}
  });

  return (
    <div class="shrink-0 flex justify-center w-full">
      <div class="macro-message-width w-full">
        <Message
          id={props.message.db_id ?? undefined}
          isFirstMessage={props.isFirstMessage}
          senderId={props.message.from?.email}
          isLastMessage={props.isLastMessage}
          isNewMessage={isNewMessage()}
          isTarget={props.isTarget}
          focused={props.isFocused}
        >
          <Message.TopBar>
            <EmailMessageTopBar
              setExpandedMessageBodyIds={props.setExpandedMessageBodyIds}
              setFocusedMessageId={context.setFocusedMessageId}
              setExpandedHeader={setExpandedHeader}
              isLastMessage={props.isLastMessage}
              isBodyExpanded={isBodyExpanded}
              expandedHeader={expandedHeader}
              setShowReply={setShowReply}
              focused={props.isFocused}
              message={props.message}
            />
          </Message.TopBar>
          <Message.Body>
            <EmailMessageBody
              setExpandedMessageBody={(id) => props.setExpandedMessageBodyIds(id, true)}
              setFocusedMessageId={context.setFocusedMessageId}
              isBodyExpanded={isBodyExpanded}
              message={props.message}
            />
          </Message.Body>
          <Show when={visibleAttachments().length > 0}>
            <div class="flex flex-row overflow-x-scroll my-1">
              <For each={visibleAttachments()}>
                {(attachment) => {
                  if(attachment.db_id){return <EmailAttachmentPill attachment={attachment} />};
                }}
              </For>
            </div>
          </Show>
        </Message>
        <Show when={showReply() && !props.isLastMessage}>
          <Message
            setThreadAppendMountTarget={(el) => setThreadAppendMountTarget(el)}
            shouldShowThreadAppendInput={createSignal(true)[0]}
            isFirstMessage={false}
            isLastMessage={false}
            senderId={userId()}
            threadDepth={1}
            focused={false}
            isFirstInThread
            isLastInThread
            unfocusable
          >
            <Message.TopBar name={currentUserName()} />
            <div class="h-4" />
          </Message>
          <Portal mount={threadAppendMountTarget()}>
            <EmailInput
              replyingTo={() => props.message}
              setShowReply={setShowReply}
              draft={draftChild()}
            />
          </Portal>
        </Show>
      </div>
    </div>
  );
}
