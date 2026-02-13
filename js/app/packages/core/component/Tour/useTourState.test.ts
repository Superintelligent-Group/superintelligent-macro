import { describe, expect, test } from 'vitest';
import type { ValidHotkey } from '../../hotkey/types';
import { matchesActionKey } from './matchesActionKey';

describe('matchesActionKey', () => {
  test('matches exact hotkey', () => {
    expect(matchesActionKey('a', 'a')).toBe(true);
  });

  test('matches shifted punctuation hotkeys', () => {
    expect(matchesActionKey('shift+\\' as ValidHotkey, '|')).toBe(true);
  });

  test('matches modifier-generated @ keypresses', () => {
    expect(matchesActionKey('opt+@' as ValidHotkey, '@')).toBe(true);
  });

  test('does not match unrelated hotkeys', () => {
    expect(matchesActionKey('opt+@' as ValidHotkey, 'a')).toBe(false);
  });
});
