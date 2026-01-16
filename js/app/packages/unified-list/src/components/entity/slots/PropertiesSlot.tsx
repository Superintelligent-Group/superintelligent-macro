/**
 * Properties Slot - Task properties display (status, priority, assignees).
 *
 * Renders condensed property pills for task entities.
 */

import { Show, For, createMemo, type JSX } from 'solid-js';
import type { EntityData } from '@macro-entity';
import type { SlotProps, SlotRenderer } from '../types';
import type {
  Property,
  EntityReference,
} from '@core/component/Properties/types';
import {
  SYSTEM_PROPERTY_IDS,
  PROPERTY_OPTION_IDS,
} from '@core/component/Properties/constants';
import { UserIcon } from '@core/component/UserIcon';
import { Tooltip } from '@core/component/Tooltip';

// Status icons
import StatusCanceled from '@macro-icons/square/task-cancelled.svg';
import StatusCreated from '@macro-icons/square/task-created.svg';
import StatusDone from '@macro-icons/square/task-done.svg';
import StatusInProgress from '@macro-icons/square/task-in-progress.svg';
import StatusInReview from '@macro-icons/square/task-in-review.svg';

// Priority icons
import PriorityHigh from '@macro-icons/wide/priority-high.svg';
import PriorityLow from '@macro-icons/wide/priority-low.svg';
import PriorityMedium from '@macro-icons/wide/priority-medium.svg';
import PriorityUrgent from '@macro-icons/wide/priority-urgent.svg';

export type PropertiesSlotConfig = {
  /** Properties to display */
  properties?: Property[];
  /** Click handler for property editing */
  onPropertyClick?: (property: Property, anchor: HTMLElement) => void;
};

// ============================================================================
// Property Value Helpers
// ============================================================================

/** Get select property values (option IDs) */
function getSelectValues(property: Property): string[] {
  if (
    property.valueType === 'SELECT_STRING' ||
    property.valueType === 'SELECT_NUMBER'
  ) {
    return property.value ?? [];
  }
  return [];
}

/** Check if property has a value */
function hasValue(property: Property): boolean {
  if (property.value === null || property.value === undefined) return false;
  if (Array.isArray(property.value) && property.value.length === 0)
    return false;
  return true;
}

/** Check if property is a select type */
function isSelectProperty(property: Property): boolean {
  return (
    property.valueType === 'SELECT_STRING' ||
    property.valueType === 'SELECT_NUMBER'
  );
}

// ============================================================================
// Property Icons
// ============================================================================

/** Render status icon based on option ID */
function StatusIcon(props: { optionId: string }): JSX.Element | null {
  const { STATUS } = PROPERTY_OPTION_IDS;

  switch (props.optionId) {
    case STATUS.NOT_STARTED:
      return <StatusCreated class="size-3 text-ink-extra-muted" />;
    case STATUS.IN_PROGRESS:
      return <StatusInProgress class="size-3 text-ink" />;
    case STATUS.IN_REVIEW:
      return <StatusInReview class="size-3 text-success-ink" />;
    case STATUS.COMPLETED:
      return <StatusDone class="size-3 text-accent" />;
    case STATUS.CANCELED:
      return <StatusCanceled class="size-3 text-ink-extra-muted" />;
    default:
      return null;
  }
}

/** Render priority icon based on option ID */
function PriorityIcon(props: { optionId: string }): JSX.Element | null {
  const { PRIORITY } = PROPERTY_OPTION_IDS;

  switch (props.optionId) {
    case PRIORITY.LOW:
      return <PriorityLow class="size-3 text-ink-extra-muted" />;
    case PRIORITY.MEDIUM:
      return <PriorityMedium class="size-3 text-ink-extra-muted" />;
    case PRIORITY.HIGH:
      return <PriorityHigh class="size-3 text-ink-extra-muted" />;
    case PRIORITY.URGENT:
      return <PriorityUrgent class="size-3 text-accent" />;
    default:
      return null;
  }
}

// ============================================================================
// Property Pill Components
// ============================================================================

/** User group display for assignees */
function UserGroup(props: {
  entityIds: string[];
  maxUsers?: number;
}): JSX.Element {
  const max = () => props.maxUsers ?? 2;
  const remaining = createMemo(() => {
    if (props.entityIds.length <= max()) return 0;
    return props.entityIds.length - max();
  });
  const displayIds = () => props.entityIds.slice(0, max());

  return (
    <div class="flex items-center shrink-0 w-fit pr-3">
      <For each={displayIds()}>
        {(entityId) => (
          <div class="bg-panel rounded-full p-[2px] -mr-3">
            <UserIcon
              id={entityId}
              isDeleted={false}
              size="xs"
              suppressClick
              showTooltip={false}
            />
          </div>
        )}
      </For>
      <Show when={remaining() > 0}>
        <div class="z-4">
          <div class="size-5 bg-menu border-2 text-[10px] -mr-2 text-ink border-panel rounded-full flex flex-col justify-center items-center">
            <span>+{remaining()}</span>
          </div>
        </div>
      </Show>
    </div>
  );
}

