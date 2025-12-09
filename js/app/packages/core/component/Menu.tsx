import { type Component, createEffect, type JSX, Match, onCleanup, type ParentProps, Show, Switch, splitProps, useContext } from 'solid-js';
import CaretRight from '@icon/regular/caret-right.svg?component-solid';
import CheckIcon from '@icon/bold/check-bold.svg?component-solid';
import { isTouchDevice } from '@core/mobile/isTouchDevice';
import { DropdownMenu } from '@kobalte/core/dropdown-menu';
import { ContextMenu } from '@kobalte/core/context-menu';
import { isMobileWidth } from '@core/mobile/mobileWidth';
import type { HotkeyToken } from '@core/hotkey/tokens';
import clickOutside from '../directive/clickOutside';
import { EditingContext } from './Editable';
import { BasicHotkey } from './Hotkey';
import { Dynamic } from 'solid-js/web';

false && clickOutside;

export const MENU_ITEM_HEIGHT = 28;

type BaseMenuItemWrapperProps = {
  selectorType?: 'checkbox' | 'radio';
  closeOnSelect?: boolean;
  children: JSX.Element;
  onClick?: () => void;
  disabled?: boolean;
  class?: string;
};

type CheckboxMenuItemWrapperProps = BaseMenuItemWrapperProps & {
  onChange?: (value: boolean) => void;
  selectorType: 'checkbox';
  checked?: boolean;
};

type RadioMenuItemWrapperProps = BaseMenuItemWrapperProps & {
  selectorType: 'radio';
  value: string;
};

type MenuItemWrapperProps =
  CheckboxMenuItemWrapperProps
  | RadioMenuItemWrapperProps
  | BaseMenuItemWrapperProps;

function MenuItemWrapper(props: MenuItemWrapperProps) {
  return (
    <Switch>
      <Match when={props.selectorType === 'checkbox'}>
        <ContextMenu.CheckboxItem
          onChange={(props as CheckboxMenuItemWrapperProps).onChange}
          checked={(props as CheckboxMenuItemWrapperProps).checked}
          closeOnSelect={props.closeOnSelect}
          disabled={props.disabled}
          onSelect={props.onClick}
          class={props.class}
        >
          {props.children}
        </ContextMenu.CheckboxItem>
      </Match>
      <Match when={props.selectorType === 'radio'}>
        <ContextMenu.RadioItem
          value={(props as RadioMenuItemWrapperProps).value}
          closeOnSelect={props.closeOnSelect}
          disabled={props.disabled}
          onSelect={props.onClick}
          class={props.class}
        >
          {props.children}
        </ContextMenu.RadioItem>
      </Match>
      <Match when={!props.selectorType}>
        <ContextMenu.Item
          closeOnSelect={props.closeOnSelect}
          disabled={props.disabled}
          onSelect={props.onClick}
          class={props.class}
        >
          {props.children}
        </ContextMenu.Item>
      </Match>
    </Switch>
  );
}

export type BaseMenuItemProps = {
  icon?: Component<JSX.SvgSVGAttributes<SVGSVGElement>> | JSX.Element;
  text?: string | JSX.Element;
  hotkeyToken?: HotkeyToken;
  closeOnSelect?: boolean;
  onClick?: () => void;
  iconClass?: string;
  disabled?: boolean;
  class?: string;
};

export type CheckboxMenuItemProps = BaseMenuItemProps & {
  onChange?: (value: boolean) => void;
  selectorType: 'checkbox';
  value?: undefined;
  checked: boolean;
};

export type RadioMenuItemProps = BaseMenuItemProps & {
  selectorType: 'radio';
  onChange?: undefined;
  checked?: undefined;
  groupValue: string;
  value: string;
};

export type GenericMenuItemProps = BaseMenuItemProps & {
  selectorType?: undefined;
  onChange?: undefined;
  checked?: undefined;
  value?: undefined;
};

