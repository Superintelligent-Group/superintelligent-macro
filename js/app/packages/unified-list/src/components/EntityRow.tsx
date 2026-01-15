/**
 * Entity Row - composable entity rendering with slots.
 *
 * Design:
 * - Slot-based architecture for flexible composition
 * - Pre-built slot renderers for common entity parts
 * - Grid/flex layout options
 * - Fully type-safe
 */

import {
  type JSX,
  type ParentProps,
  type Accessor,
  createContext,
  useContext,
  Show,
  createMemo,
} from 'solid-js';

// ============================================================================
// Entity Row Types
// ============================================================================

/** Slot names for entity row */
export type EntityRowSlot =
  | 'indicator' // Unread dot, important marker
  | 'checkbox' // Selection checkbox
  | 'icon' // Entity type icon
  | 'title' // Entity name/title
  | 'subtitle' // Secondary text (latest message, snippet)
  | 'metadata' // Project path, shared badge
  | 'timestamp' // Last updated, created
  | 'badge' // Status badges
  | 'actions' // Action buttons (done, delete)
  | 'properties' // Task properties
  | 'notifications' // Notification rollout
  | 'content'; // Search content hits

/** Props passed to slot renderers */
export type SlotRenderProps<T> = {
  entity: T;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  isHovered: boolean;
};

/** Slot renderer type */
export type SlotRenderer<T> = (props: SlotRenderProps<T>) => JSX.Element | null;

/** Layout configuration */
export type EntityRowLayout = 'default' | 'compact' | 'expanded';

/** Entity row configuration */
export type EntityRowConfig<T> = {
  /** Slot renderers */
  slots: Partial<Record<EntityRowSlot, SlotRenderer<T>>>;
  /** Layout mode */
  layout?: EntityRowLayout;
  /** Row height in pixels */
  height?: number;
  /** Click handler */
  onClick?: (entity: T, event: MouseEvent) => void;
  /** Double click handler */
  onDoubleClick?: (entity: T, event: MouseEvent) => void;
  /** Pointer down handler */
  onPointerDown?: (entity: T, event: PointerEvent) => void;
};

// ============================================================================
// Entity Row Context
// ============================================================================

type EntityRowContextValue<T> = {
  entity: Accessor<T>;
  index: Accessor<number>;
  isFocused: Accessor<boolean>;
  isSelected: Accessor<boolean>;
  isHovered: Accessor<boolean>;
  config: EntityRowConfig<T>;
};

const EntityRowContext = createContext<EntityRowContextValue<unknown>>();

/** Hook to access entity row context */
export function useEntityRowContext<T>(): EntityRowContextValue<T> {
  const context = useContext(EntityRowContext);
  if (!context) {
    throw new Error('useEntityRowContext must be used within EntityRow');
  }
  return context as EntityRowContextValue<T>;
}

// ============================================================================
// Entity Row Component
// ============================================================================

export type EntityRowProps<T> = {
  entity: T;
  index: number;
  isFocused: boolean;
  isSelected: boolean;
  config: EntityRowConfig<T>;
  ref?: (el: HTMLDivElement) => void;
};

/** Entity row component with slot-based rendering */
export function EntityRow<T>(props: EntityRowProps<T>): JSX.Element {
  const [isHovered, setIsHovered] = createSignal(false);

  const contextValue: EntityRowContextValue<T> = {
    entity: () => props.entity,
    index: () => props.index,
    isFocused: () => props.isFocused,
    isSelected: () => props.isSelected,
    isHovered,
    config: props.config,
  };

  const renderProps = createMemo<SlotRenderProps<T>>(() => ({
    entity: props.entity,
    index: props.index,
    isFocused: props.isFocused,
    isSelected: props.isSelected,
    isHovered: isHovered(),
  }));

  const handleClick = (event: MouseEvent) => {
    props.config.onClick?.(props.entity, event);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    props.config.onDoubleClick?.(props.entity, event);
  };

  const handlePointerDown = (event: PointerEvent) => {
    props.config.onPointerDown?.(props.entity, event);
  };

  const layout = props.config.layout ?? 'default';
  const height = props.config.height ?? 40;

  return (
    <EntityRowContext.Provider
      value={contextValue as EntityRowContextValue<unknown>}
    >
      <div
        ref={props.ref}
        role="button"
        tabIndex={0}
        class={getRowClasses(layout, props.isFocused, props.isSelected)}
        style={{ 'min-height': `${height}px` }}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-entity-id={hasId(props.entity) ? props.entity.id : undefined}
      >
        <EntityRowLayout
          layout={layout}
          slots={props.config.slots}
          renderProps={renderProps}
        />
      </div>
    </EntityRowContext.Provider>
  );
}

// Import at the end to avoid hoisting issues
import { createSignal } from 'solid-js';

// ============================================================================
// Entity Row Layout
// ============================================================================

