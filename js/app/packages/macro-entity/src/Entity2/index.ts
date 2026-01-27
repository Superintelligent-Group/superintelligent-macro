import { Container } from './core/Container';
import { Layout } from './core/Layout';

import { SlotIcon } from './slots/slot-icon';
import { SlotTitle } from './slots/slot-title';

import { ExtractorIcon } from './extractors/extractor-icon';
import { ExtractorTitle } from './extractors/extractor-title';

export const Entity2 = {
  Container,
  Layout,
  Slot: {
    Icon: SlotIcon,
    Title: SlotTitle,
  },
  Extractor: {
    Icon: ExtractorIcon,
    Title: ExtractorTitle,
  },
};