export type MenuItemProps =
  | GenericMenuItemProps
  | CheckboxMenuItemProps
  | RadioMenuItemProps;

export const MENU_ITEM_CLASS = `flex flex-row w-full gap-1.5 tracking-tight ${isMobileWidth() && isTouchDevice ? 'py-2 px-1 text-base' : 'py-1 pl-2 pr-2 text-sm'} font-medium justify-between items-center focus-bracket`;

/**
 * A menu item component that can be used interchangeably within either a ContextMenu or DropdownMenu.
 * Provides consistent styling and behavior for menu items across both menu types.
 *
 * Supports three variants:
 * - Regular menu item (with optional icon and chevron)
 * - Checkbox menu item (with checkbox selection)
 * - Radio menu item (with radio button selection)
 *
 * @example Regular menu item
 * ```tsx
 * <MenuItem
 *   text="Open file"
 *   icon={FileIcon}
 *   onClick={() => {}}
 * />
 * ```
 *
 * @example Checkbox menu item
 * ```tsx
 * <MenuItem
      text={CHANNEL_TYPE_DISPLAY_NAMES[type]}
      checked={isChannelTypeSelected(type)}
      selectorType="checkbox"
      onClick={() => {
        selectChannelType(type);
      }}
    />
 * ```
 *
 * @example Radio menu item
 * ```tsx
 * <MenuItem
 *   text="Light theme"
 *   selectorType="radio"
 *   value="light"
 *   groupValue={currentTheme}
 * />
 * ```
 */

export function MenuItem(props: MenuItemProps) {
  return (
    // Note: Kobalte's ContextMenu.Item is identical to DropdownMenu.Item. Either can be used inside of the other.
    <MenuItemWrapper
      class={`${MENU_ITEM_CLASS} ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-hover hover-transition-bg'} ${props.class ?? ''}`}
      closeOnSelect={props.closeOnSelect}
      selectorType={props.selectorType}
      onChange={props.onChange}
      disabled={props.disabled}
      checked={props.checked}
      onClick={props.onClick}
      value={props.value}
    >
      <Show when={props.selectorType === 'checkbox'}>
        <div class={`${isMobileWidth() && isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'} shrink-0 flex items-center justify-center`}>
          <CheckIcon
            class={`w-[14px] h-[14px] shrink-0 rounded-sm p-[2px] ${
              (props as CheckboxMenuItemProps).checked
                ? 'bg-accent text-[white]'
                : 'bg-transparent text-transparent border-1 border-edge'
            }`}
          />
        </div>
      </Show>
      <Show when={props.selectorType === 'radio'}>
        <div class={`flex items-center justify-center shrink-0 ${isMobileWidth() && isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'}`}>
          <div
            class={`w-[14px] h-[14px] shrink-0 rounded-full ${
              (props as RadioMenuItemProps).value ===
              (props as RadioMenuItemProps).groupValue
                ? 'bg-accent text-[white]'
                : 'bg-transparent text-transparent border-1 border-edge'
            }`}
          />
        </div>
      </Show>
      <Show when={props.icon}>
        <Show when={typeof props.icon === 'function'}>
          <Dynamic
            class={`${isMobileWidth() && isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'} shrink-0 ${props.iconClass ?? ''}`}
            component={props.icon as Component<JSX.SvgSVGAttributes<SVGSVGElement>>}
          />
        </Show>
        <Show when={typeof props.icon === 'object'}>
          {props.icon as JSX.Element}
        </Show>
      </Show>
      <Show when={props.text}>
        <div class="flex-1 truncate">{props.text}</div>
      </Show>
      <Show when={props.hotkeyToken} keyed>
        {(hotkeyToken) => (
          <div class="ml-auto text-page text-xs">
            <BasicHotkey token={hotkeyToken} />
          </div>
        )}
      </Show>
    </MenuItemWrapper>
  );
}

