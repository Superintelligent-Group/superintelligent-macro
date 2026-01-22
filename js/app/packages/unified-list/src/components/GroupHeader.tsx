/**
 * GroupHeader - Collapsible group section header component.
 *
 * Renders a Linear-style group header with:
 * - Collapse/expand chevron
 * - Optional icon
 * - Group label
 * - Item count badge
 */

import { Show, type JSX } from 'solid-js';
import type { GroupHeaderProps } from '../types/groupBy';

/** Default height for group headers */
export const GROUP_HEADER_HEIGHT = 36;

// ============================================================================
// Chevron Icon
// ============================================================================

/** Animated chevron icon for collapse/expand state */
function ChevronIcon(props: { collapsed: boolean }): JSX.Element {
  return (
    <svg
      class="size-3.5 text-ink-muted/70 transition-transform duration-150 ease-out"
      classList={{
        '-rotate-90': props.collapsed,
        'rotate-90': !props.collapsed,
      }}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

// ============================================================================
// Group Header Component
// ============================================================================

/** Default group header component - Linear-style design */
export function GroupHeader(props: GroupHeaderProps): JSX.Element {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    props.onToggle(props.groupId);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      props.onToggle(props.groupId);
    }
  };

  return (
    <div
      class="group-header flex items-center gap-1.5 px-3 h-9 bg-accent/[0.03] border-y border-ink/[0.04] cursor-pointer select-none transition-colors hover:bg-accent/[0.06]"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={-1}
      aria-expanded={!props.collapsed}
      data-group-header
      data-group-id={props.groupId}
    >
      {/* Collapse chevron */}
      <ChevronIcon collapsed={props.collapsed} />

      {/* Icon */}
      <Show when={props.icon}>
        {(icon) => (
          <span class="flex size-4 items-center justify-center shrink-0 text-accent">
            {icon()()}
          </span>
        )}
      </Show>

      {/* Label */}
      <span class="text-[13px] font-medium text-ink/90 truncate">
        {props.label}
      </span>

      {/* Count badge */}
      <span class="ml-1 px-1.5 py-0.5 rounded text-[11px] text-ink-muted bg-ink/[0.06] tabular-nums">
        {props.count}
      </span>
    </div>
  );
}
