/**
 * Signal Configuration System
 *
 * Manages persisted toggles for email priority/depriority settings.
 * These determine what emails are classified as "signal" vs "noise".
 */

import { makePersisted } from '@solid-primitives/storage';
import { createMemo, createSignal, type Accessor } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

type SignalConfig<T extends string> = {
  key: T;
  label: string;
  defaultValue: boolean;
};

type SignalToggle<T extends string> = SignalConfig<T> & {
  enabled: Accessor<boolean>;
  setEnabled: (value: boolean) => void;
};

// ============================================================================
// Toggle Factory
// ============================================================================

const makeToggle = (storageKey: string, defaultValue: boolean) =>
  makePersisted(createSignal(defaultValue), { name: storageKey });

const toStorageKey = (scope: string, key: string) =>
  `signalFilter_${scope}_${key.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

const createSignalToggles = <T extends string>(
  scope: string,
  configs: SignalConfig<T>[]
): SignalToggle<T>[] =>
  configs.map((config) => {
    const [enabled, setEnabled] = makeToggle(
      toStorageKey(scope, config.key),
      config.defaultValue
    );
    return { ...config, enabled, setEnabled };
  });

// ============================================================================
// Configuration Definitions
// ============================================================================

/** Labels that indicate priority emails (signal) */
const PRIORITY_LABEL_CONFIGS: SignalConfig<string>[] = [
  { key: 'CATEGORY_PERSONAL', label: 'Personal', defaultValue: true },
  { key: 'SENT', label: 'Sent', defaultValue: true },
  { key: 'IMPORTANT', label: 'Important', defaultValue: false },
];

/** Metadata keys we care about (subset of SoupEmailThreadPreviewMetadata) */
export type EmailMetadataKey = 'knownSender' | 'tabular' | 'genericSender';

/** Metadata that indicates priority emails (signal) */
const PRIORITY_METADATA_CONFIGS: SignalConfig<EmailMetadataKey>[] = [
  { key: 'knownSender', label: 'Known Sender', defaultValue: false },
];

/** Labels that indicate depriority emails (noise) */
const DEPRIORITY_LABEL_CONFIGS: SignalConfig<string>[] = [
  { key: 'CATEGORY_UPDATES', label: 'Updates', defaultValue: true },
  { key: 'CATEGORY_PROMOTIONS', label: 'Promotions', defaultValue: true },
  { key: 'CATEGORY_SOCIAL', label: 'Social', defaultValue: true },
  { key: 'CATEGORY_FORUMS', label: 'Forums', defaultValue: true },
];

/** Metadata that indicates depriority emails (noise) */
const DEPRIORITY_METADATA_CONFIGS: SignalConfig<EmailMetadataKey>[] = [
  { key: 'tabular', label: 'Tabular', defaultValue: false },
  { key: 'genericSender', label: 'Generic Sender', defaultValue: false },
];

// ============================================================================
// Persisted Toggles (Singleton)
// ============================================================================

/** Priority label toggles (persisted) */
export const PRIORITY_LABEL_TOGGLES = createSignalToggles(
  'priority_label',
  PRIORITY_LABEL_CONFIGS
);

/** Priority metadata toggles (persisted) */
export const PRIORITY_METADATA_TOGGLES = createSignalToggles(
  'priority_metadata',
  PRIORITY_METADATA_CONFIGS
);

/** Depriority label toggles (persisted) */
export const DEPRIORITY_LABEL_TOGGLES = createSignalToggles(
  'depriority_label',
  DEPRIORITY_LABEL_CONFIGS
);

/** Depriority metadata toggles (persisted) */
export const DEPRIORITY_METADATA_TOGGLES = createSignalToggles(
  'depriority_metadata',
  DEPRIORITY_METADATA_CONFIGS
);

// ============================================================================
// Computed Sets (Reactive based on toggles)
// ============================================================================

/** Labels that mark emails as priority (computed from enabled toggles) */
export const PRIORITY_LABELS = createMemo(
  () =>
    new Set(
      PRIORITY_LABEL_TOGGLES.filter(({ enabled }) => enabled()).map(
        ({ key }) => key
      )
    )
);

/** Labels that mark emails as depriority (computed from enabled toggles) */
export const DEPRIORITY_LABELS = createMemo(
  () =>
    new Set(
      DEPRIORITY_LABEL_TOGGLES.filter(({ enabled }) => enabled()).map(
        ({ key }) => key
      )
    )
);

/** Metadata keys that mark emails as priority (computed from enabled toggles) */
export const PRIORITY_METADATA = createMemo(
  () =>
    new Set<EmailMetadataKey>(
      PRIORITY_METADATA_TOGGLES.filter(({ enabled }) => enabled()).map(
        ({ key }) => key
      )
    )
);

/** Metadata keys that mark emails as depriority (computed from enabled toggles) */
export const DEPRIORITY_METADATA = createMemo(
  () =>
    new Set<EmailMetadataKey>(
      DEPRIORITY_METADATA_TOGGLES.filter(({ enabled }) => enabled()).map(
        ({ key }) => key
      )
    )
);

// ============================================================================
// Export toggles for settings UI
// ============================================================================

export type { SignalToggle };
