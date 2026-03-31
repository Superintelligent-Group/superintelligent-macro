import Drawer from '@corvu/drawer';
import { cn } from '@ui/utils/classname';
import {
  createSignal,
  JSX,
  splitProps,
  type ComponentProps,
  type ValidComponent,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';

/**
 * Call this from a scroll container's `onFocusIn` to smoothly scroll a
 * focused input/textarea to `offset` px from the container's top edge.
 *
 * Usage:
 *   <div onFocusIn={(e) => scrollToFocusedInput(e, e.currentTarget)}>
 */
export function scrollToFocusedInput(
  e: FocusEvent & { currentTarget: HTMLElement },
  offset = 40
) {
  if (
    !(e.target instanceof HTMLInputElement) &&
    !(e.target instanceof HTMLTextAreaElement)
  )
    return;
  const input = e.target as HTMLElement;
  const container = e.currentTarget;
  // Delay until after the browser's native keyboard-show scroll completes
  setTimeout(() => {
    const inputRect = input.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    container.scrollTo({
      top: container.scrollTop + (inputRect.top - containerRect.top) - offset,
      behavior: 'smooth',
    });
  }, 300);
}

/**
 * Drop-in replacement for `Drawer.Content` that handles mobile keyboard
 * behaviour automatically:
 *
 * - Positions itself above the virtual keyboard via `bottom-(--virtual-keyboard-height)`
 * - Switches between `pb-(--safe-bottom)` and `pb-0` based on whether any
 *   input/textarea inside the drawer currently has focus (detected via
 *   bubbling focusin/focusout — no per-input wiring needed)
 */
function MobileDrawerContent(props: ComponentProps<typeof Drawer.Content>) {
  const [local, rest] = splitProps(props, ['class']);
  const [inputFocused, setInputFocused] = createSignal(false);

  const isInputEl = (target: EventTarget | null) =>
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

  return (
    <Drawer.Content
      onFocusIn={(e) => {
        if (isInputEl(e.target)) setInputFocused(true);
      }}
      onFocusOut={(e) => {
        if (isInputEl(e.target)) setInputFocused(false);
      }}
      class={cn(
        'bottom-(--virtual-keyboard-height) fixed left-0 right-0 z-modal bg-page rounded-t-2xl flex flex-col h-[calc(80*var(--dvh))] data-transitioning:transition-transform data-transitioning:duration-200 ease-out',
        inputFocused() ? 'pb-0' : 'pb-(--safe-bottom)',
        local.class
      )}
      {...rest}
    />
  );
}

type MobileDrawerSectionProps<T extends ValidComponent = 'div'> =
  ComponentProps<T> & {
    as?: T;
  };

/**
 * Component for rendering Macro-styled Drawer sections.
 */
function MobileDrawerSection<T extends ValidComponent = 'div'>(
  props: MobileDrawerSectionProps<T>
) {
  const [local, rest] = splitProps(props as MobileDrawerSectionProps, [
    'as',
    'class',
    'children',
  ]);
  return (
    <Dynamic
      component={(local.as ?? 'div') as ValidComponent}
      class={cn('bg-menu rounded-2xl mx-3', local.class as string)}
      {...rest}
    >
      {local.children}
    </Dynamic>
  );
}

/**
 * Wrapper around Corvu's Drawer for mobile bottom sheets. Use exactly like
 * `Drawer` from `@corvu/drawer` but swap `Drawer.Content` for
 * `MobileDrawer.Content` to get automatic keyboard-safe behaviour.
 */
export const MobileDrawer = Object.assign(
  (props: ComponentProps<typeof Drawer>) => <Drawer {...props} />,
  {
    Trigger: Drawer.Trigger,
    Portal: Drawer.Portal,
    Overlay: Drawer.Overlay,
    Content: MobileDrawerContent,
    Close: Drawer.Close,
    Section: MobileDrawerSection,
  }
);
