import { createSignal, onCleanup } from 'solid-js';

const registry = new Map<string, Set<HTMLElement>>();
const [anchorVersion, setAnchorVersion] = createSignal(0);

const bumpVersion = () => setAnchorVersion((v) => v + 1);

export function registerTourAnchor(id: string, element: HTMLElement) {
  let set = registry.get(id);
  if (!set) {
    set = new Set();
    registry.set(id, set);
  }
  if (!set.has(element)) {
    set.add(element);
    bumpVersion();
  }
}

export function unregisterTourAnchor(id: string, element: HTMLElement) {
  const set = registry.get(id);
  if (!set) return;
  if (set.delete(element)) {
    if (set.size === 0) {
      registry.delete(id);
    }
    bumpVersion();
  }
}

export function resolveTourAnchor(
  id: string,
  scopeContainer?: HTMLElement
): HTMLElement | null {
  const set = registry.get(id);
  if (!set || set.size === 0) return null;

  if (scopeContainer) {
    for (const element of set) {
      if (scopeContainer.contains(element)) return element;
    }
  }

  return set.values().next().value ?? null;
}

export function resolveTourTargetElement(
  id: string,
  scopeContainer?: HTMLElement
): HTMLElement | null {
  const anchor = resolveTourAnchor(id, scopeContainer);
  if (anchor) return anchor;

  const selector = `[data-tour-target="${id}"]`;
  if (scopeContainer) {
    const scoped = scopeContainer.querySelector(selector);
    if (scoped) return scoped as HTMLElement;
  }

  return document.querySelector(selector) as HTMLElement | null;
}

export function useTourAnchor(id: string) {
  let current: HTMLElement | undefined;

  onCleanup(() => {
    if (current) {
      unregisterTourAnchor(id, current);
      current = undefined;
    }
  });

  return (element: HTMLElement) => {
    if (current === element) return;
    if (current) unregisterTourAnchor(id, current);
    current = element;
    if (current) registerTourAnchor(id, current);
  };
}

export { anchorVersion };
