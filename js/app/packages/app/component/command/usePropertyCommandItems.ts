import type { EntityType } from '@service-properties/generated/schemas/entityType';
import { createMemo } from 'solid-js';
import type { EntityData } from '../../../macro-entity/src/types/entity';
import type { CommandItemCard } from './KonsoleItem';

/**
 * Helper function to map EntityData type to Properties EntityType
 */
function getPropertiesEntityType(entity: EntityData): EntityType {
  // Handle task entities (documents with task subtype)
  if (entity.type === 'document' && entity.subType?.type === 'task') {
    return 'TASK';
  }

  switch (entity.type) {
    case 'document':
      return 'DOCUMENT';
    case 'channel':
      return 'CHANNEL';
    case 'email':
      return 'THREAD'; // Email entities map to THREAD in Properties service
    case 'project':
      return 'PROJECT';
    case 'chat':
      return 'CHAT';
    default:
      return 'DOCUMENT'; // Default fallback
  }
}

/**
 * Hook that creates command items for editing properties
 * Note: Currently returns empty array since we don't have access to selected entities
 * from the command context. This would need to be integrated differently.
 */
export const usePropertyCommandItems = () => {
  // For now, return an empty array since we can't access split panel context
  // from within the command system. This would need to be refactored to either:
  // 1. Pass selected entities as parameters
  // 2. Use a different context system
  // 3. Move this functionality outside the command system
  const propertyCommandItems = createMemo(() => {
    const items: CommandItemCard[] = [];
    return items;
  });

  return propertyCommandItems;
};
