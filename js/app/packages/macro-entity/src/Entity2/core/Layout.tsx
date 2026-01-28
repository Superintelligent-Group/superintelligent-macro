import { cn } from '@ui/utils/classname';
import { type JSX, splitProps } from 'solid-js';
import { buildGrid, type GridParams } from '../utils/grid';

export function Layout(
  props: Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> & {
    grid?: GridParams;
  }
) {
  const [local, rest] = splitProps(props, ['class', 'children', 'grid']);

  const isGrid = () => Boolean(props.grid);

  return (
    <div
      class={cn(
        'entity-layout',
        { 'flex items-center': !isGrid() },
        local.class
      )}
      style={{
        ...buildGrid(props.grid),
      }}
      {...rest}
    >
      {local.children}
    </div>
  );
}
