import { Entity2 } from '../Entity2';
import type { EntityData } from '../types/entity';

interface EntityMinimalProps {
  entity: EntityData;
  onClick?: (event: MouseEvent) => void;
}

export function EntityMinimal(props: EntityMinimalProps) {
  return (
    <Entity2.Container entity={props.entity}>
      <Entity2.Layout class="flex items-center gap-2 p-2 pl-8">
        <Entity2.Slot.Icon class="size-5">
          <Entity2.Extractor.Icon entity={props.entity} />
        </Entity2.Slot.Icon>
        <Entity2.Slot.Title class="text-sm font-semibold">
          <Entity2.Extractor.Title entity={props.entity} />
        </Entity2.Slot.Title>
      </Entity2.Layout>
    </Entity2.Container>
  );
}
