import {
  shiftPunctuationMap,
  shiftPunctuationReverseMap,
} from '../../hotkey/constants';
import type { ValidHotkey } from '../../hotkey/types';

export function matchesActionKey(pressed: ValidHotkey, target: ValidHotkey) {
  if (pressed === target) return true;
  if (!target.includes('+')) {
    const baseFromShifted =
      shiftPunctuationMap[
        target as keyof typeof shiftPunctuationMap
      ];
    if (baseFromShifted) {
      if (
        pressed === baseFromShifted ||
        pressed === (`shift+${baseFromShifted}` as ValidHotkey)
      ) {
        return true;
      }
    }
    const shiftedFromBase =
      shiftPunctuationReverseMap[
        target as keyof typeof shiftPunctuationReverseMap
      ];
    if (shiftedFromBase) {
      const shifted = `shift+${target}` as ValidHotkey;
      if (pressed === shifted) return true;
    }
    if (target === '@' && pressed.endsWith('+@')) {
      return true;
    }
  }
  return false;
}
