import { Show, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import type { Notification } from '../../types/notification';
import type { RowClickEvent } from '../components/CollapsibleListRow';
import { extractMessageContent } from '../utils/notification-display';
import { formatTimestamp } from '../utils/timestamp';
import { DisplayName } from '../components/DisplayName';
import { NotificationRowContainer } from './NotificationRowContainer';

interface NotificationRowProps {
  notification: Notification;
  onClick?: (e: RowClickEvent) => void;
  icon?: (props: { class?: string }) => JSX.Element;
}

/**
 * Single notification display component
 * Shows sender avatar/icon, sender name, action text, message content, and timestamp
 */
export function NotificationRow(props: NotificationRowProps) {
  const messageContent = () => extractMessageContent(props.notification);

  return (
    <NotificationRowContainer
      icon={
        <Show when={props.icon}>
          <Dynamic component={props.icon} class="size-4 text-ink-extra-muted" />
        </Show>
      }
      content={
        <>
          <Show when={!props.icon && props.notification.senderId}>
            {(id) => (
              <span class="font-semibold">
                <DisplayName id={id()} format="firstName" />
              </span>
            )}
          </Show>
          <Show when={messageContent()}>
            {(content) => (
              <Show
                when={content().trim()}
                fallback={
                  <span class="italic text-ink-disabled">Attached items</span>
                }
              >
                {(trimmedContent) => (
                  <StaticMarkdown
                    markdown={trimmedContent()}
                    theme={unifiedListMarkdownTheme}
                    singleLine={true}
                  />
                )}
              </Show>
            )}
          </Show>
        </>
      }
      timestamp={formatTimestamp(props.notification.createdAt)}
    />
  );
}
