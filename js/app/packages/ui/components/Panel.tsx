import type { JSX } from 'solid-js';

export type PanelProps = {
  style?: JSX.CSSProperties;
  highlightColor?: string;
  children?: JSX.Element;
  active?: boolean;
  class?: string;
  layer?: number;
};

export function Panel(props: PanelProps) {
  return (
    <div
      style={{
        'background-image': `linear-gradient(${props.active ? `${props.highlightColor || 'var(--color-accent)'}, var(--color-edge-muted) 80%` : 'var(--color-edge-muted)'})`,
        'box-sizing': 'border-box',
        'border-radius': '6px',
        'overflow': 'clip',
        'padding': '1px',
        'height': '100%',
        'width': '100%',
      }}
    >
      <div
        style={{
          'background': 'var(--color-panel)',
          'box-sizing': 'border-box',
          'border-radius': '5px',
          'overflow': 'clip',
          'height': '100%',
          'width': '100%',
          ...props.style,
        }}
        class={props.class}
      >
        {props.children}
      </div>
    </div>
  );
}
