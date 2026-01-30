// Core components
import { Root } from './core/Root';
import { Layout } from './core/Layout';
import { Slot } from './core/Slot';

import { ExtractorIcon } from './extractors/extractor-icon';
import { ExtractorTitle } from './extractors/extractor-title';
import { ExtractorTimestamp } from './extractors/extractor-timestamp';
import { ExtractorEmailParticipants } from './extractors/extractor-email-participants';
import { ExtractorOwner } from './extractors/extractor-owner';

// Search extractors
import { ExtractorContentHits } from './extractors-search';

// Notification extractors
import { ExtractorNotificationRows } from './extractors-notification';

export const Entity2 = {
  Root,
  Layout,
  Slot: Slot,
  Icon: ExtractorIcon,
  Title: ExtractorTitle,
  Timestamp: ExtractorTimestamp,
  EmailParticipants: ExtractorEmailParticipants,
  Owner: ExtractorOwner,
  Search: {
    ContentHits: ExtractorContentHits,
  },
  Notification: {
    Rows: ExtractorNotificationRows,
  },
};
