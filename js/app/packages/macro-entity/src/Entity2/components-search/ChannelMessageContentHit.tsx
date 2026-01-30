import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import { UserIcon } from 'core/component/UserIcon';
import { tryMacroId, useDisplayName } from 'core/user';
import type { ChannelContentHitData } from '../../types/search';
import { createFormattedDate } from '../utils/search-display';

interface ChannelMessageContentHitProps {
  data: ChannelContentHitData;
}

/**
 * Content hit component for channel messages
 * Displays sender avatar, name, timestamp, and message content
 */
export function ChannelMessageContentHit(props: ChannelMessageContentHitProps) {
  const [userName] = useDisplayName(tryMacroId(props.data.senderId));

  return (
    <div class="flex gap-2 items-center min-w-0">
      <div class="flex size-5 shrink-0 items-center justify-center">
        <UserIcon id={props.data.senderId} size="xs" />
      </div>
      <div class="flex gap-2 w-full min-w-0 overflow-hidden items-baseline">
        <div class="shrink-0 truncate min-w-0 font-medium">{userName()}</div>
        <div class="shrink-0 font-mono text-xs touch:mobile-width:text-sm uppercase text-ink-extra-muted">
          {createFormattedDate(props.data.sentAt)}
        </div>
        <div class="text-ink-muted truncate flex items-center flex-1 min-w-0">
          <StaticMarkdown
            markdown={props.data.content}
            theme={unifiedListMarkdownTheme}
            singleLine={true}
          />
        </div>
      </div>
    </div>
  );
}
