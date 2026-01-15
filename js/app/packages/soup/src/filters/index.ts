/**
 * Soup Filter System
 *
 * Signal/Noise classification and filter predicates for Soup.
 */

// Signal/Noise filters
export {
  signalFilter,
  noiseFilter,
  explicitNoiseFilter,
} from './signalFilters';

// Configuration toggles (for settings UI)
export {
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
} from './signalConfig';
