/**
 * IndexedDB cache for GitHub entities.
 *
 * Schema:
 * - `github_entities` store: keyed by entity ID, stores entity data + metadata
 * - `github_meta` store: stores user ID and sync timestamps
 */

import type { GitHubCombinedEntity, GitHubEntityType } from '../queries/auth';

const DB_NAME = 'macro-github-cache';
const DB_VERSION = 1;
const ENTITIES_STORE = 'github_entities';
const META_STORE = 'github_meta';

/** TTL for cached entities: 24 hours in milliseconds */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** Max jitter to add to TTL: 2 hours in milliseconds */
const CACHE_JITTER_MS = 2 * 60 * 60 * 1000;

export interface CachedGitHubEntity extends GitHubCombinedEntity {
  /** When this entity was last refreshed from GitHub */
  lastRefreshed: number;
  /** Random jitter added to this entity's TTL */
  jitter: number;
}

interface CacheMeta {
  /** The user ID this cache belongs to */
  userId: string;
  /** When the full sync was last started */
  lastFullSyncStarted: number | null;
  /** When the full sync was last completed */
  lastFullSyncCompleted: number | null;
  /** Repos that have been fully fetched */
  fetchedRepos: string[];
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create entities store with indexes
      if (!db.objectStoreNames.contains(ENTITIES_STORE)) {
        const entitiesStore = db.createObjectStore(ENTITIES_STORE, {
          keyPath: 'id',
        });
        entitiesStore.createIndex('entityType', 'entityType', {
          unique: false,
        });
        entitiesStore.createIndex('repoFullName', 'repoFullName', {
          unique: false,
        });
        entitiesStore.createIndex('lastRefreshed', 'lastRefreshed', {
          unique: false,
        });
      }

      // Create meta store
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

async function withTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    fn(tx).then(resolve).catch(reject);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ Meta Operations ============

async function getMeta(): Promise<CacheMeta | null> {
  return withTransaction(META_STORE, 'readonly', async (tx) => {
    const store = tx.objectStore(META_STORE);
    const result = await requestToPromise(store.get('meta'));
    return result ?? null;
  });
}

async function setMeta(meta: Partial<CacheMeta>): Promise<void> {
  return withTransaction(META_STORE, 'readwrite', async (tx) => {
    const store = tx.objectStore(META_STORE);
    const existing = (await requestToPromise(store.get('meta'))) as
      | CacheMeta
      | undefined;
    const updated = {
      key: 'meta',
      userId: meta.userId ?? existing?.userId ?? '',
      lastFullSyncStarted:
        meta.lastFullSyncStarted ?? existing?.lastFullSyncStarted ?? null,
      lastFullSyncCompleted:
        meta.lastFullSyncCompleted ?? existing?.lastFullSyncCompleted ?? null,
      fetchedRepos: meta.fetchedRepos ?? existing?.fetchedRepos ?? [],
    };
    await requestToPromise(store.put(updated));
  });
}

// ============ Cache Validation ============

/**
 * Checks if the cache belongs to the current user.
 * If not, wipes the cache and returns false.
 */
export async function validateCacheForUser(userId: string): Promise<boolean> {
  const meta = await getMeta();

  if (meta && meta.userId && meta.userId !== userId) {
    // Different user - wipe the cache
    await clearCache();
    return false;
  }

  if (!meta || !meta.userId) {
    // No user set - initialize
    await setMeta({ userId });
  }

  return true;
}

/**
 * Clears all cached data.
 */
export async function clearCache(): Promise<void> {
  return withTransaction(
    [ENTITIES_STORE, META_STORE],
    'readwrite',
    async (tx) => {
      const entitiesStore = tx.objectStore(ENTITIES_STORE);
      const metaStore = tx.objectStore(META_STORE);
      await Promise.all([
        requestToPromise(entitiesStore.clear()),
        requestToPromise(metaStore.clear()),
      ]);
    }
  );
}

// ============ Entity Operations ============

/**
 * Gets all cached entities.
 */
export async function getAllCachedEntities(): Promise<CachedGitHubEntity[]> {
  return withTransaction(ENTITIES_STORE, 'readonly', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);
    return requestToPromise(store.getAll());
  });
}

/**
 * Gets cached entities by type.
 */
export async function getCachedEntitiesByType(
  entityType: GitHubEntityType
): Promise<CachedGitHubEntity[]> {
  return withTransaction(ENTITIES_STORE, 'readonly', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);
    const index = store.index('entityType');
    return requestToPromise(index.getAll(entityType));
  });
}

/**
 * Gets cached entities for a specific repo.
 */
