import { Show } from 'solid-js';

interface EmailSnippetProps {
  snippet?: string;
  subject?: string;
}

/**
 * Displays email snippet with responsive layout
 * - Wide screens: snippet inline after subject
 * - Narrow screens: snippet below subject
 */
export function EmailSnippet(props: EmailSnippetProps) {
  return (
    <Show when={props.snippet}>
      {(snippet) => (
        <>
          {/* Snippet inline in wide mode */}
          <div class="truncate shrink grow opacity-60 @max-md/uList:hidden">
            {snippet()}
          </div>
          {/* Snippet below subject in narrow mode */}
          <div class="hidden @max-md/uList:block truncate w-full text-xs touch:mobile-width:text-sm opacity-60">
            {snippet()}
          </div>
        </>
      )}
    </Show>
  );
}
