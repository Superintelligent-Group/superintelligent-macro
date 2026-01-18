import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isMobilePlatform, isMobileWidth } = vi.hoisted(() => ({
  isMobilePlatform: vi.fn(() => false),
  isMobileWidth: vi.fn(() => false),
}));

vi.mock('./platform', () => ({ isMobilePlatform }));
vi.mock('../mobile/mobileWidth', () => ({ isMobileWidth }));

import { openInNewSplitForMention } from './openInNewSplit';

describe('openInNewSplitForMention', () => {
  beforeEach(() => {
    isMobilePlatform.mockReturnValue(false);
    isMobileWidth.mockReturnValue(false);
  });

  it('opens in a new split by default for mouse/keyboard interactions', () => {
    expect(openInNewSplitForMention(false, true)).toBe(true);
  });

  it('opens in the current split when Option (alt) is held', () => {
    expect(openInNewSplitForMention(true, true)).toBe(false);
  });

  it('defaults to current split when there is no event (e.g. touch)', () => {
    expect(openInNewSplitForMention(undefined, false)).toBe(false);
  });

  it('opens in the current split on mobile platforms', () => {
    isMobilePlatform.mockReturnValue(true);
    expect(openInNewSplitForMention(false, true)).toBe(false);
  });

  it('opens in the current split on mobile widths', () => {
    isMobileWidth.mockReturnValue(true);
    expect(openInNewSplitForMention(false, true)).toBe(false);
  });
});
