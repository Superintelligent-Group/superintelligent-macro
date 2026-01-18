/**
 * Preview Plugin - Composable helper for preview functionality.
 *
 * Encapsulates:
 * - Preview state (enabled/selected entity)
 * - Hotkey registration (space bar to toggle)
 * - Sync focused entity to selected
 * - Half-split state for layout
 * - Pre-configured Panel component
 */

import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  type Accessor,
  type Setter,
  type Component,
} from 'solid-js';
import type { EntityData } from '@macro-entity';
import { registerHotkey } from '@core/hotkey/hotkeys';
import { TOKENS } from '@core/hotkey/tokens';
import { playSound } from '@app/util/sound';
import { PreviewPanel } from '@app/component/PreviewPanel';
import type { BlockOrchestrator } from '@core/orchestrator';
import type {
  HalfSplitState,
  SplitPanelContextType,
} from '@app/component/split-layout/context';
import type { EnhancedEntity } from '@unified-list';

// ============================================================================
// Types
// ============================================================================

export type CreatePreviewPluginConfig = {
  /** Hotkey scope ID for registering the toggle hotkey */
  hotkeyScope: string;
  /** Split panel context for the preview panel */
  splitPanelContext: SplitPanelContextType;
  /** Block orchestrator for rendering entity content */
  orchestrator: BlockOrchestrator;
  /** Accessor for the list of entities */
  entities: Accessor<EnhancedEntity[]>;
  /** Focused entity ID from navigation store, to sync focused→selected */
  focusedId: Accessor<string | null>;
  /** Initial preview enabled state (default: false) */
  initialEnabled?: boolean;
  /** Percentage for half-split when preview is enabled (default: 30) */
  halfSplitPercentage?: number;
};

export type PreviewPluginResult = {
  /** Whether preview is enabled */
  enabled: Accessor<boolean>;
  /** Set preview enabled state */
  setEnabled: Setter<boolean>;
  /** Toggle preview with sound */
  toggle: () => void;
  /** Currently selected entity for preview */
  selectedEntity: Accessor<EntityData | undefined>;
  /** Set the selected entity by entity object */
  setSelectedEntity: (entity: EntityData | undefined) => void;
  /** Half-split state for layout - undefined when disabled */
  halfSplitState: Accessor<HalfSplitState | undefined>;
  /** Handle entity click - returns true if consumed by preview */
  handleEntityClick: (entity: EntityData) => boolean;
  /** Pre-configured Panel component */
  Panel: Component<object>;
  /** Dispose function to clean up hotkey registration */
  dispose: () => void;
};

// ============================================================================
// Implementation
// ============================================================================

export function createPreviewPlugin(
  config: CreatePreviewPluginConfig
): PreviewPluginResult {
  const {
    hotkeyScope,
    splitPanelContext,
    orchestrator,
    entities,
    focusedId,
    initialEnabled = false,
    halfSplitPercentage = 30,
  } = config;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [enabled, setEnabled] = createSignal(initialEnabled);
  const [selectedEntityId, setSelectedEntityId] = createSignal<
    string | undefined
  >();

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------

  // Derive selected entity from ID
  const selectedEntity = createMemo((): EntityData | undefined => {
    const id = selectedEntityId();
    if (!id) return undefined;
    return entities().find((e) => e.id === id);
  });

  // Half-split state for layout
  const halfSplitState = createMemo((): HalfSplitState | undefined =>
    enabled()
      ? { side: 'left' as const, percentage: halfSplitPercentage }
      : undefined
  );

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Sync focused entity to selected when preview is enabled
  createEffect(() => {
    if (enabled()) {
      const id = focusedId();
      if (id) {
        setSelectedEntityId(id);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  // Toggle with sound
  const toggle = () => {
    playSound('open');
    setEnabled((prev) => !prev);
  };

  // Handle entity click - returns true if preview consumed it
  const handleEntityClick = (entity: EntityData): boolean => {
    if (enabled()) {
      setSelectedEntityId(entity.id);
      return true;
    }
    return false;
  };

  // Set selected entity by object
  const setSelectedEntity = (entity: EntityData | undefined) => {
    setSelectedEntityId(entity?.id);
  };

  // ---------------------------------------------------------------------------
  // Hotkey Registration
  // ---------------------------------------------------------------------------

  const hotkeyDisposer = registerHotkey({
    hotkey: ['space'],
    scopeId: hotkeyScope,
    description: 'Toggle Preview',
    hotkeyToken: TOKENS.unifiedList.togglePreview,
    keyDownHandler: () => {
      toggle();
      return true;
    },
  });

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  const dispose = () => hotkeyDisposer.dispose();
  onCleanup(dispose);

  // ---------------------------------------------------------------------------
  // Panel Component
  // ---------------------------------------------------------------------------

  const Panel: Component<object> = () => (
    <PreviewPanel
      selectedEntity={selectedEntity()}
      orchestrator={orchestrator}
      splitPanelContext={splitPanelContext}
    />
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    enabled,
    setEnabled,
    toggle,
    selectedEntity,
    setSelectedEntity,
    halfSplitState,
    handleEntityClick,
    Panel,
    dispose,
  };
}
