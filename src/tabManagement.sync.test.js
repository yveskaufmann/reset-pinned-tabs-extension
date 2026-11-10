import { afterEach, describe, expect, it } from 'vitest';

import { compareSyncRecords, getSyncEnabled, setSyncEnabled } from './tabManagement.js';

const localStore = new Map();

function createStorageArea(store) {
  return {
    async get(keys) {
      if (keys === null) {
        return Object.fromEntries(store.entries());
      }

      const keyList = Array.isArray(keys) ? keys : [keys];
      const result = {};
      for (const key of keyList) {
        result[key] = store.get(key);
      }
      return result;
    },
    async set(patch) {
      for (const [key, value] of Object.entries(patch)) {
        store.set(key, value);
      }
    },
    async remove(keys) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const key of keyList) {
        store.delete(key);
      }
    },
  };
}

function resetBrowserGlobal() {
  Reflect.deleteProperty(globalThis, 'browser');
}

afterEach(() => {
  localStore.clear();
  resetBrowserGlobal();
});

describe('sync metadata ordering', () => {
  it('prefers the record with newer updatedAt', () => {
    const older = { updatedAt: 1, deviceId: 'a', actionSeq: 10 };
    const newer = { updatedAt: 2, deviceId: 'a', actionSeq: 1 };

    expect(compareSyncRecords(older, newer)).toBeLessThan(0);
    expect(compareSyncRecords(newer, older)).toBeGreaterThan(0);
  });

  it('uses lexicographically larger deviceId as tie-breaker', () => {
    const left = { updatedAt: 10, deviceId: 'device-a', actionSeq: 2 };
    const right = { updatedAt: 10, deviceId: 'device-z', actionSeq: 1 };

    expect(compareSyncRecords(left, right)).toBeLessThan(0);
    expect(compareSyncRecords(right, left)).toBeGreaterThan(0);
  });

  it('uses actionSeq as final tie-breaker', () => {
    const left = { updatedAt: 10, deviceId: 'device-a', actionSeq: 1 };
    const right = { updatedAt: 10, deviceId: 'device-a', actionSeq: 3 };

    expect(compareSyncRecords(left, right)).toBeLessThan(0);
    expect(compareSyncRecords(right, left)).toBeGreaterThan(0);
  });
});

describe('sync enablement setting', () => {
  it('persists syncEnabled=false without requiring tab APIs', async () => {
    globalThis.browser = {
      storage: {
        local: createStorageArea(localStore),
      },
    };

    await setSyncEnabled(false);
    await expect(getSyncEnabled()).resolves.toBe(false);
  });
});
