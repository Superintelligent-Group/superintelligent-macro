import { For, Show, createSignal, type JSX } from 'solid-js';

interface CollapsibleListProps<T> {
  items: T[];
  visibleCount?: number;
  children: (item: T, index?: number, count?: number) => JSX.Element;
  threadBorder?: boolean;
}

/**
 * Generic collapsible list component
 * - Shows a limited number of items initially
 * - Provides "Show N more" / "Collapse" buttons
 * - Supports thread border for visual hierarchy
 */
export function CollapsibleList<T>(props: CollapsibleListProps<T>) {
  const [showAll, setShowAll] = createSignal(false);
  const visibleCount = () => props.visibleCount ?? 3;

  const visibleItems = () => {
    if (props.items.length <= visibleCount() || showAll()) {
      return props.items;
    }
    return props.items.slice(0, visibleCount());
  };

  const count = () => props.items.length;
  const hasMore = () => props.items.length > visibleCount();

  return (
    <>
      <For each={visibleItems()}>
        {(child, index) => props.children(child, index(), count())}
      </For>
      <Show when={hasMore()}>
        <div class="h-5 relative">
          <Show when={props.threadBorder}>
            {/* Thread border connector */}
            <div
              class="absolute left-[calc(0.5rem+1px)] w-[1px] border-l border-edge-muted -top-0.75"
              style={{ height: '6px' }}
            />
          </Show>
          <button
            type="button"
            class="block w-fit px-2 py-0.5 text-xxs border border-edge uppercase font-mono hover:font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setShowAll((prev) => !prev);
            }}
            data-blocks-navigation
          >
            <Show when={!showAll()} fallback="Collapse">
              + {props.items.length - visibleCount()} More
            </Show>
          </button>
        </div>
      </Show>
    </>
  );
}
