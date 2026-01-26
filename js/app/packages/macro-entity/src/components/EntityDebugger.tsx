/**
 * EntityDebugger - Interactive Visual Testing Environment
 *
 * A comprehensive debugging tool for the Entity component refactor that provides:
 * - Live entity grid displaying all entity types side-by-side
 * - Interactive controls for toggling layout variants and features
 * - Inspector panel showing extracted data and computed styles
 * - Console log for real-time debugging feedback
 *
 * Mount via: packages/app/component/split-layout/componentRegistry.tsx
 */

import { EntityWithEverything } from './EntityWithEverything';
import {
  ALL_CHANNEL_ENTITIES,
  ALL_DOCUMENT_ENTITIES,
  ALL_EMAIL_ENTITIES,
  ALL_MOCK_ENTITIES,
  ALL_SEARCH_ENTITIES,
  ALL_TASK_ENTITIES,
  MOCK_DOCUMENT_WITH_NOTIFICATIONS,
  MOCK_PROPERTIES,
  MOCK_TASK_WITH_PROPERTIES,
} from '../mocks/mockEntityData';
import type { EntityData } from '../types/entity';
import type { WithNotification } from '../types/notification';
import { createSignal, For, Show, type Component } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

type LayoutVariant = 'default' | 'compact' | 'expanded' | 'card';
type WidthVariant = 'mobile' | 'tablet' | 'desktop' | 'wide';

interface DebugLog {
  timestamp: number;
  type: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

interface EntityDebuggerState {
  layout: LayoutVariant;
  width: WidthVariant;
  showCheckbox: boolean;
  showProject: boolean;
  showProperties: boolean;
  showNotifications: boolean;
  showSearch: boolean;
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  checkedEntityIds: Set<string>;
  logs: DebugLog[];
}

// ============================================================================
// Width Configuration
// ============================================================================

const WIDTH_CONFIG: Record<WidthVariant, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px',
};

// ============================================================================
// Entity Categories
// ============================================================================

const ENTITY_CATEGORIES = [
  { name: 'Documents', entities: ALL_DOCUMENT_ENTITIES.slice(0, 3) },
  { name: 'Tasks', entities: ALL_TASK_ENTITIES.slice(0, 2) },
  { name: 'Emails', entities: ALL_EMAIL_ENTITIES.slice(0, 3) },
  { name: 'Channels', entities: ALL_CHANNEL_ENTITIES.slice(0, 3) },
  { name: 'Search Results', entities: ALL_SEARCH_ENTITIES.slice(0, 2) },
] as const;

// ============================================================================
// Debug Logging
// ============================================================================

const createDebugLog = (
  type: DebugLog['type'],
  message: string,
  data?: unknown
): DebugLog => ({
  timestamp: Date.now(),
  type,
  message,
  data,
});

// ============================================================================
// Main Component
// ============================================================================

