import { Show, type ParentProps } from 'solid-js';
import { ThreadBorder } from './ThreadBorder';

export type RowClickEvent = MouseEvent;

interface CollapsibleListRowProps {
  onClick?: (e: RowClickEvent) => void;
  classList?: Record<string, boolean>;
  enableHover?: boolean;
  showThreadBorder?: boolean;
  blockNavigation?: boolean;
}

/**
 * Base row component for notification and content hit rows
 * - Provides consistent hover states
 * - Optional thread border connector
 * - Optional navigation blocking (data-blocks-navigation)
 */
export function CollapsibleListRow(
  props: ParentProps<CollapsibleListRowProps>
) {
  return (
    <div class="relative flex gap-1 items-center min-w-0 h-8 transition-all">
      {props.children}
    </div>
  );
}