export function SubTrigger(props: {
  icon?: Component<JSX.SvgSVGAttributes<SVGSVGElement>> | JSX.Element;
  text: string | JSX.Element;
  iconClass?: string;
  disabled?: boolean;
}){
  return(
    <ContextMenu.SubTrigger
      class={`${MENU_ITEM_CLASS} ${props.disabled ? 'opacity-50 cursor-not-allowed text-ink' : 'hover:bg-hover hover-transition-bg text-ink'}`}
      disabled={props.disabled}
    >
      <Show when={props.icon}>
        <Show when={typeof props.icon === 'function'}>
          <Dynamic
            class={`${isMobileWidth() && isTouchDevice ? 'w-5 h-5' : 'w-4 h-4'} shrink-0 ${props.iconClass ?? ''}`}
            component={props.icon as Component<JSX.SvgSVGAttributes<SVGSVGElement>>}
          />
        </Show>
        <Show when={typeof props.icon === 'object'}>
          {props.icon as JSX.Element}
        </Show>
      </Show>
      <div class="flex-1 truncate">{props.text}</div>
      <CaretRight class="w-4 h-4 shrink-0" />
    </ContextMenu.SubTrigger>
  );
}

export function MenuGroup(props: { children: JSX.Element; class?: string }){
  return(
    <ContextMenu.Group class={`w-full ${props.class ?? ''}`}>
      {props.children}
    </ContextMenu.Group>
  );
}

export function GroupLabel(props: { children: JSX.Element }){
  return (
    <ContextMenu.GroupLabel class={`${MENU_ITEM_CLASS} text-xs! text-ink-extra-muted`}>
      {props.children}
    </ContextMenu.GroupLabel>
  );
}

export function MenuSeparator() {
  return <ContextMenu.Separator class="my-1 border-edge border-t w-full" />;
}

type MenuItemRenameTriggerProps = Omit<GenericMenuItemProps, 'onClick'> & {
  sideEffect?: () => void;
};

export function MenuItemRenameTrigger(props: MenuItemRenameTriggerProps) {
  const [_, setIsRenaming] = useContext(EditingContext);
  return (
    <MenuItem
      onClick={() => {
        if (props.sideEffect) props.sideEffect();
        setIsRenaming(true);
      }}
      closeOnSelect={props.closeOnSelect}
      iconClass={props.iconClass}
      disabled={props.disabled}
      text={props.text}
      icon={props.icon}
    />
  );
}

function MobileConditionalOverlay(
  props: ParentProps<{ mobileFullScreen?: boolean }>
) {
  return (
    <Show
      when={props.mobileFullScreen && isTouchDevice && isMobileWidth()}
      fallback={props.children}
    >
      <div class="z-modal fixed inset-0 flex justify-center items-center bg-modal-overlay backdrop-blur-sm">
        {props.children}
      </div>
    </Show>
  );
}

type MenuWidth = 'screen' | 'lg' | 'md' | 'sm' | `w-${string}`;
const menuWidths: Record<MenuWidth, string> = {
  screen: 'w-screen',
  lg: 'w-72',
  md: 'w-44',
  sm: 'w-28',
};

export const MENU_CONTENT_CLASS = `flex flex-col justify-start items-start bg-menu shadow-lg ring-1 ring-edge cursor-default select-none max-w-full max-h-[calc(100dvh-10rem)] overflow-y-auto z-modal`;

type MenuContentProps = ParentProps<{
  // The following props can be used to create a mobile-friendly full-screen context menu. See Message.tsx for an example.
  onCloseAutoFocus?: (event: Event) => void;
  onOpenAutoFocus?: (event: Event) => void;
  mobileFullScreen?: boolean;
  overrideStyling?: boolean;
  submenu?: boolean;
  width?: MenuWidth;
  class?: string;
  navId?: string;
}>;

