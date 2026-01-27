import type { ParentProps } from 'solid-js';
import type { EntityData } from '../../types/entity';

export function Container(props: ParentProps<{ entity: EntityData }>) {
  return <div class="entity-container">{props.children}</div>;
}