type EntityRowLayoutProps<T> = {
  layout: EntityRowLayout;
  slots: Partial<Record<EntityRowSlot, SlotRenderer<T>>>;
  renderProps: Accessor<SlotRenderProps<T>>;
};

function EntityRowLayout<T>(props: EntityRowLayoutProps<T>): JSX.Element {
  const { slots, renderProps } = props;

  // Default layout: grid with 3 columns
  // [indicator/checkbox] [icon + title + subtitle] [metadata + timestamp + actions]
  return (
    <>
      {/* Left column: indicator/checkbox */}
      <div class="flex items-center justify-center w-8 shrink-0">
        <Show when={slots.indicator}>
          {(renderer) => renderer()(renderProps())}
        </Show>
        <Show when={slots.checkbox}>
          {(renderer) => renderer()(renderProps())}
        </Show>
      </div>

      {/* Middle column: main content */}
      <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* Title row */}
        <div class="flex items-center gap-2 min-w-0">
          <Show when={slots.icon}>
            {(renderer) => renderer()(renderProps())}
          </Show>
          <Show when={slots.title}>
            {(renderer) => (
              <div class="flex-1 min-w-0 truncate">
                {renderer()(renderProps())}
              </div>
            )}
          </Show>
        </div>

        {/* Subtitle row */}
        <Show when={slots.subtitle}>
          {(renderer) => (
            <div class="text-sm text-ink-muted truncate">
              {renderer()(renderProps())}
            </div>
          )}
        </Show>

        {/* Content hits (search results) */}
        <Show when={slots.content}>
          {(renderer) => renderer()(renderProps())}
        </Show>

        {/* Notifications */}
        <Show when={slots.notifications}>
          {(renderer) => renderer()(renderProps())}
        </Show>
      </div>

      {/* Right column: metadata, timestamp, actions */}
      <div class="flex items-center gap-2 shrink-0">
        <Show when={slots.metadata}>
          {(renderer) => renderer()(renderProps())}
        </Show>
        <Show when={slots.badge}>
          {(renderer) => renderer()(renderProps())}
        </Show>
        <Show when={slots.properties}>
          {(renderer) => renderer()(renderProps())}
        </Show>
        <Show when={slots.timestamp}>
          {(renderer) => (
            <div class="text-xs text-ink-muted font-mono w-[8ch] text-right">
              {renderer()(renderProps())}
            </div>
          )}
        </Show>
        <Show when={slots.actions}>
          {(renderer) => (
            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
              {renderer()(renderProps())}
            </div>
          )}
        </Show>
      </div>
    </>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function getRowClasses(
  layout: EntityRowLayout,
  isFocused: boolean,
  isSelected: boolean
): string {
  const base =
    'group flex items-center gap-2 px-2 cursor-pointer transition-colors';

  const focusClasses = isFocused
    ? 'bg-accent/10 outline outline-1 outline-accent/30 outline-offset-[-1px]'
    : 'hover:bg-hover/50';

  const selectedClasses = isSelected ? 'bg-accent/5' : '';

  return `${base} ${focusClasses} ${selectedClasses}`;
}

function hasId(entity: unknown): entity is { id: string } {
  return typeof entity === 'object' && entity !== null && 'id' in entity;
}

// ============================================================================
// Pre-built Slot Renderers
// ============================================================================

/** Create an unread indicator slot */
export function createUnreadIndicatorSlot<T>(
  isUnread: (entity: T) => boolean
): SlotRenderer<T> {
  return (props) => (
    <div
      class="w-1 h-1 rounded-full"
      classList={{ 'bg-accent': isUnread(props.entity) }}
    />
  );
}

/** Create a checkbox slot */
export function createCheckboxSlot<T>(
  isChecked: (entity: T) => boolean,
  onToggle: (entity: T) => void
): SlotRenderer<T> {
  return (props) => (
    <button
      type="button"
      class="w-4 h-4 rounded border border-ink-muted flex items-center justify-center"
      classList={{ 'bg-accent border-accent': isChecked(props.entity) }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(props.entity);
      }}
    >
      <Show when={isChecked(props.entity)}>
        <svg class="w-3 h-3 text-white" viewBox="0 0 12 12">
          <path
            fill="currentColor"
            d="M10.28 2.28a.75.75 0 0 0-1.06-1.06L4.5 5.94 2.78 4.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l5.25-5.25Z"
          />
        </svg>
      </Show>
    </button>
  );
}

/** Create a timestamp slot */
export function createTimestampSlot<T>(
  getTimestamp: (entity: T) => number | undefined
): SlotRenderer<T> {
  return (props) => {
    const timestamp = getTimestamp(props.entity);
    if (!timestamp) return null;
    return <>{formatRelativeTime(timestamp)}</>;
  };
}

/** Format timestamp as relative time */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(timestamp).toLocaleDateString();
  }
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'now';
}