export function ContextMenuContent(props: ParentProps<MenuContentProps>){
  let contentRef: HTMLDivElement | undefined;

  const BOTTOM_OFFSET = 48;
  const updatePosition = (
    positioner: HTMLElement | null | undefined,
    navItem: Element | HTMLElement | null | undefined
  ) => {
    if (!positioner) return;

    const positionerHeight = positioner.getBoundingClientRect().height;

    if(positioner.style.minWidth !== 'none'){
      positioner.style.minWidth = '100vw';
      positioner.style.transform = 'none';
      positioner.style.left = '8px';
    }

    if(navItem instanceof HTMLElement){
      const box = navItem.getBoundingClientRect();

      if(box.top + box.height + positionerHeight > window.innerHeight - BOTTOM_OFFSET){
        positioner.style.top = `${box.top - positionerHeight}px`;
      }
      else{
        positioner.style.top = `${box.top + box.height}px`;
      }
    }
    else{
      positioner.style.justifyContent = 'center';
      positioner.style.flexDirection = 'column';
      positioner.style.minHeight = '100%';
      positioner.style.minWidth = '100vw';
      positioner.style.display = 'flex';
      positioner.style.left = '8px';
    }
  };

  // This createEffect is a heinous hack to prevent kobalte's default context menu positioning on mobile. Forking / patching Kobalte would be cleaner, but this works for now.
  createEffect(() => {
    const positioner = contentRef?.closest('[data-popper-positioner]');
    if (!positioner || !(positioner instanceof HTMLElement)) return;

    if (!isTouchDevice || !isMobileWidth()) {
      return;
    }

    let observer: MutationObserver | undefined;

    const timeoutId = setTimeout(() => {
      const positioner = contentRef?.closest('[data-popper-positioner]');
      const navItem = document.querySelector(`[data-nav-id="${props.navId}"]`);

      if (positioner instanceof HTMLElement) {
        observer = new MutationObserver(() => {
          updatePosition(positioner, navItem);
        });

        observer.observe(positioner, {
          attributes: true,
          attributeFilter: ['style'],
        });

        updatePosition(positioner, navItem);
      }
    }, 0);

    onCleanup(() => {
      clearTimeout(timeoutId);
      observer?.disconnect();
    });
  });
  return (
    <MobileConditionalOverlay mobileFullScreen={props.mobileFullScreen}>
      <Show
        when={props.submenu}
        fallback={
          <ContextMenu.Content
            class={`
              ${props.mobileFullScreen ? isTouchDevice && isMobileWidth() ? 'flex flex-col justify-center px-4 max-h-[80vh] shrink w-[calc(100vw-1rem)]' : '' : ''}
              ${props.class} ${props.width ? menuWidths[props.width] : ''}
              ${props.overrideStyling ? '' : MENU_CONTENT_CLASS}
            `}
            onCloseAutoFocus={props.onCloseAutoFocus}
            onOpenAutoFocus={props.onOpenAutoFocus}
            ref={contentRef}
          >
            {props.children}
          </ContextMenu.Content>
        }
      >
        <ContextMenu.SubContent class={`${MENU_CONTENT_CLASS} ${props.class} ${props.width ? menuWidths[props.width] : ''}`}>
          {props.children}
        </ContextMenu.SubContent>
      </Show>
    </MobileConditionalOverlay>
  );
}

export function DropdownMenuContent(props: ParentProps<MenuContentProps>) {
  const [local, rest] = splitProps(props, ['class', 'children', 'width']);

  return (
    <Show
      when={props.submenu}
      fallback={
        <DropdownMenu.Content
          class={`${MENU_CONTENT_CLASS} ${local.class} ${local.width ? menuWidths[local.width] : ''}`}
          {...rest}
        >
          {local.children}
        </DropdownMenu.Content>
      }
    >
      <DropdownMenu.SubContent
        class={`${MENU_CONTENT_CLASS} ${local.class} ${local.width ? menuWidths[local.width] : ''}`}
        {...rest}
      >
        {local.children}
      </DropdownMenu.SubContent>
    </Show>
  );
}
