import { PropertyValue } from '@core/component/Properties/component/propertyValue/PropertyValue';
import {
  PropertiesProvider,
  type PropertySaveHandler,
} from '@core/component/Properties/context/PropertiesContext';
import { Modals } from '@core/component/Properties/component/modal';
import type {
  Property,
  PropertyApiValues,
} from '@core/component/Properties/types';
import type { EntityType } from '@service-properties/generated/schemas/entityType';
import { For, Show, createMemo } from 'solid-js';
import { useSaveEntityPropertyMutation } from '@queries/properties/entity';

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

  const saveMutation = useSaveEntityPropertyMutation({
    onSuccess: () => {
      props.onRefresh?.();
    },
  });

  const saveHandler: PropertySaveHandler = {
    saveProperty: (property: Property, value: PropertyApiValues) =>
      saveMutation.mutateAsync({
        entityId: props.entityId,
        entityType: props.entityType,
        property,
        apiValues: value,
      }),
    saveDate: (property: Property, date: Date) =>
      saveMutation.mutateAsync({
        entityId: props.entityId,
        entityType: props.entityType,
        property,
        apiValues: {
          valueType: 'DATE',
          value: date.toISOString(),
        },
      }),
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
        <div class="flex items-center gap-1 justify-start overflow-hidden">
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
