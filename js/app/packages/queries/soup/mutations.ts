import {
  copyItem,
  deleteItem,
  moveToFolder,
  renameItem,
} from '@core/component/FileList/itemOperations';
import { toast } from '@core/component/Toast/Toast';
import { useMutation } from '@tanstack/solid-query';
import type { EntityData } from '@entity';
import { queryClient } from '@queries/client';
import { soupKeys } from './keys';
import {
  removeSoupEntities,
  removeSearchEntities,
  getSoupEntityById,
  optimisticUpdateSoupEntity,
  invalidateSoupEntity,
  type SoupTransaction,
} from './cache';
import {
  optimisticUpdateChannelName,
  rollbackUpdateChannelName,
  type UpdateChannelNameContext,
} from '@queries/channel/channel';
import { type MutationCallbacks, withCallbacks } from '@queries/utils';
import type { ItemType } from '@service-storage/client';
import { ChannelTypeEnum } from '@service-comms/client';
import { setPreviewName } from '@queries/preview';
import { setHistoryItemName } from '@queries/history/history';
import { createCognitionWebsocketEffect } from '@service-cognition/websocket';

export function createBulkDeleteSoupItemsMutation() {
  const isUnsupportedEntity = (entity: EntityData) => {
    const type = entity.type;
    return type !== 'chat' && type !== 'document' && type !== 'project';
  };
  return useMutation(() => ({
    mutationFn: async (entities: EntityData[]) => {
      if (entities.some(isUnsupportedEntity)) {
        throw new Error(`Unsupported entity types`);
      }

      return await Promise.all(
        entities.map((e) => {
          return deleteItem({ id: e.id, itemType: e.type });
        })
      );
    },
    onMutate: async (entities: EntityData[]) => {
      const ids = new Set(entities.map((e) => e.id));
      const soupSnapshot = removeSoupEntities(ids);
      const searchSnapshot = removeSearchEntities(ids);
      return { soupSnapshot, searchSnapshot };
    },
    onError: (error, entities, context) => {
      context?.soupSnapshot.rollback();
      context?.searchSnapshot.rollback();
      console.error(`Failed to delete soup items`, entities, error);
      toast.failure('Failed to delete items');
    },
  }));
}

function invalidateAfterMove(
  entityIds: string[],
  hasProjects: boolean,
  failed?: boolean
) {
  if (failed) {
    toast.failure('Failed to move item');
  }

  for (const id of entityIds) {
    invalidateSoupEntity(id);
  }
  queryClient.invalidateQueries({ queryKey: ['entity'] });
  // If moving a project, invalidate all project queries since nested projects' breadcrumbs change too
  if (hasProjects) {
    queryClient.invalidateQueries({
      queryKey: ['project'],
    });
  }
}

export function createMoveToProjectSoupEntityMutation() {
  return useMutation(() => ({
    mutationFn: async ({
      entity: { id, type },
      project: { id: projectId },
    }: {
      entity: EntityData & { type: 'document' | 'chat' | 'project' };
      project: { id: string };
    }) => {
      const success = await moveToFolder({
        itemType: type,
        id,
        folderId: projectId,
      });

      return { success };
    },
    onMutate: async ({
      entity: { id, type },
      project: { id: projectId },
    }: {
      entity: EntityData & { type: 'document' | 'chat' | 'project' };
      project: { id: string };
    }) => {
      if (type !== 'project') {
        const current = getSoupEntityById(id);
        return optimisticUpdateSoupEntity({
          tag: type,
          data: { id, projectId },
          frecency_score: current?.frecency_score ?? 0,
        });
      }
    },
    onSettled: (data, error, { entity: { id, type } }, context) => {
      const failed = data?.success === false || !!error;
      if (failed) {
        context?.rollback();
        console.error(`Failed to move soup item ${id}`, data, error);
      }

      invalidateAfterMove([id], type === 'project', failed);
    },
  }));
}

