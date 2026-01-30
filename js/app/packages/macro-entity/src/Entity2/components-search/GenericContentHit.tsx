import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import type { ContentHitData } from '../../types/search';

interface GenericContentHitProps {
  data: ContentHitData;
}

/**
 * Fallback component for generic content hits
 * Displays markdown content with minimal styling
 */
export function GenericContentHit(props: GenericContentHitProps) {
  return (
    <div class="text-ink-muted truncate flex items-center">
      <StaticMarkdown
        markdown={props.data.content}
        theme={unifiedListMarkdownTheme}
        singleLine={true}
      />
    </div>
  );
}
