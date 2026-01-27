import { formatDocumentName } from '@service-storage/util/filename';
import { match } from 'ts-pattern';
import { StaticMarkdown } from 'core/component/LexicalMarkdown/component/core/StaticMarkdown';
import { unifiedListMarkdownTheme } from 'core/component/LexicalMarkdown/theme';
import { createMemo, Show } from 'solid-js';
import type { EntityData } from '../../types/entity';
import { isSearchEntity } from '../../queries/search';

interface EntityExtractorTitleProps {
  entity: EntityData;
  highlightText?: string;
}

function extractRawTitle(entity: EntityData): string {
  return match(entity)
    .with({ type: 'document' }, (e) => formatDocumentName(e.name))
    .with({ type: 'project' }, (e) => e.name)
    .with({ type: 'channel' }, (e) => e.name)
    .with({ type: 'email' }, (e) => e.name || '(No Subject)')
    .with({ type: 'chat' }, (e) => e.name)
    .otherwise(() => 'Unknown');
}

function extractSearchHighlight(entity: EntityData): string | undefined {
  // Search entities can have highlighted markdown version
  if (!isSearchEntity(entity)) return undefined;

  // Check if entity has a nameHighlight field
  return entity.search.nameHighlight ?? undefined;
}

export function ExtractorTitle(props: EntityExtractorTitleProps) {
  const titleData = createMemo(() => {
    // Try search highlight first
    const searchHighlight = extractSearchHighlight(props.entity);
    if (searchHighlight) {
      return {
        text: searchHighlight,
        isMarkdown: true,
      };
    }

    // Fall back to raw title
    const rawTitle = extractRawTitle(props.entity);
    return {
      text: rawTitle,
      isMarkdown: false,
    };
  });

  return (
    <Show
      when={titleData().isMarkdown}
      fallback={<span class="truncate">{titleData().text}</span>}
    >
      <StaticMarkdown
        markdown={titleData().text}
        theme={unifiedListMarkdownTheme}
        singleLine={true}
      />
    </Show>
  );
}