export function createBulkCopySoupEntityMutation() {
  // Only support chat + document, same as single-copy version
  const isUnsupportedEntity = (entity: EntityData) => {
    const type = entity.type;
    return type !== 'chat' && type !== 'document';
  };

  return useMutation(() => ({
    mutationFn: async ({
      entities,
      name,
    }: {
      entities: (EntityData & { name: string })[];
      name: string | ((oldName: string) => string);
    }) => {
      if (entities.some(isUnsupportedEntity)) {
        throw new Error(`Unsupported entity type provided`);
      }

      const results = await Promise.all(
        entities.map((e) =>
          copyItem({
            itemType: e.type as 'document' | 'chat',
            id: e.id,
            name: typeof name === 'function' ? name(e.name) : name,
          })
        )
      );

      if (results.some((r) => !r)) {
        throw new Error(`One or more soup items failed to copy`);
      }

      return { success: true };
    },

    onMutate: async () => {
      // For copy, no optimistic update — new IDs unknown until server
      queryClient.cancelQueries({
        queryKey: soupKeys.items._def,
      });
    },

    onSettled: (data, error, { entities }) => {
      if (error) {
        console.error(`Failed bulk copy`, entities, data, error);
        toast.failure('Failed to copy items');
      }

      // Trigger refetch so new items appear
      queryClient.invalidateQueries({
        queryKey: soupKeys.items._def,
      });
      queryClient.invalidateQueries({ queryKey: ['entity'] });
    },
  }));
}

export function createBulkMoveToProjectSoupEntityMutation() {
  const isUnsupportedEntity = (entity: EntityData) => {
    const type = entity.type;
    return type !== 'chat' && type !== 'document' && type !== 'project';
  };

  return useMutation(() => ({
    mutationFn: async ({
      entities,
      project,
    }: {
      entities: (EntityData & { name: string })[];
      project: { id: string; name: string };
    }) => {
      if (entities.some(isUnsupportedEntity)) {
        throw new Error(`Unsupported entity type provided`);
      }

      const results = await Promise.all(
        entities.map((entity) =>
          moveToFolder({
            itemType: entity.type as 'document' | 'chat' | 'project',
            id: entity.id,
            folderId: project.id,
          })
        )
      );

      if (results.some((r) => !r)) {
        throw new Error(`One or more soup items failed to move`);
      }

      return { success: true };
    },

    onMutate: async ({
      entities,
      project,
    }: {
      entities: (EntityData & { name: string })[];
      project: { id: string; name: string };
    }) => {
      const moveableEntities = entities.filter(
        (e): e is typeof e & { type: 'document' | 'chat' } =>
          e.type === 'document' || e.type === 'chat'
      );
      return moveableEntities.map((e) => {
        const current = getSoupEntityById(e.id);
        return optimisticUpdateSoupEntity({
          tag: e.type,
          data: { id: e.id, projectId: project.id },
          frecency_score: current?.frecency_score ?? 0,
        });
      });
    },

    onSettled: (data, error, { entities }, context) => {
      const failed = data?.success === false || !!error;
      if (failed) {
        context?.forEach((txn) => txn.rollback());
        console.error(`Failed to bulk move soup items`, entities, data, error);
      }

      invalidateAfterMove(
        entities.map((e) => e.id),
        entities.some((e) => e.type === 'project'),
        failed
      );
    },
  }));
}

// ============================================================================
// Rename Mutations
// ============================================================================

type RenamableEntity = Pick<EntityData, 'id' | 'type' | 'name'> &
  Partial<EntityData>;

type EntityRenameOperation = {
  entity: RenamableEntity;
  newName: string;
};

type EntityRenameOperationResult = {
  success: boolean;
};

// Maps channel ID to its update context, which lets us rollback the updated at timestamp as well as name
type ChannelRenameContexts = Map<string, UpdateChannelNameContext | undefined>;

// Keyed by entity ID so rollback indices stay aligned even when flatMap filters out types
type SoupTransactionMap = Map<string, SoupTransaction>;

type RenameRollbackContext = {
  channels: ChannelRenameContexts;
  soupTransactions: SoupTransactionMap;
};

type EntityRenameData = {
  id: string;
  itemType: ItemType;
  oldName: string;
  newName: string;
};

type EntityRenameOptimisticInfo = Omit<EntityRenameData, 'oldName'>;

type RenameSoupEntityMutationVariables = EntityRenameOperation;

type BulkRenameSoupEntityMutationVariables =
  RenameSoupEntityMutationVariables[];

type RenameSoupEntityMutationData = EntityRenameOperationResult;

