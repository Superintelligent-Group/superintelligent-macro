import type { EntityData } from '../../types/entity';
import { Entity2 as Entity } from '..';

export function InlineEntity(props: { entity: EntityData }) {
  return (
    <div class="flex items-center gap-1 min-w-0">
      <span class="w-[1.25em]">
        <Entity.Icon entity={props.entity} />
      </span>
      <Entity.Title entity={props.entity} />
    </div>
  );
}
