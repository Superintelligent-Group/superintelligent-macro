/**
 * Soup Package
 *
 * Self-contained entity list component with signal/noise filtering.
 *
 * @example
 * ```tsx
 * import { Soup } from '@soup';
 *
 * function MyComponent() {
 *   return (
 *     <Soup
 *       onEntityClick={(entity) => navigate(entity)}
 *       onEntityDoubleClick={(entity) => openEntity(entity)}
 *     />
 *   );
 * }
 * ```
 */

// ============================================================================
// Main Component
// ============================================================================

export { Soup, type SoupProps } from './Soup';

// ============================================================================
// Hooks
// ============================================================================

export {
  useSoupQuery,
  type SoupQueryFilters,
  type SoupQueryResult,
  type EmailViewMode,
} from './useSoupQuery';

// ============================================================================
// Configuration
// ============================================================================

export { SOUP_DEFAULTS, type SortMethod, type EmailView } from './defaults';

export {
  createSoupFilterConfigs,
  createSoupFilterGroups,
} from './filterConfigs';

// ============================================================================
// Filters
// ============================================================================

export {
  // Signal/Noise filters
  signalFilter,
  noiseFilter,
  explicitNoiseFilter,
  // Configuration toggles (for settings UI)
  PRIORITY_LABEL_TOGGLES,
  PRIORITY_METADATA_TOGGLES,
  DEPRIORITY_LABEL_TOGGLES,
  DEPRIORITY_METADATA_TOGGLES,
  PRIORITY_LABELS,
  DEPRIORITY_LABELS,
  PRIORITY_METADATA,
  DEPRIORITY_METADATA,
  type SignalToggle,
  type EmailMetadataKey,
} from './filters';
