import {
  HOTKEY_TO_EVENT_NAME_MAP,
  shiftPunctuationMap,
  shiftPunctuationReverseMap,
} from '@core/hotkey/constants';
import type { ValidHotkey } from '@core/hotkey/types';

const SPECIAL_KEY_MAP: Record<string, string> = {
  space: ' ',
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
};

const EVENT_PROP_MAP: Record<
  string,
  'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
> = {
  control: 'ctrlKey',
  alt: 'altKey',
  shift: 'shiftKey',
  meta: 'metaKey',
};

export function performHotkey(
  hotkey: ValidHotkey,
  target?: EventTarget | null
) {
  const parts = hotkey
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const keyPart = parts.at(-1);
  if (!keyPart) return;

  const eventInit: KeyboardEventInit = {
    bubbles: true,
    cancelable: true,
    composed: true,
  };

  for (const mod of parts.slice(0, -1)) {
    const eventName = HOTKEY_TO_EVENT_NAME_MAP[
      mod as keyof typeof HOTKEY_TO_EVENT_NAME_MAP
    ];
    if (!eventName) continue;
    const prop = EVENT_PROP_MAP[eventName];
    if (prop) eventInit[prop] = true;
  }

  const normalizedKey = keyPart.toLowerCase();
  const hasShift = eventInit.shiftKey === true;

  if (normalizedKey in SPECIAL_KEY_MAP) {
    eventInit.key = SPECIAL_KEY_MAP[normalizedKey];
  } else if (normalizedKey in shiftPunctuationMap) {
    eventInit.key = normalizedKey;
    eventInit.shiftKey = true;
  } else if (hasShift && normalizedKey in shiftPunctuationReverseMap) {
    eventInit.key =
      shiftPunctuationReverseMap[
        normalizedKey as keyof typeof shiftPunctuationReverseMap
      ];
  } else {
    eventInit.key = keyPart;
  }

  const dispatchTarget =
    target ??
    (document.activeElement ?? document.body ?? document);

  dispatchTarget.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  dispatchTarget.dispatchEvent(new KeyboardEvent('keyup', eventInit));
}
