// Source - adapted from https://stackoverflow.com/a/76838650

import { isMobile } from '@core/mobile/isMobile';

/**
 * iOS only: focuses a temporary input element to open the keyboard within the
 * user gesture, then transfers focus to the real target once it appears in the
 * DOM. Pass a lazy getter for the target element — it need not exist at call
 * time. `positionNear` positions the temp input to prevent cursor jumping.
 *
 * No-op on non-mobile platforms.
 */
export function focusAndOpenKeyboard(
  getEl: () => HTMLElement | null | undefined,
  positionNear?: HTMLElement | null
) {
  if (!isMobile()) return;

  const tempEl = document.createElement('input');
  let observer: MutationObserver | undefined;

  function focusOnElementAndCleanup() {
      getEl()?.focus();
      if (document.body.contains(tempEl)) document.body.removeChild(tempEl);
      observer?.disconnect();
  }

  function focusOnDummyElementToOpenIOSKeyboard() {
    tempEl.style.position = 'absolute';
    tempEl.style.top = `${(positionNear?.offsetTop ?? 0) + 7}px`;
    tempEl.style.left = `${positionNear?.offsetLeft ?? 0}px`;
    tempEl.style.height = '0';
    tempEl.style.opacity = '0';
    tempEl.style.fontSize = '16px';
    document.body.appendChild(tempEl);
    tempEl.focus();
  }

  const el = getEl();
  if (el && isVisible(el)) {
    focusOnElementAndCleanup();
    return;
  }

  focusOnDummyElementToOpenIOSKeyboard();

  observer = new MutationObserver(() => {
    const current = getEl();
    if (current && isVisible(current)) focusOnElementAndCleanup();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null;
}
