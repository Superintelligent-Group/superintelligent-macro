/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot, createSignal } from 'solid-js';

vi.mock('@core/constant/allBlocks', () => ({
  itemToSafeName: (item: { name?: string }) => item.name ?? 'Untitled',
}));

// Mock service clients to prevent side effects (websocket connections, etc.)
vi.mock('@service-storage/client', () => ({
  storageServiceClient: {
    getUsersHistory: vi.fn(),
    upsertItemToUserHistory: vi.fn(),
    removeItemFromUserHistory: vi.fn(),
    trackOpenedDocument: vi.fn(),
    trackOpenedChat: vi.fn(),
    projects: {
      getContent: vi.fn(),
    },
  },
  blockNameToItemType: vi.fn(),
}));

vi.mock('@service-cognition/client', () => ({
  cognitionApiServiceClient: {},
}));

vi.mock('@service-cognition/websocket', () => ({
  createCognitionWebsocketEffect: vi.fn(),
}));

vi.mock('@queries/storage/instructions-md', () => ({
  useInstructionsMdIdQuery: () => ({
    isSuccess: false,
    data: null,
  }),
}));

// Mock the queryClient to avoid importing the real one which has side effects
const mockGetQueryData = vi.fn();
vi.mock('../../client', () => ({
  queryClient: {
    getQueryData: (...args: unknown[]) => mockGetQueryData(...args),
    invalidateQueries: vi.fn(),
    cancelQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

import type { Item } from '@service-storage/generated/schemas/item';
import { transformHistoryResponse, updateItemViewedAt } from '../transforms';
import {
  getHistoryItem,
  getHistoryItems,
  useUpdatedDssItemName,
  markHistoryDirty,
} from '../history';
import { historyKeys } from '../keys';

function createItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    name: 'Test Item',
    type: 'document',
    userId: 'user-1',
    createdAt: Date.now() / 1000,
    updatedAt: Date.now() / 1000,
    ...overrides,
  } as Item;
}

describe('history transforms', () => {
  it('transforms response and filters instructions.md', () => {
    const data = {
      data: [
        createItem({ id: 'doc-1', name: 'My Doc' }),
        createItem({ id: 'instructions-md', name: 'Instructions' }),
        createItem({ id: 'doc-2', name: 'Other Doc' }),
      ],
    };

    const result = transformHistoryResponse(data, 'instructions-md');

    expect(result.map((i) => i.id)).toEqual(['doc-1', 'doc-2']);
    expect(result[0].name).toBe('My Doc');
  });

  it('updateItemViewedAt sets timestamp for optimistic updates', () => {
    const items = [createItem({ id: 'doc-1' }), createItem({ id: 'doc-2' })];

    const result = updateItemViewedAt(items, 'doc-1', 1704067200000);

    expect(result[0]).toHaveProperty('viewedAt', 1704067200000);
    expect(items[0]).not.toHaveProperty('viewedAt'); // doesn't mutate
  });
});

describe('useUpdatedDssItemName', () => {
  beforeEach(() => {
    mockGetQueryData.mockReset();
  });

  it('returns item name from cache when available', () => {
    const mockHistoryData = {
      data: [
        createItem({ id: 'doc-123', name: 'My Document' }),
        createItem({ id: 'doc-456', name: 'Other Document' }),
      ],
    };

    mockGetQueryData.mockReturnValue(mockHistoryData);

    let result: string | undefined;
    createRoot((dispose) => {
      const name = useUpdatedDssItemName('doc-123');
      result = name();
      dispose();
    });

    expect(result).toBe('My Document');
    expect(mockGetQueryData).toHaveBeenCalledWith(historyKeys.list.queryKey);
  });

  it('returns undefined when item is not in cache', () => {
    mockGetQueryData.mockReturnValue({ data: [] });

    let result: string | undefined;
    createRoot((dispose) => {
      const name = useUpdatedDssItemName('nonexistent');
      result = name();
      dispose();
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when itemId is empty', () => {
    mockGetQueryData.mockReturnValue({
      data: [createItem({ id: 'doc-123', name: 'My Document' })],
    });

    let result: string | undefined;
    createRoot((dispose) => {
      const name = useUpdatedDssItemName('');
      result = name();
      dispose();
    });

    expect(result).toBeUndefined();
  });

  it('works with accessor itemId', () => {
    const mockHistoryData = {
      data: [createItem({ id: 'doc-123', name: 'My Document' })],
    };

    mockGetQueryData.mockReturnValue(mockHistoryData);

    let result: string | undefined;
    createRoot((dispose) => {
      const name = useUpdatedDssItemName(() => 'doc-123');
      result = name();
      dispose();
    });

    expect(result).toBe('My Document');
  });

  it('updates when document name changes in cache and markHistoryDirty is called', () => {
    // Start with initial name
    const initialData = {
      data: [createItem({ id: 'doc-123', name: 'Original Name' })],
    };
    mockGetQueryData.mockReturnValue(initialData);

    const results: (string | undefined)[] = [];

    createRoot((dispose) => {
      const name = useUpdatedDssItemName('doc-123');

      // Capture initial value
      results.push(name());

      // Simulate cache update with new name
      const updatedData = {
        data: [createItem({ id: 'doc-123', name: 'Updated Name' })],
      };
      mockGetQueryData.mockReturnValue(updatedData);

      // Trigger the dirty signal to cause memo re-evaluation
      markHistoryDirty();

      // Now the memo should pick up the updated cache value
      results.push(name());

      dispose();
    });

    expect(results[0]).toBe('Original Name');
    // The second read should pick up the updated cache value after markHistoryDirty
    expect(results[1]).toBe('Updated Name');
  });

  it('updates when switching to a different document via accessor', () => {
    const mockHistoryData = {
      data: [
        createItem({ id: 'doc-1', name: 'First Document' }),
        createItem({ id: 'doc-2', name: 'Second Document' }),
      ],
    };
    mockGetQueryData.mockReturnValue(mockHistoryData);

    const results: (string | undefined)[] = [];

    createRoot((dispose) => {
      const [docId, setDocId] = createSignal('doc-1');
      const name = useUpdatedDssItemName(docId);

      // Initial value for doc-1
      results.push(name());

      // Switch to doc-2
      setDocId('doc-2');
      results.push(name());

      dispose();
    });

    expect(results[0]).toBe('First Document');
    expect(results[1]).toBe('Second Document');
  });
});

describe('getHistoryItems', () => {
  beforeEach(() => {
    mockGetQueryData.mockReset();
  });

  it('returns transformed history items from cache', () => {
    const mockHistoryData = {
      data: [
        createItem({ id: 'doc-1', name: 'Doc 1' }),
        createItem({ id: 'doc-2', name: 'Doc 2' }),
      ],
    };

    mockGetQueryData.mockReturnValue(mockHistoryData);

    const items = getHistoryItems();

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Doc 1');
    expect(items[1].name).toBe('Doc 2');
  });

  it('returns empty array when cache is empty', () => {
    mockGetQueryData.mockReturnValue(undefined);

    const items = getHistoryItems();

    expect(items).toEqual([]);
  });
});

describe('getHistoryItem', () => {
  beforeEach(() => {
    mockGetQueryData.mockReset();
  });

  it('returns single transformed item from cache', () => {
    const mockHistoryData = {
      data: [
        createItem({ id: 'doc-1', name: 'Doc 1' }),
        createItem({ id: 'doc-2', name: 'Doc 2' }),
      ],
    };

    mockGetQueryData.mockReturnValue(mockHistoryData);

    const item = getHistoryItem('doc-2');

    expect(item?.name).toBe('Doc 2');
    expect(item?.id).toBe('doc-2');
  });

  it('returns undefined when item not found', () => {
    const mockHistoryData = {
      data: [createItem({ id: 'doc-1', name: 'Doc 1' })],
    };

    mockGetQueryData.mockReturnValue(mockHistoryData);

    const item = getHistoryItem('nonexistent');

    expect(item).toBeUndefined();
  });

  it('returns undefined when cache is empty', () => {
    mockGetQueryData.mockReturnValue(undefined);

    const item = getHistoryItem('doc-1');

    expect(item).toBeUndefined();
  });
});
