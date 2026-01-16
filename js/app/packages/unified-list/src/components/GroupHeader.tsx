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
import type { GroupHeaderProps, GroupHeaderRenderer } from '../types/groupBy';

/** Default height for group headers */
export const GROUP_HEADER_HEIGHT = 36;

// ============================================================================
// Chevron Icon
// ============================================================================

/** Animated chevron icon for collapse/expand state */
function ChevronIcon(props: { collapsed: boolean }): JSX.Element {
  return (
    <svg
      class="size-4 text-ink-muted transition-transform duration-150"
      classList={{ '-rotate-90': props.collapsed }}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
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
      class="group-header flex items-center gap-2 px-3 h-9 bg-panel border-b border-edge cursor-pointer select-none transition-colors hover:bg-hover"
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
          <span class="flex size-4 items-center justify-center shrink-0 text-ink-muted">
            {icon()()}
          </span>
        )}
      </Show>

      {/* Label */}
      <span class="text-sm font-medium text-ink truncate">{props.label}</span>

      {/* Count badge */}
      <span class="ml-auto text-xs text-ink-muted tabular-nums font-mono">
        {props.count}
      </span>
    </div>
  );
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a custom group header renderer */
export function createGroupHeaderRenderer(
  customRender: (props: GroupHeaderProps) => JSX.Element
): GroupHeaderRenderer {
  return customRender;
}

/** Create a minimal header (just label and count) */
export function createMinimalGroupHeader(): GroupHeaderRenderer {
  return (props) => (
    <div
      class="flex items-center gap-2 px-3 h-7 bg-hover/50 cursor-pointer select-none"
      onClick={() => props.onToggle(props.groupId)}
    >
      <ChevronIcon collapsed={props.collapsed} />
      <span class="text-xs font-medium text-ink-muted uppercase tracking-wide">
        {props.label}
      </span>
      <span class="text-xs text-ink-extra-muted tabular-nums">
        ({props.count})
      </span>
    </div>
  );
}

/** Create a sticky header with shadow effect */
export function createStickyGroupHeader(): GroupHeaderRenderer {
  return (props) => (
    <div
      class="group-header flex items-center gap-2 px-3 h-9 bg-panel border-b border-edge cursor-pointer select-none sticky top-0 z-10 shadow-sm"
      onClick={() => props.onToggle(props.groupId)}
      role="button"
      tabIndex={-1}
      aria-expanded={!props.collapsed}
      data-group-header
      data-group-id={props.groupId}
    >
      <ChevronIcon collapsed={props.collapsed} />
      <Show when={props.icon}>
        {(icon) => (
          <span class="flex size-4 items-center justify-center shrink-0 text-ink-muted">
            {icon()()}
          </span>
        )}
      </Show>
      <span class="text-sm font-medium text-ink truncate">{props.label}</span>
      <span class="ml-auto text-xs text-ink-muted tabular-nums font-mono">
        {props.count}
      </span>
    </div>
  );
}