type BulkRenameSoupEntityMutationData = RenameSoupEntityMutationData[];

type RenameOnMutateResult = {
  contexts: RenameRollbackContext;
  updates: EntityRenameData[];
};

const getEntityRenameData = (
  operation: EntityRenameOperation
): EntityRenameData => {
  const { entity, newName } = operation;
  return {
    id: entity.id,
    itemType: entity.type,
    oldName: entity.name,
    newName,
  };
};

const performEntityRename = async (operation: EntityRenameOperation) => {
  const data = getEntityRenameData(operation);
  const success = await renameItem(data);
  return { success };
};

const validateEntityRename = (entity: EntityData): void => {
  switch (entity.type) {
    case 'channel':
      // NOTE: channel type is undefined if provided from the split modal due to casting in createEntityData
      if (entity.channelType === ChannelTypeEnum.DirectMessage) {
        throw new Error('Direct messages do not support renaming');
      }
      break;
    case 'document':
    case 'chat':
    case 'project':
      return;
    default:
      throw new Error(`Unsupported entity type: ${entity.type}`);
  }
};

const renameSoupSetData = (
  entities: EntityRenameOptimisticInfo[]
): SoupTransactionMap => {
  const txns: SoupTransactionMap = new Map();
  for (const { id, itemType, newName } of entities) {
    const current = getSoupEntityById(id);
    const score = current?.frecency_score ?? 0;
    if (itemType === 'channel') {
      txns.set(
        id,
        optimisticUpdateSoupEntity({
          tag: 'channel',
          data: { channel: { id, name: newName } },
          frecency_score: score,
        })
      );
    } else if (itemType !== 'email') {
      txns.set(
        id,
        optimisticUpdateSoupEntity({
          tag: itemType,
          data: { id, name: newName },
          frecency_score: score,
        })
      );
    }
  }
  return txns;
};

const renameChannelSetData = (
  entities: EntityRenameOptimisticInfo[]
): ChannelRenameContexts => {
  const contexts: ChannelRenameContexts = new Map();

  entities.forEach(({ id, itemType, newName }) => {
    if (itemType === 'channel') {
      const context = optimisticUpdateChannelName({
        channelId: id,
        name: newName,
      });
      if (context) {
        contexts.set(id, context);
      }
    }
  });

  return contexts;
};

const renamePreviewSetData = (entities: EntityRenameOptimisticInfo[]) => {
  entities.forEach(({ id, newName, itemType }) => {
    setPreviewName({
      itemId: id,
      name: newName,
      itemType,
    });
  });
};

const renameHistorySetData = (entities: EntityRenameOptimisticInfo[]) => {
  entities.forEach(({ id, newName }) => {
    setHistoryItemName(id, newName);
  });
};

function performOptimisticRenameUpdates(
  entities: EntityRenameOptimisticInfo[]
): RenameRollbackContext {
  renamePreviewSetData(entities);
  renameHistorySetData(entities);
  const soupTransactions = renameSoupSetData(entities);
  const channels = renameChannelSetData(entities);

  return { channels, soupTransactions };
}

function rollbackOptimisticRenameUpdates({
  contexts,
  updates,
}: RenameOnMutateResult): void {
  for (const [, txn] of contexts.soupTransactions) {
    txn.rollback();
  }

  updates.forEach(({ id, oldName, itemType }) => {
    renameHistorySetData([{ id, itemType, newName: oldName }]);
    renamePreviewSetData([{ id, itemType, newName: oldName }]);

    if (itemType === 'channel') {
      const context = contexts.channels.get(id);
      if (context) {
        rollbackUpdateChannelName(id, context);
      } else {
        console.error(`No rollback context provided for channel item ${id}`);
      }
    }
  });
}

const bulkRenameMutationFn = async (
  params: BulkRenameSoupEntityMutationVariables
): Promise<BulkRenameSoupEntityMutationData> => {
  const entities = params.map((p) => p.entity);
  entities.forEach(validateEntityRename);

  // TODO: add bulk rename on backend or consider batching in chunks
  // with timeouts to avoid too many requests
  return await Promise.all(params.map(performEntityRename));
};

