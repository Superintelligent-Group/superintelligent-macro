import { Show } from 'solid-js';
import type { EntityData } from '../../types/entity';
import type { SearchLocation } from '../../types/search';
import { isSearchEntity } from '../../queries/search';
import { CollapsibleList } from '../components/CollapsibleList';
import { ContentHitRow } from '../components-search/ContentHitRow';

interface ExtractorContentHitsProps {
  entity: EntityData;
  onClick?: (location?: SearchLocation) => void;
  visibleCount?: number;
}

/**
 * Extractor component for search content hits
 * Renders collapsible list of content hit rows
 */
export function ExtractorContentHits(props: ExtractorContentHitsProps) {
  const contentHits = () => {
    if (!isSearchEntity(props.entity)) return [];
    return props.entity.search.contentHitData ?? [];
  };

  return (
    <Show when={contentHits().length > 0}>
      <CollapsibleList
        items={contentHits()}
        visibleCount={props.visibleCount ?? 1}
        threadBorder
      >
        {(hit, index, count) => (
          <ContentHitRow
            data={hit}
            allData={contentHits()}
            onClick={props.onClick}
            index={index}
            count={count}
          />
        )}
      </CollapsibleList>
    </Show>
  );
}
