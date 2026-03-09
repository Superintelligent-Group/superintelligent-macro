import { splitProps, type JSX } from 'solid-js';
import { cn } from '@ui/utils/classname';

type PanelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  edgeColor?: JSX.CSSProperties['color'];
  tr?: boolean;
  tl?: boolean;
  bl?: boolean;
  br?: boolean;
};

export function ClippedPanel(props: PanelProps) {
  const [local, rest] = splitProps(props, [
    'active',
    'edgeColor',
    'tr',
    'tl',
    'br',
    'bl',
    'children',
    'class',
  ]);
  return (
    <div
      style={{
        'background-image': `linear-gradient(${local.active ? `var(--color-accent), ${local.edgeColor || 'var(--color-edge-muted)'} 80%` : `${local.edgeColor || 'var(--color-edge-muted)'}`} )`,
        'border-radius': `
            ${local.tl ? '16px' : '4px'}
            ${local.tr ? '16px' : '4px'}
            ${local.br ? '16px' : '4px'}
            ${local.bl ? '16px' : '4px'}
          `,
      }}
      class="p-px h-full w-full box-border"
    >
      <div
        style={{
          'border-radius': `
              ${local.tl ? '15.5px' : '3.3px'}
              ${local.tr ? '15.5px' : '3.3px'}
              ${local.br ? '15.5px' : '3.3px'}
              ${local.bl ? '15.5px' : '3.3px'}
            `,
        }}
        class={cn(
          'h-full w-full box-border overflow-hidden bg-panel',
          local.class
        )}
        {...rest}
      >
        {local.children}
      </div>
    </div>
  );
}