const bulkRenameOnMutate = (
  params: BulkRenameSoupEntityMutationVariables
): RenameOnMutateResult => {
  const updates = params.map(getEntityRenameData);
  const contexts = performOptimisticRenameUpdates(updates);
  return { contexts, updates };
};

const bulkRenameOnSettled = (
  data: BulkRenameSoupEntityMutationData | undefined,
  error: Error | null,
  params: BulkRenameSoupEntityMutationVariables,
  onMutateResult: RenameOnMutateResult | undefined
): void => {
  const hasFailed = !!error || data?.some((d) => !d.success);
  if (!hasFailed) return;

  console.error(`Failed rename`, params, data, error);
  toast.failure('Failed to rename');

  if (!onMutateResult) {
    // most likely nothing to rollback, but it's possible there were mutations that succeeded before the OnMutate failed
    // TODO: refetch everything to be safe
    return;
  }

  // rollback everything if we can't identify specific failures
  if (!data) {
    rollbackOptimisticRenameUpdates(onMutateResult);
    return;
  }

  // Rollback only the failed items by entity ID
  const failedUpdates: EntityRenameData[] = [];
  const failedChannelContexts: ChannelRenameContexts = new Map();
  const failedSoupTransactions: SoupTransactionMap = new Map();

  data.forEach((result, index) => {
    if (!result.success) {
      const update = onMutateResult.updates[index];
      if (update) {
        failedUpdates.push(update);
        const txn = onMutateResult.contexts.soupTransactions.get(update.id);
        if (txn) failedSoupTransactions.set(update.id, txn);
        if (update.itemType === 'channel') {
          const context = onMutateResult.contexts.channels.get(update.id);
          if (context !== undefined) {
            failedChannelContexts.set(update.id, context);
          }
        }
      }
    }
  });

  // Rollback only the failed items
  if (failedUpdates.length > 0) {
    rollbackOptimisticRenameUpdates({
      contexts: {
        channels: failedChannelContexts,
        soupTransactions: failedSoupTransactions,
      },
      updates: failedUpdates,
    });
  }
};

/** supports channel/document/chat/project rename */
export function createRenameSoupEntityMutation(
  callbacks?: MutationCallbacks<
    RenameSoupEntityMutationData,
    Error,
    RenameSoupEntityMutationVariables,
    RenameOnMutateResult
  >
) {
  return useMutation<
    RenameSoupEntityMutationData,
    Error,
    RenameSoupEntityMutationVariables,
    RenameOnMutateResult
  >(() => ({
    mutationFn: async (params) => (await bulkRenameMutationFn([params]))[0],
    ...withCallbacks<
      RenameSoupEntityMutationData,
      Error,
      RenameSoupEntityMutationVariables,
      RenameOnMutateResult
    >(
      {
        onMutate: async (params) => bulkRenameOnMutate([params]),
        onSettled: (data, error, params, onMutateResult) => {
          bulkRenameOnSettled(
            data ? [data] : undefined,
            error,
            [params],
            onMutateResult
          );
        },
      },
      callbacks
    ),
  }));
}

/** supports channel/document/chat/project bulk rename */
export function createBulkRenameSoupEntityMutation() {
  return useMutation<
    BulkRenameSoupEntityMutationData,
    Error,
    BulkRenameSoupEntityMutationVariables,
    RenameOnMutateResult
  >(() => ({
    mutationFn: bulkRenameMutationFn,
    onMutate: bulkRenameOnMutate,
    onSettled: bulkRenameOnSettled,
  }));
}

const CHAT_RENAME_TIMEOUT_MS = 20000;

/**
 * Waits for a chat rename to complete and updates the query cache(s).
 * If noDispose is true, the effect will not be disposed after completion/timeout.
 * Returns a dispose function to cancel the wait.
 */
export function useWaitChatRename(chatId: string, noDispose?: boolean) {
  if (!noDispose) {
    setTimeout(() => {
      dispose();
    }, CHAT_RENAME_TIMEOUT_MS);
  }

  const dispose = createCognitionWebsocketEffect('chat_renamed', (data) => {
    if (data.chat_id !== chatId) return;
    performOptimisticRenameUpdates([
      { id: chatId, newName: data.name, itemType: 'chat' },
    ]);
    if (!noDispose) {
      dispose();
    }
  });

  return dispose;
}
