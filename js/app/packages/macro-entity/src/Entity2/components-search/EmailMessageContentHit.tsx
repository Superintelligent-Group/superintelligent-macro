import { Show, createMemo } from 'solid-js';
import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import { UserIcon } from 'core/component/UserIcon';
import type { EmailContentHitData } from '../../types/search';
import {
  shouldShowSenderName,
  shouldShowSentDate,
  createFormattedDate,
} from '../utils/search-display';

interface EmailMessageContentHitProps {
  data: EmailContentHitData;
  allData: EmailContentHitData[];
}

/**
 * Content hit component for email messages
 * Conditionally displays sender and timestamp based on whether
 * all hits are from the same sender or date
 */
export function EmailMessageContentHit(props: EmailMessageContentHitProps) {
  const isSingleMatch = createMemo(() => props.allData.length === 1);

  const showSenderName = createMemo(() =>
    shouldShowSenderName(props.allData, isSingleMatch())
  );

  const showSentDate = createMemo(() =>
    shouldShowSentDate(props.allData, isSingleMatch())
  );

  return (
    <div class="flex gap-2 items-center min-w-0">
      <div class="flex size-5 shrink-0 items-center justify-center">
        <UserIcon id={props.data.senderId} size="xs" />
      </div>
      <div class="flex gap-2 w-full min-w-0 overflow-hidden items-baseline">
        <Show when={showSenderName()}>
          <div class="shrink-0 truncate min-w-0 font-medium">
            {props.data.sender}
          </div>
        </Show>
        <Show when={showSentDate()}>
          <div class="shrink-0 font-mono text-xs touch:mobile-width:text-sm uppercase text-ink-extra-muted">
            {createFormattedDate(props.data.sentAt)}
          </div>
        </Show>
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
