/**
 * Icon Slot - Entity type icon with DM participant support.
 */

import { Show, createMemo, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { EntityData } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import { getIconConfig } from '@core/component/EntityIcon';
import { UserIcon } from '@core/component/UserIcon';
import { useUserId } from '@core/context/user';
import { isTaskEntity } from '@macro-entity';

export type IconSlotConfig = {
  showDmParticipant?: boolean;
};

/** Get icon configuration for an entity */
export function getEntityIcon(entity: EntityData) {
  switch (entity.type) {
    case 'channel':
      switch (entity.channelType) {
        case 'direct_message':
          return getIconConfig('directMessage');
        case 'organization':
          return getIconConfig('company');
        default:
          return getIconConfig('channel');
      }
    case 'document':
      if (isTaskEntity(entity)) return getIconConfig('task');
      if (entity.fileType) return getIconConfig(entity.fileType);
      return getIconConfig('default');
    case 'chat':
      return getIconConfig('chat');
    case 'project':
      return getIconConfig('project');
    case 'email':
      return getIconConfig(entity.isRead ? 'emailRead' : 'email');
  }
}

/** Direct message icon showing participant avatar */
function DirectMessageIcon(props: { entity: EntityData }): JSX.Element {
  const userId = useUserId();
  const participantId = () =>
    props.entity.type === 'channel'
      ? (props.entity.participantIds ?? [])
          .filter((id) => id !== userId())
          .at(0)
      : undefined;

  const iconConfig = getIconConfig('directMessage');
  const Fallback = () => (
    <Dynamic
      component={iconConfig.icon}
      class={`flex size-full ${iconConfig.foreground}`}
    />
  );

  return (
    <div class="bg-panel size-5 rounded-full p-[2px]">
      <Show when={participantId()} fallback={<Fallback />}>
        {(id) => <UserIcon id={id()} isDeleted={false} size="xs" />}
      </Show>
    </div>
  );
}

/** Icon slot component */
export function IconSlot<T extends EntityData>(
  props: SlotProps<T> & IconSlotConfig
): JSX.Element {
  const iconConfig = createMemo(() => getEntityIcon(props.entity));

  const isDm = () =>
    props.entity.type === 'channel' &&
    props.entity.channelType === 'direct_message';

  return (
    <div class="flex size-5 shrink-0 items-center justify-center @max-md/uList:hidden">
      <Show
        when={props.showDmParticipant && isDm()}
        fallback={
          <Dynamic
            component={iconConfig().icon}
            class={`flex size-full ${iconConfig().foreground}`}
          />
        }
      >
        <DirectMessageIcon entity={props.entity} />
      </Show>
    </div>
  );
}

/** Factory function to create icon slot renderer */
export function createIconSlot<T extends EntityData>(
  config: IconSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <IconSlot {...props} showDmParticipant={config.showDmParticipant ?? true} />
  );
}
