import { Show } from 'solid-js';

interface EmailSubjectSnippetProps {
  subject?: string;
  snippet?: string;
}

/**
 * Displays email subject and snippet joined with a dash
 * Both parts truncate together from the end
 */
export function EmailSubjectSnippet(props: EmailSubjectSnippetProps) {
  const subject = () => props.subject || '(No Subject)';

  return (
    <div class="truncate flex-1 min-w-0">
      <span class="font-medium">{subject()}</span>
      <Show when={props.snippet}>
        {(snippet) => (
          <span class="text-ink-muted font-normal"> - {snippet()}</span>
        )}
      </Show>
    </div>
  );
}
