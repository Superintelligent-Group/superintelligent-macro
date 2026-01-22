/**
 * Badges Slot - Shared badge and project path badge.
 */

import {
  Show,
  Suspense,
  createMemo,
  createDeferred,
  createSignal,
  type JSX,
} from 'solid-js';
import type { EntityData, ProjectEntity } from '@macro-entity';
import type { SlotProps, SlotRenderer, EntityClickHandler } from '../types';
import { Tooltip } from '@core/component/Tooltip';
import { UserIcon } from '@core/component/UserIcon';
import { useUserId } from '@core/context/user';
import { tryMacroId, useDisplayName } from '@core/user';
// Import project utilities from macro-entity queries
// These are internal exports not re-exported from the main index
import {
  createProjectQuery,
  isProjectContainedEntity,
  type ProjectContainedEntity,
} from '../../../../../macro-entity/src/queries/project';

export type BadgesSlotConfig = {
  showShared?: boolean;
  showProject?: boolean;
  onClick?: EntityClickHandler<EntityData>;
  onPointerDown?: EntityClickHandler<EntityData>;
};

/** Shared badge showing who shared the entity */
function SharedBadge(props: { ownerId: string }): JSX.Element {
  const [ownerDisplayName] = useDisplayName(tryMacroId(props.ownerId));

  return (
    <Tooltip tooltip={`${ownerDisplayName()} shared with you`}>
      <div class="font-mono font-medium user-select-none uppercase flex items-center text-ink-extra-muted p-0.5 gap-1 text-[0.625rem] rounded-full border border-edge-muted pr-2">
        <UserIcon id={props.ownerId} size="xs" />
        shared
      </div>
    </Tooltip>
  );
}

/** Project path display with truncation */
function EntityProjectPathDisplay(props: {
  name: string;
  path: string[];
}): JSX.Element {
  const [displayPath, setDisplayPath] = createSignal<string | undefined>(
    props.name
  );
  const [truncated, setTruncated] = createSignal(false);

  const fullPath = createMemo(() => props.path.join(' / '));

  const getDisplayPath = (): { name: string; truncated: boolean } => {
    const fullPathString = fullPath();
    const maxLength = 30;

    if (fullPathString.length <= maxLength) {
      return { name: fullPathString, truncated: false };
    }

    if (props.path.length === 1) {
      return {
        name: props.path[0].slice(0, maxLength - 3) + '...',
        truncated: true,
      };
    }

    if (props.path.length === 2) {
      const first = props.path[0];
      const last = props.path[props.path.length - 1];
      const combined = `${first} / ... / ${last}`;
      if (combined.length <= maxLength) {
        return { name: combined, truncated: true };
      }
      return {
        name: `${first.slice(0, 10)}... / ${last.slice(0, 10)}...`,
        truncated: true,
      };
    }

    const first = props.path[0];
    const last = props.path[props.path.length - 1];
    return { name: `${first} / ... / ${last}`, truncated: true };
  };

  createDeferred(() => {
    const { name, truncated } = getDisplayPath();
    setDisplayPath(name);
    setTruncated(truncated);
  });

  return (
    <Tooltip tooltip={fullPath()} hide={!truncated()}>
      <div class="truncate">{displayPath()}</div>
    </Tooltip>
  );
}

/** Project path badge */
function EntityProject(props: {
  entity: ProjectContainedEntity;
  onClick?: EntityClickHandler<ProjectEntity>;
  onPointerDown?: EntityClickHandler<ProjectEntity>;
}): JSX.Element {
  const projectQuery = createProjectQuery(props.entity.projectId);

  const openProjectEntity = (args: {
    event: MouseEvent | PointerEvent;
    eventHandler?: EntityClickHandler<ProjectEntity>;
  }) => {
    if (!projectQuery.isSuccess) return;

    const data = projectQuery.data;
    const projectEntity: ProjectEntity = {
      type: 'project',
      id: data.id,
      name: data.name,
      ownerId: data.owner,
      updatedAt: data.updatedAt,
    };
    args.eventHandler?.({
      type: 'entity-project-path',
      entity: props.entity as unknown as ProjectEntity,
      projectEntity,
      event: args.event,
    });
  };

  return (
    <div
      data-blocks-navigation={projectQuery.isSuccess ? 'true' : undefined}
      onClick={(e) =>
        openProjectEntity({ event: e, eventHandler: props.onClick })
      }
      onPointerDown={(e) =>
        openProjectEntity({ event: e, eventHandler: props.onPointerDown })
      }
      class="flex gap-1 items-center text-xs text-ink-extra-muted min-w-0"
      classList={{
        'hover:text-accent': projectQuery.isSuccess,
      }}
    >
      <svg
        class="shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
      >
        <path
          d="M15.1875 5.0625H9.18773L7.23727 3.6C7.04225 3.45449 6.80558 3.3756 6.56227 3.375H2.8125C2.51413 3.375 2.22798 3.49353 2.017 3.7045C1.80603 3.91548 1.6875 4.20163 1.6875 4.5V14.0625C1.6875 14.3609 1.80603 14.647 2.017 14.858C2.22798 15.069 2.51413 15.1875 2.8125 15.1875H15.2501C15.5317 15.1871 15.8018 15.0751 16.0009 14.8759C16.2001 14.6768 16.3121 14.4067 16.3125 14.1251V6.1875C16.3125 5.88913 16.194 5.60298 15.983 5.392C15.772 5.18103 15.4859 5.0625 15.1875 5.0625ZM15.1875 14.0625H2.8125V4.5H6.56227L8.6625 6.075C8.75987 6.14803 8.87829 6.1875 9 6.1875H15.1875V14.0625Z"
          fill="currentColor"
        />
      </svg>
      <Suspense
        fallback={<div class="h-3 w-10 bg-ink-placeholder animate-pulse" />}
      >
        <Show when={projectQuery.data}>
          {(data) => (
            <EntityProjectPathDisplay name={data().name} path={data().path} />
          )}
        </Show>
      </Suspense>
    </div>
  );
}

/** Badges slot component */
export function BadgesSlot<T extends EntityData>(
  props: SlotProps<T> & BadgesSlotConfig
): JSX.Element {
  const userId = useUserId();

  const sharedData = () => {
    if (props.entity.type === 'channel') return false;
    if (props.entity.ownerId === userId()) return false;
    return { ownerId: props.entity.ownerId };
  };

  const projectEntity = () => {
    if (!props.showProject) return null;
    if (!isProjectContainedEntity(props.entity)) return null;
    return props.entity as ProjectContainedEntity;
  };

  return (
    <>
      <Show when={props.showShared && sharedData()}>
        {(shared) => <SharedBadge ownerId={shared().ownerId} />}
      </Show>
      <Show when={projectEntity()}>
        {(entity) => (
          <EntityProject
            entity={entity()}
            onClick={props.onClick as EntityClickHandler<ProjectEntity>}
            onPointerDown={
              props.onPointerDown as EntityClickHandler<ProjectEntity>
            }
          />
        )}
      </Show>
    </>
  );
}

/** Factory function to create badges slot renderer */
export function createBadgesSlot<T extends EntityData>(
  config: BadgesSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <BadgesSlot
      {...props}
      showShared={config.showShared ?? true}
      showProject={config.showProject ?? true}
      onClick={config.onClick}
      onPointerDown={config.onPointerDown}
    />
  );
}
