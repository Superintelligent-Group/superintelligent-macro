/**
 * ChildrenSlot - Main container for rendering child items.
 *
 * Features:
 * - Renders children in a collapsible list
 * - Configurable via ChildrenSlotConfig
 * - CSS positioned to prevent cutoff issues
 * - Support for child-level identification for future navigation
 */

import { Show, type JSX, type Accessor } from 'solid-js';
import type { ChildrenSlotConfig, ChildItemId } from '../../types';
import { CollapsibleChildList } from './CollapsibleChildList';

// ============================================================================
// Types
// ============================================================================

export type ChildrenSlotProps<TChild> = ChildrenSlotConfig<TChild> & {
  /** Reactive children array */
  children: Accessor<TChild[]>;
  /** Parent entity ID for child ID generation */
  parentId: string;
  /** Currently focused child ID (for keyboard navigation) */
  focusedChildId?: ChildItemId | null;
};

// ============================================================================
// Defaults
// ============================================================================

/** Default child ID generator: {parentId}:{index} */
function defaultGetChildId<TChild>(
  _child: TChild,
  index: number,
  parentId: string
): ChildItemId {
  return `${parentId}:${index}`;
}

/** Default "more" label */
function defaultMoreLabel(count: number): string {
  return `+ ${count} More`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ChildrenSlot - unified slot for rendering child items.
 *
 * CSS positioning:
 * - Spans col 2-4 (after indicator, full width)
 * - Uses overflow-visible to prevent cutoff
 * - Bottom padding for visual separation
 */
export function ChildrenSlot<TChild>(
  props: ChildrenSlotProps<TChild>
): JSX.Element {
  const children = () => props.children();
  const hasChildren = () => children().length > 0;

  const getChildId = (child: TChild, index: number): ChildItemId =>
    props.getChildId
      ? props.getChildId(child, index)
      : defaultGetChildId(child, index, props.parentId);

  return (
    <Show when={hasChildren()}>
      {/*
        CSS grid placement: spans columns 2-4 (after indicator, full width)
        Uses pb-2 for bottom padding to prevent cutoff
        overflow-visible ensures children are not clipped
      */}
      <div class="relative col-start-2 col-end-4 row-start-2 pb-2 overflow-visible">
        <CollapsibleChildList
          children={children()}
          rowConfig={props.rowConfig}
          maxVisible={props.maxVisible ?? 3}
          collapsible={props.collapsible ?? true}
          moreLabel={props.moreLabel ?? defaultMoreLabel}
          getChildId={getChildId}
          focusedChildId={props.focusedChildId}
        />
      </div>
    </Show>
  );
}
