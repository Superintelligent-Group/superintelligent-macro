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
import { For, Show, createMemo } from 'solid-js';
import { invalidatePropertiesForEntity } from '@queries/properties/entity';

type EntityPropertyValuesProps = {
  properties: Property[];
  entityId: string;
  entityType: EntityType;
  excludeKeyProperties?: boolean;
  maxDisplay?: number;
  onRefresh?: () => void;
};

const MAX_DEFAULT_DISPLAY = 4;

export const EntityPropertyValues = (props: EntityPropertyValuesProps) => {
  const displayProperties = createMemo(() =>
    props.properties.slice(0, props.maxDisplay ?? MAX_DEFAULT_DISPLAY)
  );

  const saveHandler: PropertySaveHandler = {
    saveProperty: async (property: Property, value: PropertyApiValues) => {
      try {
        const result = await saveEntityProperty(
          props.entityId,
          props.entityType,
          property,
          value
        );
        if (result.ok) {
          props.onRefresh?.();
          invalidatePropertiesForEntity(props.entityType, props.entityId);
        }
        return result;
      } catch (error) {
        console.error('Property save error', error);
        return { ok: false, error };
      }
    },
    saveDate: async (property: Property, date: Date) => {
      const dateValue = date.toISOString();
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
          invalidatePropertiesForEntity(props.entityType, props.entityId);
          props.onRefresh?.();
        }
        return result;
      } catch (error) {
        console.error('Property save error', error);
        return { ok: false, error };
      }
    },
  };

  return (
    <Show when={props.properties.length > 0}>
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
              <div class="relative">
                <PropertyValue property={property} condensed />
              </div>
            )}
          </For>
        </div>
        <Modals />
      </PropertiesProvider>
    </Show>
  );
};
