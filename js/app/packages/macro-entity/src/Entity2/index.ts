// Core components
import { Root } from './core/Root';
import { Layout } from './core/Layout';
import { Slot } from './core/Slot';

// Extractors (components)
import { ExtractorIcon } from './extractors/extractor-icon';
import { ExtractorTitle } from './extractors/extractor-title';
import { ExtractorTimestamp } from './extractors/extractor-timestamp';

export const Entity2 = {
  Root,
  Layout,
  Slot: Slot,
  Icon: ExtractorIcon,
  Title: ExtractorTitle,
  Timestamp: ExtractorTimestamp,
};
