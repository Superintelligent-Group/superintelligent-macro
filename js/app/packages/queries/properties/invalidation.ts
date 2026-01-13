import { queryClient } from '../client';
import { propertiesKeys } from './keys';
import type { EntityType } from '../../service-clients/service-properties/generated/schemas/entityType';
import { SYSTEM_PROPERTY_IDS } from '@core/component/Properties/constants';

/**
 * Hook to provide property query invalidation functions
 * Used for optimistic updates and cache invalidation after property changes
 */
export function usePropertyInvalidation() {
  /**
   * Invalidate all property queries for a specific entity
   */
  const invalidateEntityProperties = async (
    entityId: string,
    entityType: EntityType
  ) => {
    console.log('INVALIDATING ENTITY', entityId);
    await queryClient.invalidateQueries({
      queryKey: propertiesKeys.entity({
        entityType,
        entityId,
      }).queryKey,
      exact: false,
    });

    await queryClient.invalidateQueries({
      queryKey: propertiesKeys.bulk({
        entities: [
          {
            entity_id: entityId,
            entity_type: entityType,
          },
        ],
        propertyDefinitionIds: [
          SYSTEM_PROPERTY_IDS.ASSIGNEES,
          SYSTEM_PROPERTY_IDS.PRIORITY,
          SYSTEM_PROPERTY_IDS.STATUS,
        ],
      }).queryKey,
      exact: false,
    });
  };

  /**
   * Invalidate all property queries
   */
  const invalidateAllProperties = async () => {
    await queryClient.invalidateQueries({
      queryKey: propertiesKeys.all.queryKey,
    });
  };

  /**
   * Optimistically update a property value in the cache
   */
  const optimisticallyUpdateProperty = (
    entityId: string,
    entityType: EntityType,
    propertyId: string,
    newValue: any
  ) => {
    // Update individual entity cache
    queryClient.setQueriesData(
      {
        queryKey: propertiesKeys.entity({
          entityType,
          entityId,
        }).queryKey,
        exact: false,
      },
      (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;

        return oldData.map((property: any) =>
          property.propertyId === propertyId
            ? { ...property, value: newValue }
            : property
        );
      }
    );

    // Update bulk queries more precisely by targeting all bulk variations
    // We don't need a complex predicate - just update all bulk queries that might contain this entity
    queryClient.setQueriesData(
      {
        queryKey: propertiesKeys.bulk._def,
        exact: false, // This targets all bulk queries
        predicate: (query) => {
          // Only update bulk queries that contain our entity
          const queryKey = query.queryKey;
          if (queryKey[0] !== 'properties' || queryKey[1] !== 'bulk') {
            return false;
          }

          const bulkParams = queryKey[2] as any;
          if (!bulkParams?.entities) return false;

          // Check if this bulk query includes our entity
          return bulkParams.entities.some(
            (entity: any) =>
              entity.entity_id === entityId && entity.entity_type === entityType
          );
        },
      },
      (oldData: any) => {
        if (typeof oldData !== 'object' || !oldData) return oldData;

        // Only update if this entity exists in the bulk data
        if (!(entityId in oldData)) {
          return oldData;
        }

        const entityProperties = oldData[entityId];
        if (!Array.isArray(entityProperties)) {
          return oldData;
        }

        return {
          ...oldData,
          [entityId]: entityProperties.map((property: any) =>
            property.propertyId === propertyId
              ? { ...property, value: newValue }
              : property
          ),
        };
      }
    );
  };

  return {
    invalidateEntityProperties,
    invalidateAllProperties,
    optimisticallyUpdateProperty,
  };
}
