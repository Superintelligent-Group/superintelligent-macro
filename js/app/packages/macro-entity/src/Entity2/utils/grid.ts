import type { JSX } from 'solid-js';

export type GridSize = string;
export type GridParams<T extends string = string> = {
  columns: Record<T, GridSize>;
  layout: string[];
};
export type GridPlacement<T extends string> = T | [T, T];

export function buildGrid<T extends string>(
  params?: GridParams<T>
): Partial<JSX.CSSProperties> {
  if (!params) return {};
  const labels = Object.keys(params.columns).join(' ');
  const columns = Object.values(params.columns).join(' ');

  return {
    display: 'grid',
    'grid-template-columns': columns,
    'grid-template-areas': `"${labels}"`,
  };
}

export function placeGrid<T extends string>(
  placement: GridPlacement<T>
): Partial<JSX.CSSProperties> {
  if (Array.isArray(placement)) {
    const start = placement[0];
    const end = placement[1];
    return {
      'grid-column-start': start,
      'grid-column-end': end,
    };
  }

  return {
    'grid-column': placement,
  };
}
