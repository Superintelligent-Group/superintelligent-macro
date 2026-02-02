import { Show } from 'solid-js';
import type { ContentHitData, SearchLocation } from '../../types/search';
import { SearchContent } from './search-content';
import { SearchSender } from './search-sender';
import { SearchTimestamp } from './search-timestamp';
import { cn } from '@ui/utils/classname';
import { UserIcon } from '@core/component/UserIcon';
import { SearchLocation as SearchLoc } from './search-location';

interface SearchContentHitRowProps {
  hit: ContentHitData;
  onClick?: (location?: SearchLocation) => void;
  index?: number;
  count?: number;
}

function getSenderId(hit: ContentHitData): string | undefined {
  if (hit.type === 'channel' || hit.type === 'email') {
    return hit.senderId;
  }
}

export function SearchContentHitRow(props: SearchContentHitRowProps) {
  const senderId = () => getSenderId(props.hit);
  const handleClick = () => {
    if (props.hit.location) {
      props.onClick?.(props.hit.location);
    } else {
      props.onClick?.();
    }
  };

  return (
    <div
      class={cn(
        'border border-edge-muted/50 rounded-xs p-3 my-1 hover:bg-surface-hover flex items-start'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div class="flex flex-col gap-3">
        <Show when={props.hit.type === 'channel' || props.hit.type === 'email'}>
          <div class="flex items-center gap-1">
            <Show when={senderId()}>
              {(id) => <UserIcon id={id()} size="xs" />}
            </Show>
            <span class="text-xs text-ink-muted">
              <SearchSender hit={props.hit} />
              <span class="text-ink-extra-muted/50">
                {' - '}
                <SearchTimestamp hit={props.hit} />
              </span>
            </span>
          </div>
        </Show>
        <Show when={props.hit.type === 'pdf'}>
          <SearchLoc hit={props.hit} />
        </Show>
        <SearchContent hit={props.hit} />
      </div>
    </div>
  );
}
