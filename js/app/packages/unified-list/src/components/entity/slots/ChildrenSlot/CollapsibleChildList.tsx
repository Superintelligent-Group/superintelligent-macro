/**
 * CollapsibleChildList - Renders children with expand/collapse functionality.
 *
 * Features:
 * - Configurable max visible items
 * - [+N more] button for collapsed state
 * - Thread border connectors
 * - Support for child-level focus (future keyboard nav)
 */

import { Show, For, createSignal, type JSX } from 'solid-js';
import type { ChildRowConfig, ChildItemId } from '../../types';
import { ChildRow, ThreadBorder } from './ChildRow';

// ============================================================================
// Types
// ============================================================================

export type CollapsibleChildListProps<TChild> = {
  /** Array of children to render */
  children: TChild[];
  /** Configuration for rendering each child row */
  rowConfig: ChildRowConfig<TChild>;
  /** Maximum visible children before collapse */
  maxVisible: number;
  /** Whether the list is collapsible */
  collapsible: boolean;
  /** Custom "show more" label function */
  moreLabel: (count: number) => string;
  /** Generate unique child ID for selection targeting */
  getChildId: (child: TChild, index: number) => ChildItemId;
  /** Currently focused child ID (for keyboard navigation) */
  focusedChildId?: ChildItemId | null;
};

// ============================================================================
// Component
// ============================================================================

/**
 * CollapsibleChildList - renders children with expand/collapse functionality.
 */
export function CollapsibleChildList<TChild>(
  props: CollapsibleChildListProps<TChild>
): JSX.Element {
  const [showAll, setShowAll] = createSignal(false);

  const visibleItems = () => {
    if (props.children.length <= props.maxVisible || showAll()) {
      return props.children;
    }
    return props.children.slice(0, props.maxVisible);
  };

  const hasMore = () =>
    props.collapsible && props.children.length > props.maxVisible;

  const hiddenCount = () => props.children.length - props.maxVisible;

  return (
    <>
      <For each={visibleItems()}>
        {(child, index) => {
          const childId = () => props.getChildId(child, index());
          return (
            <ChildRow
              child={child}
              index={index()}
              totalCount={props.children.length}
              childId={childId()}
              isChildFocused={props.focusedChildId === childId()}
              config={props.rowConfig}
            />
          );
        }}
      </For>

      <Show when={hasMore()}>
        <div class="h-5 relative">
          <ThreadBorder />
          <button
            type="button"
            class="block w-fit px-2 py-0.5 text-[10px] border border-edge uppercase font-mono hover:font-medium"
            onClick={(e) => {
              e.stopPropagation();
              setShowAll((prev) => !prev);
            }}
            data-blocks-navigation
          >
            <Show when={!showAll()} fallback={<>Collapse</>}>
              {props.moreLabel(hiddenCount())}
            </Show>
          </button>
        </div>
      </Show>
    </>
  );
}
