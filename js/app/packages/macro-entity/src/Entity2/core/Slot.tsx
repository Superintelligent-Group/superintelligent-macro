import { cn } from '@ui/utils/classname';
import {
  type JSX,
  type ComponentProps,
  type ValidComponent,
  splitProps,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { GridPlacement } from '../utils/grid';
import { placeGrid } from '../utils/grid';

type SlotElement = 'div' | 'span' | 'button';

type CommonProps = {
  children?: JSX.Element;
  placement?: GridPlacement<string>;
  class?: string;
};

type SlotProps<T extends ValidComponent = 'div'> = { as?: T } & CommonProps &
  Omit<ComponentProps<T>, keyof CommonProps | 'component'>;

export function Slot<T extends SlotElement = 'div'>(props: SlotProps<T>) {
  const [local, rest] = splitProps(props, [
    'as',
    'class',
    'children',
    'placement',
  ]);

  const gridStyle = () => {
    if (!props.placement) return {};
    if (Array.isArray(props.placement)) {
      return placeGrid(props.placement);
    }
    return { 'grid-area': props.placement };
  };

  return (
    <Dynamic
      class={cn('entity-slot', local.class)}
      component={local.as ?? ('div' as SlotElement)}
      style={gridStyle()}
      {...rest}
    >
      {props.children}
    </Dynamic>
  );
}
