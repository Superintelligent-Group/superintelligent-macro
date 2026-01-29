import { tryMacroId, useDisplayName } from 'core/user';
import type { ChannelEntity } from '../../types/entity';

/**
 * Extracts and formats the last message from a channel entity.
 * Returns the message content with the sender's display name if available.
 */
export function ExtractorLastMessage(props: { entity: ChannelEntity }) {
  const latestMessage = () => props.entity.latestMessage;

  const senderDisplayName = () => {
    const message = latestMessage();
    if (!message) return undefined;
    return useDisplayName(tryMacroId(message.senderId))[0]();
  };

  const formattedMessage = () => {
    const message = latestMessage();
    if (!message) return undefined;

    const senderName = senderDisplayName();
    const prefix = senderName ? `${senderName}: ` : '';

    // Truncate long messages and handle line breaks
    const cleanContent = message.content.replace(/\n/g, ' ').trim();

    return `${prefix}${cleanContent}`;
  };

  return <>{formattedMessage()}</>;
}
