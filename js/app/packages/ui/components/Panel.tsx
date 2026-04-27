import type { JSX } from 'solid-js';
import { themeReactive } from '@theme/signals/themeReactive';

export type PanelProps = {
  layer?: 0 | 1 | 2 | 3 | 4;
  style?: JSX.CSSProperties;
  highlightColor?: string;
  children?: JSX.Element;
  active?: boolean;
  class?: string;
};

export function Panel(props: PanelProps) {
  const layer = -4;
  return (
    <div
      class="panel-scope"
      style={{
        'background-image': `linear-gradient(${props.active ? `${props.highlightColor || 'var(--color-accent)'}, var(--color-edge-muted) 80%` : 'var(--color-edge-muted)'})`,
        'box-sizing': 'border-box',
        'border-radius': '6px',
        'overflow': 'clip',
        'padding': '1px',
        'height': '100%',
        'width': '100%',

        '--b0': `oklch(calc(${themeReactive.b0.l[0]()} + (0.1 * ${layer})) ${themeReactive.b0.c[0]()} ${themeReactive.b0.h[0]()}deg)`,
        '--b1': `oklch(calc(${themeReactive.b1.l[0]()} + (0.1 * ${layer})) ${themeReactive.b1.c[0]()} ${themeReactive.b1.h[0]()}deg)`,
        '--b2': `oklch(calc(${themeReactive.b2.l[0]()} + (0.1 * ${layer})) ${themeReactive.b2.c[0]()} ${themeReactive.b2.h[0]()}deg)`,
        '--b3': `oklch(calc(${themeReactive.b3.l[0]()} + (0.1 * ${layer})) ${themeReactive.b3.c[0]()} ${themeReactive.b3.h[0]()}deg)`,
        '--b4': `oklch(calc(${themeReactive.b4.l[0]()} + (0.1 * ${layer})) ${themeReactive.b4.c[0]()} ${themeReactive.b4.h[0]()}deg)`,

        '--c0': `oklch(calc(${themeReactive.c0.l[0]()} + (0.1 * ${layer})) ${themeReactive.c0.c[0]()} ${themeReactive.c0.h[0]()}deg)`,
        '--c1': `oklch(calc(${themeReactive.c1.l[0]()} + (0.1 * ${layer})) ${themeReactive.c1.c[0]()} ${themeReactive.c1.h[0]()}deg)`,
        '--c2': `oklch(calc(${themeReactive.c2.l[0]()} + (0.1 * ${layer})) ${themeReactive.c2.c[0]()} ${themeReactive.c2.h[0]()}deg)`,
        '--c3': `oklch(calc(${themeReactive.c3.l[0]()} + (0.1 * ${layer})) ${themeReactive.c3.c[0]()} ${themeReactive.c3.h[0]()}deg)`,
        '--c4': `oklch(calc(${themeReactive.c4.l[0]()} + (0.1 * ${layer})) ${themeReactive.c4.c[0]()} ${themeReactive.c4.h[0]()}deg)`,
      }}
    >
      <div
        style={{
          'background': `var(--b3)`,
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
