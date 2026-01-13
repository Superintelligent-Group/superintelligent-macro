import { PropertyValue } from '@core/component/Properties/component/propertyValue/PropertyValue';
import {
  PropertiesProvider,
  type PropertySaveHandler,
} from '@core/component/Properties/context/PropertiesContext';
import { Modals } from '@core/component/Properties/component/modal';
import { saveEntityProperty } from '@core/component/Properties/api';
import type {
  Property,
  PropertyApiValues,
} from '@core/component/Properties/types';
import type { EntityType } from '@service-properties/generated/schemas/entityType';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { usePropertyInvalidation } from '@queries/properties/invalidation';
import { SYSTEM_PROPERTY_IDS } from '@core/component/Properties/constants';

type EntityPropertyValuesProps = {
  properties: Property[];
  entityId: string;
  entityType: EntityType;
  /** For tasks, exclude key properties (status, priority, assignees) that are shown in KeyPropertiesGrid */
  excludeKeyProperties?: boolean;
  /** Maximum number of properties to display */
  maxDisplay?: number;
  /** Called when properties are refreshed */
  onRefresh?: () => void;
};

/**
 * Component to display condensed property values for a specific entity with editing capabilities
 * Similar to PropertyPills but integrated with the Properties context for full modal editing
 */
const MAX_DEFAULT_DISPLAY = 4;

const TASK_KEY_PROPERTY_IDS = [
  SYSTEM_PROPERTY_IDS.ASSIGNEES,
  SYSTEM_PROPERTY_IDS.PRIORITY,
  SYSTEM_PROPERTY_IDS.STATUS,
] as const;

export const EntityPropertyValues = (props: EntityPropertyValuesProps) => {
  const filteredProperties = createMemo(() => {
    let properties = props.properties;

    if (props.excludeKeyProperties) {
      properties = properties.filter(
        (property) =>
          !TASK_KEY_PROPERTY_IDS.includes(property.propertyDefinitionId as any)
      );
    }

    return properties;
  });

  const displayProperties = createMemo(() =>
    filteredProperties().slice(0, props.maxDisplay ?? MAX_DEFAULT_DISPLAY)
  );

  const {
    optimisticallyUpdateProperty,
    invalidateEntityProperties,
    invalidateAllProperties,
  } = usePropertyInvalidation();

  // Track saving state for visual feedback
  const [savingProperties, setSavingProperties] = createSignal<Set<string>>(
    new Set()
  );

  const setSaving = (propertyId: string, saving: boolean) => {
    setSavingProperties((prev) => {
      const next = new Set(prev);
      if (saving) {
        next.add(propertyId);
      } else {
        next.delete(propertyId);
      }
      return next;
    });
  };

  // Create save handler with optimistic updates and visual feedback
  const saveHandler: PropertySaveHandler = {
    saveProperty: async (property: Property, value: PropertyApiValues) => {
      console.log('SAVING', props.entityId, property.displayName, value);
      setSaving(property.propertyId, true);

      // Optimistic update - immediately update the cache with new value
      const optimisticValue = (() => {
        switch (value.valueType) {
          case 'STRING':
          case 'NUMBER':
          case 'DATE':
          case 'BOOLEAN':
            return value.value;
          case 'SELECT_STRING':
          case 'SELECT_NUMBER':
          case 'LINK':
            return value.values;
          case 'ENTITY':
            return value.refs;
          default:
            return (value as any).value;
        }
      })();
      console.log('###1 optimistic value', optimisticValue);

      // optimisticallyUpdateProperty(
      //   props.entityId,
      //   props.entityType,
      //   property.propertyId,
      //   optimisticValue
      // );

      try {
        const result = await saveEntityProperty(
          props.entityId,
          props.entityType,
          property,
          value
        );

        if (result.ok) {
          // Successful save - invalidate queries to ensure fresh data
          await invalidateEntityProperties(props.entityId, props.entityType);
          invalidateAllProperties();
          props.onRefresh?.();
        } else {
          // Save failed - revert optimistic update by invalidating
          await invalidateEntityProperties(props.entityId, props.entityType);
        }

        return result;
      } catch (error) {
        // Network error - revert optimistic update
        await invalidateEntityProperties(props.entityId, props.entityType);
        throw error;
      } finally {
        setSaving(property.propertyId, false);
      }
    },
    saveDate: async (property: Property, date: Date) => {
      const dateValue = date.toISOString();

      setSaving(property.propertyId, true);

      // Optimistic update
      optimisticallyUpdateProperty(
        props.entityId,
        props.entityType,
        property.propertyId,
        date
      );

      try {
        const result = await saveEntityProperty(
          props.entityId,
          props.entityType,
          property,
          {
            valueType: 'DATE',
            value: dateValue,
          }
        );

        if (result.ok) {
          // Successful save - invalidate to ensure fresh data
          await invalidateEntityProperties(props.entityId, props.entityType);
          props.onRefresh?.();
        } else {
          // Save failed - revert optimistic update
          await invalidateEntityProperties(props.entityId, props.entityType);
        }

        return result;
      } catch (error) {
        // Network error - revert optimistic update
        await invalidateEntityProperties(props.entityId, props.entityType);
        throw error;
      } finally {
        setSaving(property.propertyId, false);
      }
    },
  };

  return (
    <Show when={filteredProperties().length > 0}>
      <PropertiesProvider
        entityType={props.entityType}
        canEdit={true}
        properties={displayProperties}
        onRefresh={props.onRefresh || (() => {})}
        onPropertyAdded={() => props.onRefresh?.()}
        onPropertyDeleted={() => props.onRefresh?.()}
        saveHandler={saveHandler}
      >
        <div class="flex items-center gap-1 justify-end">
          <For each={displayProperties()}>
            {(property) => (
              <div
                class="relative"
                classList={{
                  'opacity-50': savingProperties().has(property.propertyId),
                }}
              >
                <PropertyValue property={property} condensed={true} />
                <Show when={savingProperties().has(property.propertyId)}>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-2 h-2 border border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
        <Modals />
      </PropertiesProvider>
    </Show>
  );
};
