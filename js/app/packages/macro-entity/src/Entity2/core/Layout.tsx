import { cn } from '@ui/utils/classname';
import { type ComponentProps, splitProps } from 'solid-js';
import { buildGrid, type GridParams } from '../utils/grid';

export function Layout(props: ComponentProps<'div'> & { grid?: GridParams }) {
  const [local, rest] = splitProps(props, [
    'class',
    'children',
    'grid',
    'style',
  ]);
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
