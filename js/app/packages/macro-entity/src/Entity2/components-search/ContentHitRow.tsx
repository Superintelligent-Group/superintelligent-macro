import { Show, Switch, Match } from 'solid-js';
import type { ContentHitData, SearchLocation } from '../../types/search';
import { ChannelMessageContentHit } from './ChannelMessageContentHit';
import { EmailMessageContentHit } from './EmailMessageContentHit';
import { GenericContentHit } from './GenericContentHit';

interface ContentHitRowProps {
  data: ContentHitData;
  allData: ContentHitData[];
  onClick?: (location?: SearchLocation) => void;
  index?: number;
  count?: number;
}

/**
 * Dispatcher component for content hit rows
 * Routes to the correct hit renderer based on content type
 * Wraps hits in a CollapsibleListRow for consistent behavior
 */
export function ContentHitRow(props: ContentHitRowProps) {
  const match = (): [number, number] | undefined => {
    if (props.index !== undefined && props.count !== undefined) {
      return [props.index, props.count];
    }
  };

  // const handleClick = (_e: RowClickEvent) => {
  //   props.onClick?.(props.data.location);
  // };

  return (
    <div
    // blockNavigation
    // onClick={handleClick}
    // showThreadBorder={props.data.type === 'channel'}
    >
      <Switch>
        <Match when={props.data.type === 'channel' && props.data}>
          {(data) => <ChannelMessageContentHit data={data()} />}
        </Match>
        <Match when={props.data.type === 'email' && props.data}>
          {(data) => (
            <EmailMessageContentHit
              allData={props.allData as any}
              data={data()}
            />
          )}
        </Match>
        <Match when={true}>
          <div class="flex gap-2 items-center min-w-0 w-full">
            <div class="flex size-5 shrink-0 items-center justify-center">
              <div class="h-4/5 border-l border-b w-2 border-edge-muted -translate-y-2 translate-x-[calc(0.25em-1px)]" />
            </div>
            <Show when={match()}>
              {(match) => (
                <span class="font-mono text-xs touch:mobile-width:text-sm text-ink-disabled/50">
                  {match()[0] + 1}/{match()[1]}
                </span>
              )}
            </Show>
            <GenericContentHit data={props.data} />
          </div>
        </Match>
      </Switch>
    </div>
  );
}