/** Get display label for a select property value */
function getSelectLabel(property: Property, optionId: string): string {
  const option = property.options?.find((o) => o.id === optionId);
  // PropertyOptionValue is { type, value } discriminated union
  return option?.value?.value?.toString() ?? optionId;
}

/** Single property pill */
function PropertyPill(props: {
  property: Property;
  onClick?: (property: Property, anchor: HTMLElement) => void;
}): JSX.Element {
  const isStatus = () =>
    props.property.propertyDefinitionId === SYSTEM_PROPERTY_IDS.STATUS;
  const isPriority = () =>
    props.property.propertyDefinitionId === SYSTEM_PROPERTY_IDS.PRIORITY;
  const isAssignees = () =>
    props.property.propertyDefinitionId === SYSTEM_PROPERTY_IDS.ASSIGNEES;

  const tooltipContent = () => {
    const property = props.property;
    if (isSelectProperty(property)) {
      const values = getSelectValues(property);
      if (values.length === 0) return `${property.displayName}: Not set`;
      const labels = values.map((v) => getSelectLabel(property, v));
      return `${property.displayName}: ${labels.join(', ')}`;
    }
    if (property.valueType === 'ENTITY' && property.value) {
      const count = property.value.length;
      return `${property.displayName}: ${count} assigned`;
    }
    return property.displayName;
  };

  const handleClick = (e: MouseEvent) => {
    if (!props.onClick) return;
    e.stopPropagation();
    props.onClick(props.property, e.currentTarget as HTMLElement);
  };

  // Render assignees as user group
  if (
    isAssignees() &&
    props.property.valueType === 'ENTITY' &&
    props.property.value
  ) {
    // Type assertion after discriminant check - value is EntityReference[] when valueType is ENTITY
    const entityRefs = props.property.value as EntityReference[];
    const entityIds = entityRefs.map((ref) => ref.entity_id);
    return (
      <Tooltip tooltip={tooltipContent()}>
        <div
          class="inline-flex items-center cursor-pointer"
          onClick={handleClick}
          data-blocks-navigation
        >
          <UserGroup entityIds={entityIds} maxUsers={2} />
        </div>
      </Tooltip>
    );
  }

  // Render status/priority as icon pill
  if ((isStatus() || isPriority()) && isSelectProperty(props.property)) {
    const values = getSelectValues(props.property);
    const firstValue = values[0];

    if (!firstValue) return <></>;

    return (
      <Tooltip tooltip={tooltipContent()}>
        <div
          class="inline-flex items-center text-xs leading-none text-ink-muted shrink-0 py-1.5 h-6.5 border border-edge-muted/50 px-1.5 cursor-pointer hover:border-edge-muted hover:bg-hover/50 transition-colors"
          onClick={handleClick}
          data-blocks-navigation
        >
          <Show when={isStatus()}>
            <StatusIcon optionId={firstValue} />
          </Show>
          <Show when={isPriority()}>
            <PriorityIcon optionId={firstValue} />
          </Show>
        </div>
      </Tooltip>
    );
  }

  // Don't render unsupported property types
  return <></>;
}

// ============================================================================
// Main Slot Component
// ============================================================================

/** Properties slot component - renders key task properties as condensed pills */
export function PropertiesSlot<T extends EntityData>(
  props: SlotProps<T> & PropertiesSlotConfig
): JSX.Element {
  const properties = () => props.properties ?? [];

  // Filter to key properties and sort: Status, Priority, Assignees
  const keyProperties = createMemo(() => {
    const all = properties();
    const keyIds = [
      SYSTEM_PROPERTY_IDS.STATUS,
      SYSTEM_PROPERTY_IDS.PRIORITY,
      SYSTEM_PROPERTY_IDS.ASSIGNEES,
    ];

    return keyIds
      .map((id) => all.find((p) => p.propertyDefinitionId === id))
      .filter((p): p is Property => p !== undefined && hasValue(p));
  });

  return (
    <Show when={keyProperties().length > 0}>
      <div class="flex items-center gap-1">
        <For each={keyProperties()}>
          {(property) => (
            <PropertyPill property={property} onClick={props.onPropertyClick} />
          )}
        </For>
      </div>
    </Show>
  );
}

/** Factory function to create properties slot renderer */
export function createPropertiesSlot<T extends EntityData>(
  config: PropertiesSlotConfig = {}
): SlotRenderer<T> {
  return (props) => (
    <PropertiesSlot
      {...props}
      properties={config.properties}
      onPropertyClick={config.onPropertyClick}
    />
  );
}
