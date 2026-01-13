import { PropertyDataTypeIcon } from '@core/component/Properties/utils';
import { PropertyValueIcon } from './PropertyValueIcon';
import { Tooltip } from '@core/component/Tooltip';
import { usePropertiesContext } from '../../context/PropertiesContext';
import { formatPropertyValue } from '@core/component/Properties/utils';
import type { Component } from 'solid-js';
import { For } from 'solid-js';
import type { Property } from '../../types';
import { isDateProperty, hasValue } from '../../guards';

type CondensedPropertyValueProps = {
  property: Property;
};

/**
 * Condensed property value display - shows as an icon-only pill but launches full modals for editing
 * Similar to PropertyPills but integrated with the Properties context for editing
 */
export const CondensedPropertyValue: Component<CondensedPropertyValueProps> = (
  props
) => {
  const { canEdit, openPropertyEditor, openDatePicker } =
    usePropertiesContext();

  const validValue = () => hasValue(props.property);
  const displayValue = () => formatPillValue(props.property);

  const handleClick = (e: MouseEvent) => {
    console.log('CondensedPropertyValue clicked:', props.property.displayName);

    if (!canEdit) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;

    if (isDateProperty(props.property)) {
      openDatePicker(props.property, target);
    } else {
      openPropertyEditor(props.property, target);
    }
  };

  // Don't render if no value and not editable
  if (!validValue() && !canEdit) return null;

  return (
    <Tooltip
      unstyled
      tooltip={<TooltipContent property={props.property} />}
      floatingOptions={{
        offset: 4,
        flip: true,
        shift: { padding: 8 },
      }}
    >
      <div
        class="inline-flex items-center gap-1.5 text-xs leading-none text-ink-muted border border-edge-muted/50 h-fit shrink-0 p-1.5 transition-colors"
        classList={{
          'cursor-pointer hover:border-edge-muted hover:bg-hover/50': canEdit,
          'opacity-50': !validValue(),
        }}
        onClick={handleClick}
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
      >
        <PillIcon property={props.property} />
      </div>
    </Tooltip>
  );
};

/**
 * Tooltip content showing property name and value(s)
 */
const TooltipContent = (props: { property: Property }) => {
  const values = () => getDisplayValues(props.property);

  return (
    <div class="flex flex-col gap-1">
      <div class="font-medium text-sm">{props.property.displayName}</div>
      {values().length > 0 ? (
        <div class="flex items-center gap-1.5 flex-wrap">
          <For each={values()}>
            {(value, index) => (
              <div class="inline-flex items-center gap-1.5 px-2 py-1 text-xs leading-none text-ink-muted border border-edge-muted/50 h-fit w-fit">
                <TooltipValueIcon
                  property={props.property}
                  valueIndex={index()}
                />
                <span class="truncate max-w-[150px]">{value}</span>
              </div>
            )}
          </For>
        </div>
      ) : (
        <span class="text-xs text-ink-muted">No value</span>
      )}
    </div>
  );
};

/**
 * Icon component for condensed pills - uses special icons for select values when available
 */
const PillIcon = (props: { property: Property }) => {
  // For SELECT_STRING and SELECT_NUMBER with single value, try to use special icon
  if (
    (props.property.valueType === 'SELECT_STRING' ||
      props.property.valueType === 'SELECT_NUMBER') &&
    props.property.value &&
    Array.isArray(props.property.value) &&
    props.property.value.length === 1
  ) {
    const optionId = props.property.value[0];
    return <PropertyValueIcon optionId={optionId} class="size-3.5 shrink-0" />;
  }

  // Default to data type icon
  return (
    <PropertyDataTypeIcon
      property={{
        data_type: props.property.valueType,
        specific_entity_type: props.property.specificEntityType,
      }}
      class="size-3.5 shrink-0"
    />
  );
};

/**
 * Icon component for tooltip values - uses special icons for select values when available
 */
const TooltipValueIcon = (props: {
  property: Property;
  valueIndex: number;
}) => {
  // For SELECT_STRING and SELECT_NUMBER, try to use special icon for the specific value
  if (
    (props.property.valueType === 'SELECT_STRING' ||
      props.property.valueType === 'SELECT_NUMBER') &&
    props.property.value &&
    Array.isArray(props.property.value) &&
    props.property.value[props.valueIndex]
  ) {
    const optionId = props.property.value[props.valueIndex];
    return <PropertyValueIcon optionId={optionId} class="size-3 shrink-0" />;
  }

  return null;
};

/**
 * Get array of display values for tooltip
 */
const getDisplayValues = (property: Property): string[] => {
  if (property.value === null || property.value === undefined) return [];

  if (
    (property.valueType === 'SELECT_STRING' ||
      property.valueType === 'SELECT_NUMBER') &&
    Array.isArray(property.value)
  ) {
    return property.value.map((v) => formatPropertyValue(property, v));
  }

  if (property.valueType === 'DATE' && property.value instanceof Date) {
    return [formatPropertyValue(property, property.value)];
  }

  if (property.valueType === 'NUMBER' && typeof property.value === 'number') {
    return [formatPropertyValue(property, property.value)];
  }

  if (property.valueType === 'STRING' && typeof property.value === 'string') {
    return property.value ? [property.value] : [];
  }

  if (property.valueType === 'BOOLEAN' && typeof property.value === 'boolean') {
    return [formatPropertyValue(property, property.value)];
  }

  if (property.valueType === 'ENTITY' && property.value) {
    return property.value.map((entity) => entity.entity_id || 'Unknown Entity');
  }

  if (property.valueType === 'LINK' && property.value) {
    return property.value.map((link) => link || 'Invalid Link');
  }

  return [];
};

const formatPillValue = (property: Property): string | null => {
  if (!hasValue(property)) return null;

  if (
    (property.valueType === 'DATE' && property.value instanceof Date) ||
    (property.valueType === 'NUMBER' && typeof property.value === 'number')
  ) {
    return formatPropertyValue(property, property.value);
  }

  if (property.valueType === 'STRING' && typeof property.value === 'string') {
    return property.value || null;
  }

  if (property.valueType === 'BOOLEAN' && typeof property.value === 'boolean') {
    return formatPropertyValue(property, property.value);
  }

  // Handle SELECT_STRING and SELECT_NUMBER
  if (
    (property.valueType === 'SELECT_STRING' ||
      property.valueType === 'SELECT_NUMBER') &&
    Array.isArray(property.value)
  ) {
    if (property.value.length === 0) {
      return null;
    }
    // Multi-select with multiple values: show "Property Name (N)"
    if (property.isMultiSelect && property.value.length > 1) {
      return `${property.displayName} (${property.value.length})`;
    }
    // Single value (or multi-select with 1 value): show the value
    return formatPropertyValue(property, property.value[0]);
  }

  // Handle ENTITY and LINK types
  if (property.valueType === 'ENTITY' && property.value) {
    return property.value.length > 1
      ? `${property.displayName} (${property.value.length})`
      : property.value[0]?.entity_id || 'Unknown Entity';
  }

  if (property.valueType === 'LINK' && property.value) {
    return property.value.length > 1
      ? `${property.displayName} (${property.value.length})`
      : property.value[0] || 'Invalid Link';
  }

  return null;
};