export async function getCachedEntitiesForRepo(
  repoFullName: string
): Promise<CachedGitHubEntity[]> {
  return withTransaction(ENTITIES_STORE, 'readonly', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);
    const index = store.index('repoFullName');
    return requestToPromise(index.getAll(repoFullName));
  });
}

/**
 * Gets a single cached entity by ID.
 */
export async function getCachedEntity(
  id: string
): Promise<CachedGitHubEntity | null> {
  return withTransaction(ENTITIES_STORE, 'readonly', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);
    const result = await requestToPromise(store.get(id));
    return result ?? null;
  });
}

/**
 * Stores entities in the cache.
 * Adds lastRefreshed timestamp and random jitter.
 */
export async function cacheEntities(
  entities: GitHubCombinedEntity[]
): Promise<void> {
  if (entities.length === 0) return;

  const now = Date.now();

  return withTransaction(ENTITIES_STORE, 'readwrite', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);

    const promises = entities.map((entity) => {
      const cached: CachedGitHubEntity = {
        ...entity,
        lastRefreshed: now,
        jitter: Math.random() * CACHE_JITTER_MS,
      };
      return requestToPromise(store.put(cached));
    });

    await Promise.all(promises);
  });
}

/**
 * Updates a single entity in the cache.
 */
export async function updateCachedEntity(
  entity: GitHubCombinedEntity
): Promise<void> {
  return cacheEntities([entity]);
}

/**
 * Removes an entity from the cache.
 */
export async function removeCachedEntity(id: string): Promise<void> {
  return withTransaction(ENTITIES_STORE, 'readwrite', async (tx) => {
    const store = tx.objectStore(ENTITIES_STORE);
    await requestToPromise(store.delete(id));
  });
}

// ============ Staleness Checking ============

/**
 * Checks if an entity is stale (needs refresh).
 */
export function isEntityStale(entity: CachedGitHubEntity): boolean {
  const now = Date.now();
  const ttl = CACHE_TTL_MS + entity.jitter;
  return now - entity.lastRefreshed > ttl;
}

/**
 * Gets all stale entities that need refresh.
 */
export async function getStaleEntities(): Promise<CachedGitHubEntity[]> {
  const all = await getAllCachedEntities();
  return all.filter(isEntityStale);
}

/**
 * Gets stale entities grouped by repo (for efficient batch refresh).
 */
export async function getStaleEntitiesByRepo(): Promise<
  Map<string, CachedGitHubEntity[]>
> {
  const stale = await getStaleEntities();
  const byRepo = new Map<string, CachedGitHubEntity[]>();

  for (const entity of stale) {
    const existing = byRepo.get(entity.repoFullName) ?? [];
    existing.push(entity);
    byRepo.set(entity.repoFullName, existing);
  }

  return byRepo;
}

// ============ Sync State ============

/**
 * Marks that a full sync has started.
 */
export async function markSyncStarted(): Promise<void> {
  await setMeta({ lastFullSyncStarted: Date.now() });
}

/**
 * Marks that a full sync has completed.
 */
export async function markSyncCompleted(): Promise<void> {
  await setMeta({ lastFullSyncCompleted: Date.now() });
}

/**
 * Marks a repo as fully fetched.
 */
export async function markRepoFetched(repoFullName: string): Promise<void> {
  const meta = await getMeta();
  const fetchedRepos = meta?.fetchedRepos ?? [];
  if (!fetchedRepos.includes(repoFullName)) {
    await setMeta({ fetchedRepos: [...fetchedRepos, repoFullName] });
  }
}

/**
 * Gets the list of repos that have been fully fetched.
 */
export async function getFetchedRepos(): Promise<string[]> {
  const meta = await getMeta();
  return meta?.fetchedRepos ?? [];
}

/**
 * Checks if we need to do a full sync (never done or too old).
 */
export async function needsFullSync(): Promise<boolean> {
  const meta = await getMeta();
  if (!meta?.lastFullSyncCompleted) return true;

  // Consider full sync stale after 24 hours
  const now = Date.now();
  return now - meta.lastFullSyncCompleted > CACHE_TTL_MS;
}

/**
 * Gets cache statistics.
 */
export async function getCacheStats(): Promise<{
  totalEntities: number;
  byType: Record<string, number>;
  staleCount: number;
  lastSyncCompleted: number | null;
}> {
  const all = await getAllCachedEntities();
  const stale = all.filter(isEntityStale);
  const meta = await getMeta();

  const byType: Record<string, number> = {};
  for (const entity of all) {
    byType[entity.entityType] = (byType[entity.entityType] ?? 0) + 1;
  }

  return {
    totalEntities: all.length,
    byType,
    staleCount: stale.length,
    lastSyncCompleted: meta?.lastFullSyncCompleted ?? null,
  };
}
