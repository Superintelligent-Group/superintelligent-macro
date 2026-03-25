import {
  Channel as NewChannel,
  type ChannelHandle,
} from '@channel/Channel/Channel';
import { useBlockId } from '@core/block';
import { EntityPermissionsGate } from '@core/component/EntityPermissionsGate';
import { createMemo, Suspense } from 'solid-js';
import { blockHandleSignal } from '@core/signal/load';
import { createMethodRegistration } from '@core/orchestrator';
import { URL_PARAMS } from '@block-channel/constants';
import { useBlockEntityCommands } from '@app/component/next-soup/actions';
import { ChannelTopLeft } from './Top';
import { useChannelName, useChannelType } from '@core/context/channels';
import { useChannelParticipantsQuery } from '@queries/channel/channel-participants';
import { useGlobalNotificationSource } from '@app/component/GlobalAppState';

function NewTop(props: { channelId: string }) {
  const channelName = useChannelName(props.channelId);
  const channelType = useChannelType(props.channelId);
  const participantsQuery = useChannelParticipantsQuery(() => props.channelId);
  const participants = () =>
    participantsQuery.isLoading ? [] : participantsQuery.data;

  return (
    <Suspense>
      <ChannelTopLeft
        channelId={props.channelId}
        channelType={channelType()!}
        participants={participants() ?? []}
        channelName={channelName() ?? 'New Channel'}
      />
    </Suspense>
  );
}

export function NewChannelBlockAdapter() {
  useBlockEntityCommands();
  const channelId = useBlockId();
  const blockHandle = blockHandleSignal.get;
  const notificationSource = useGlobalNotificationSource();

  const unreadMessageIds = createMemo(() => {
    const ids = new Set<string>();
    for (const n of notificationSource.notifications()) {
      if (n.viewed_at || n.done) continue;
      if (n.entity_id !== channelId) continue;
      const meta = n.notification_metadata;
      if (
        meta.tag === 'channel_mention' ||
        meta.tag === 'channel_message_send' ||
        meta.tag === 'channel_message_reply'
      ) {
        ids.add(meta.content.messageId);
      }
    }
    return ids;
  });

  const onChannelReady = (handle: ChannelHandle) => {
    createMethodRegistration(blockHandle, {
      goToLocationFromParams: async (params: Record<string, unknown>) => {
        const threadId = params[URL_PARAMS.thread] as string | undefined;
        const messageId = params[URL_PARAMS.message] as string | undefined;

        // For compatibility the naming is  a little strange here.
        // New channels index by top level message and then spertately handle replies.
        // If we have a threadId that is actually the top level message and the reply is the message id.
        const topLevelMessageId = threadId ? threadId : messageId;
        const messageReplyId = threadId ? messageId : threadId;

        if (topLevelMessageId && handle) {
          handle.goToMessage(topLevelMessageId, messageReplyId);
        }
      },
    });
  };

  return (
    <EntityPermissionsGate entityType="channel" entityId={channelId}>
      <NewChannel
        channelId={channelId}
        unreadMessageIds={unreadMessageIds}
        onHandleReady={onChannelReady}
      />
      <NewTop channelId={channelId} />
    </EntityPermissionsGate>
  );
}