export const EntityDebugger: Component = () => {
  const [state, setState] = createSignal<EntityDebuggerState>({
    layout: 'default',
    width: 'desktop',
    showCheckbox: true,
    showProject: true,
    showProperties: true,
    showNotifications: false,
    showSearch: false,
    selectedEntityId: null,
    hoveredEntityId: null,
    checkedEntityIds: new Set(),
    logs: [
      createDebugLog('info', 'EntityDebugger initialized', {
        entities: ALL_MOCK_ENTITIES.length,
      }),
    ],
  });

  const addLog = (type: DebugLog['type'], message: string, data?: unknown) => {
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, createDebugLog(type, message, data)],
    }));
  };

  const toggleChecked = (entityId: string) => {
    setState((prev) => {
      const newChecked = new Set(prev.checkedEntityIds);
      if (newChecked.has(entityId)) {
        newChecked.delete(entityId);
      } else {
        newChecked.add(entityId);
      }
      return { ...prev, checkedEntityIds: newChecked };
    });
    addLog('info', 'Entity checked state toggled', { entityId });
  };

  const selectEntity = (entityId: string) => {
    setState((prev) => ({ ...prev, selectedEntityId: entityId }));
    addLog('info', 'Entity selected', { entityId });
  };

  const selectedEntity = () => {
    const id = state().selectedEntityId;
    if (!id) return null;
    return ALL_MOCK_ENTITIES.find((e) => e.id === id);
  };

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderControlsPanel = () => (
    <div class="border-b border-edge p-4 bg-panel">
      <div class="flex flex-wrap gap-4 items-center">
        {/* Layout Selector */}
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium">Layout:</label>
          <select
            class="border border-edge rounded px-2 py-1 text-sm bg-panel"
            value={state().layout}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                layout: e.currentTarget.value as LayoutVariant,
              }))
            }
          >
            <option value="default">Default</option>
            <option value="compact">Compact</option>
            <option value="expanded">Expanded</option>
            <option value="card">Card</option>
          </select>
        </div>

        {/* Width Selector */}
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium">Width:</label>
          <select
            class="border border-edge rounded px-2 py-1 text-sm bg-panel"
            value={state().width}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                width: e.currentTarget.value as WidthVariant,
              }))
            }
          >
            <option value="mobile">Mobile (375px)</option>
            <option value="tablet">Tablet (768px)</option>
            <option value="desktop">Desktop (1024px)</option>
            <option value="wide">Wide (1440px)</option>
          </select>
        </div>

        {/* Feature Toggles */}
        <div class="flex items-center gap-4 ml-auto">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state().showCheckbox}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  showCheckbox: e.currentTarget.checked,
                }))
              }
            />
            Show Checkbox
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state().showProperties}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  showProperties: e.currentTarget.checked,
                }))
              }
            />
            Show Properties
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state().showNotifications}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  showNotifications: e.currentTarget.checked,
                }))
              }
            />
            Show Notifications
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state().showSearch}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  showSearch: e.currentTarget.checked,
                }))
              }
            />
            Search Mode
          </label>
        </div>
      </div>
    </div>
  );

  const renderEntityGrid = () => (
    <div
      class="flex-1 overflow-y-auto p-4 space-y-6"
      style={{ width: WIDTH_CONFIG[state().width] }}
    >
      <For each={ENTITY_CATEGORIES}>
        {(category) => (
          <div class="space-y-2">
            <h3 class="text-sm font-mono uppercase text-ink-muted">
              {category.name}
            </h3>
            <div class="space-y-1 border border-edge rounded-lg overflow-hidden">
              <For each={category.entities}>
                {(entity) => {
                  const isChecked = () =>
                    state().checkedEntityIds.has(entity.id);
                  const isSelected = () =>
                    state().selectedEntityId === entity.id;

                  // Add notifications if enabled
                  const entityWithFeatures = () => {
                    let result: WithNotification<EntityData> = {
                      ...entity,
                      notifications:
                        state().showNotifications &&
                        entity.id === MOCK_DOCUMENT_WITH_NOTIFICATIONS.id
                          ? MOCK_DOCUMENT_WITH_NOTIFICATIONS.notifications
                          : undefined,
                    };
                    return result;
                  };

                  return (
                    <div
                      onClick={() => selectEntity(entity.id)}
                      onMouseEnter={() =>
                        setState((prev) => ({
                          ...prev,
                          hoveredEntityId: entity.id,
                        }))
                      }
                      onMouseLeave={() =>
                        setState((prev) => ({
                          ...prev,
                          hoveredEntityId: null,
                        }))
                      }
                    >
                      <EntityWithEverything
                        entity={entityWithFeatures()}
                        selected={{
                          active: isSelected(),
                          muted: false,
                        }}
                        checked={isChecked()}
                        onChecked={() => toggleChecked(entity.id)}
                        onClick={(args) => {
                          addLog('info', 'Entity clicked', {
                            type: args.type,
                            entityId: args.entity.id,
                          });
                        }}
                        properties={
                          state().showProperties &&
                          entity.id === MOCK_TASK_WITH_PROPERTIES.id
                            ? MOCK_PROPERTIES
                            : undefined
                        }
                        showUnrollNotifications={state().showNotifications}
                        searchActive={state().showSearch}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );

  const renderInspectorPanel = () => (
    <div class="w-96 border-l border-edge overflow-y-auto bg-panel-muted">
      <div class="p-4 border-b border-edge bg-panel">
        <h2 class="text-sm font-mono uppercase font-medium">Inspector</h2>
      </div>
      <div class="p-4">
        <Show
          when={selectedEntity()}
          fallback={
            <div class="text-sm text-ink-muted italic">
              Select an entity to inspect
            </div>
          }
        >
          {(entity) => (
            <div class="space-y-4">
              {/* Entity Info */}
              <div>
                <h3 class="text-xs font-mono uppercase text-ink-muted mb-2">
                  Entity
                </h3>
                <div class="bg-panel border border-edge rounded p-3 space-y-1 text-xs font-mono">
                  <div>
                    <span class="text-ink-muted">ID:</span>{' '}
                    <span class="text-accent">{entity().id}</span>
                  </div>
                  <div>
                    <span class="text-ink-muted">Type:</span>{' '}
                    <span class="text-accent">{entity().type}</span>
                  </div>
                  <div>
                    <span class="text-ink-muted">Name:</span>{' '}
                    <span class="break-all">{entity().name}</span>
                  </div>
                  <div>
                    <span class="text-ink-muted">Owner:</span>{' '}
                    <span class="break-all">{entity().ownerId}</span>
                  </div>
                </div>
              </div>

              {/* State */}
              <div>
                <h3 class="text-xs font-mono uppercase text-ink-muted mb-2">
                  State
                </h3>
                <div class="bg-panel border border-edge rounded p-3 space-y-1 text-xs font-mono">
                  <div>
                    <span class="text-ink-muted">Selected:</span>{' '}
                    <span class="text-accent">
                      {state().selectedEntityId === entity().id ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span class="text-ink-muted">Hovered:</span>{' '}
                    <span class="text-accent">
                      {state().hoveredEntityId === entity().id ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span class="text-ink-muted">Checked:</span>{' '}
                    <span class="text-accent">
                      {state().checkedEntityIds.has(entity().id) ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 class="text-xs font-mono uppercase text-ink-muted mb-2">
                  Features
                </h3>
                <div class="bg-panel border border-edge rounded p-3 space-y-1 text-xs font-mono">
                  <div>
                    <span class="text-ink-muted">Project:</span>{' '}
                    <span class="text-accent">
                      {(() => {
                        const e = entity();
                        return 'projectId' in e && e.projectId
                          ? String(e.projectId)
                          : 'None';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span class="text-ink-muted">File Type:</span>{' '}
                    <span class="text-accent">
                      {(() => {
                        const e = entity();
                        return 'fileType' in e && e.fileType
                          ? String(e.fileType)
                          : 'N/A';
                      })()}
                    </span>
                  </div>
                  <div>
                    <span class="text-ink-muted">SubType:</span>{' '}
                    <span class="text-accent">
                      {(() => {
                        const e = entity();
                        return 'subType' in e && e.subType
                          ? String(e.subType.type)
                          : 'None';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Debug Data */}
              <div>
                <h3 class="text-xs font-mono uppercase text-ink-muted mb-2">
                  Raw Data
                </h3>
                <div class="bg-panel border border-edge rounded p-3">
                  <pre class="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(entity(), null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );

  const renderConsoleLog = () => (
    <div class="h-48 border-t border-edge overflow-hidden flex flex-col bg-panel-muted">
      <div class="p-2 border-b border-edge bg-panel flex items-center justify-between">
        <h2 class="text-xs font-mono uppercase font-medium">Console</h2>
        <button
          class="text-xs font-mono px-2 py-1 border border-edge rounded hover:bg-hover"
          onClick={() => setState((prev) => ({ ...prev, logs: [] }))}
        >
          Clear
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
        <For each={state().logs.slice(-50).reverse()}>
          {(log) => (
            <div
              class="flex gap-2"
              classList={{
                'text-info': log.type === 'info',
                'text-warning': log.type === 'warn',
                'text-error': log.type === 'error',
              }}
            >
              <span class="text-ink-extra-muted shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span class="shrink-0">[{log.type.toUpperCase()}]</span>
              <span class="flex-1">{log.message}</span>
              <Show when={log.data}>
                <span class="text-ink-muted">
                  {JSON.stringify(log.data).substring(0, 50)}...
                </span>
              </Show>
            </div>
          )}
        </For>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div class="h-screen flex flex-col bg-panel text-ink">
      {/* Header */}
      <div class="border-b border-edge p-4 bg-panel">
        <h1 class="text-lg font-semibold">Entity Debugger</h1>
        <p class="text-sm text-ink-muted mt-1">
          Interactive testing environment for Entity component refactor
        </p>
      </div>

      {/* Controls Panel */}
      {renderControlsPanel()}

      {/* Main Content Area */}
      <div class="flex-1 flex overflow-hidden">
        {/* Entity Grid */}
        {renderEntityGrid()}

        {/* Inspector Panel */}
        {renderInspectorPanel()}
      </div>

      {/* Console Log */}
      {renderConsoleLog()}
    </div>
  );
};

export default EntityDebugger;
