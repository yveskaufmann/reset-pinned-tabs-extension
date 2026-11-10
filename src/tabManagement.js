const ORG_URL_KEY = 'originalUrl';
const TAB_UUID_KEY = 'tabUuid';
const SHOULD_UNLOAD_RESETTABS_KEY = 'shouldUnloadResetTabs';
const SYNC_ENABLED_KEY = 'syncEnabled';
const SYNC_DEVICE_ID_KEY = 'syncDeviceId';
const SYNC_ACTION_SEQ_KEY = 'syncActionSeq';
const MANAGED_TABS_KEY = 'managedTabs';
const LOCALLY_DELETED_TABS_KEY = 'locallyDeletedTabs';
const TOMBSTONE_TTL_MS = 24 * 60 * 60 * 1000;
const SYNC_SCHEMA_VERSION = 1;

function now() {
  return Date.now();
}

function createUuid() {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(16).slice(2)}-${now().toString(16)}`;
}

export function compareSyncRecords(left, right) {
  const leftUpdatedAt = left?.updatedAt || 0;
  const rightUpdatedAt = right?.updatedAt || 0;
  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt - rightUpdatedAt;
  }

  const leftDeviceId = left?.deviceId || '';
  const rightDeviceId = right?.deviceId || '';
  if (leftDeviceId !== rightDeviceId) {
    return leftDeviceId.localeCompare(rightDeviceId);
  }

  const leftSeq = left?.actionSeq || 0;
  const rightSeq = right?.actionSeq || 0;
  return leftSeq - rightSeq;
}

async function getStorageLocal(...keys) {
  return browser.storage.local.get(keys);
}

async function setStorageLocal(patch) {
  await browser.storage.local.set(patch);
}

async function removeStorageLocal(keys) {
  await browser.storage.local.remove(keys);
}

async function getManagedTabsMap() {
  const result = await getStorageLocal(MANAGED_TABS_KEY);
  return result[MANAGED_TABS_KEY] || {};
}

async function setManagedTabsMap(managedTabs) {
  await setStorageLocal({ [MANAGED_TABS_KEY]: managedTabs });
}

async function getLocallyDeletedMap() {
  const result = await getStorageLocal(LOCALLY_DELETED_TABS_KEY);
  return result[LOCALLY_DELETED_TABS_KEY] || {};
}

async function setLocallyDeletedMap(locallyDeletedTabs) {
  await setStorageLocal({ [LOCALLY_DELETED_TABS_KEY]: locallyDeletedTabs });
}

async function getSyncDeviceId() {
  const result = await getStorageLocal(SYNC_DEVICE_ID_KEY);
  const existing = result[SYNC_DEVICE_ID_KEY];
  if (existing) {
    return existing;
  }

  const generated = createUuid();
  await setStorageLocal({ [SYNC_DEVICE_ID_KEY]: generated });
  return generated;
}

async function nextSyncActionSeq() {
  const result = await getStorageLocal(SYNC_ACTION_SEQ_KEY);
  const current = result[SYNC_ACTION_SEQ_KEY] || 0;
  const next = current + 1;
  await setStorageLocal({ [SYNC_ACTION_SEQ_KEY]: next });
  return next;
}

async function queryAllTabs() {
  return browser.tabs.query({});
}

async function resolveTab(tabOrId) {
  if (typeof tabOrId === 'number') {
    return browser.tabs.get(tabOrId);
  }
  return tabOrId;
}

async function removeManagedRecord(tabUuid) {
  const managedTabs = await getManagedTabsMap();
  if (!managedTabs[tabUuid]) {
    return;
  }
  delete managedTabs[tabUuid];
  await setManagedTabsMap(managedTabs);
}

async function upsertManagedRecord(record) {
  const managedTabs = await getManagedTabsMap();
  managedTabs[record.tabUuid] = record;
  await setManagedTabsMap(managedTabs);
}

async function removeLocallyDeletedEntry(tabUuid) {
  const locallyDeleted = await getLocallyDeletedMap();
  if (!locallyDeleted[tabUuid]) {
    return;
  }
  delete locallyDeleted[tabUuid];
  await setLocallyDeletedMap(locallyDeleted);
}

async function addLocallyDeletedEntry(tabUuid) {
  const locallyDeleted = await getLocallyDeletedMap();
  locallyDeleted[tabUuid] = now();
  await setLocallyDeletedMap(locallyDeleted);
}

async function getManagedRecordByTabId(tabId) {
  const managedTabs = await getManagedTabsMap();
  for (const tabUuid of Object.keys(managedTabs)) {
    if (managedTabs[tabUuid]?.tabId === tabId) {
      return managedTabs[tabUuid];
    }
  }
  return null;
}

async function findLocalTabByUuid(tabUuid) {
  const allTabs = await queryAllTabs();
  for (const tab of allTabs) {
    if (!tab?.id) {
      continue;
    }
    const localUuid = await getTabUuid(tab.id);
    if (localUuid === tabUuid) {
      return tab;
    }
  }
  return null;
}

async function findExactUrlCandidates(url) {
  if (!url) {
    return [];
  }

  const allTabs = await queryAllTabs();
  return allTabs.filter((tab) => tab.url === url);
}

async function clearTabManagedState(tabId) {
  await removePinnedURL(tabId);
  await removeTabUuid(tabId);
}

async function buildLocalManagedRecord(tab, tabUuid, homeUrlOverride) {
  const homeUrl = homeUrlOverride ?? (await getPinnedURL(tab.id)) ?? tab.url;
  return {
    tabId: tab.id,
    tabUuid,
    homeUrl,
    pinned: !!tab.pinned,
    managed: true,
    lastUpdated: now(),
  };
}

async function writeManagedRecordToSync(record) {
  if (!(await getSyncEnabled())) {
    return null;
  }

  const actionSeq = await nextSyncActionSeq();
  const deviceId = await getSyncDeviceId();
  const updatedAt = now();
  const syncRecord = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    tabUuid: record.tabUuid,
    homeUrl: record.homeUrl,
    pinned: !!record.pinned,
    status: 'managed',
    updatedAt,
    deviceId,
    actionSeq,
    urlHint: record.homeUrl,
  };
  await browser.storage.sync.set({ [record.tabUuid]: syncRecord });
  return syncRecord;
}

async function writeDeleteTombstoneToSync(tabUuid, homeUrl = '') {
  if (!(await getSyncEnabled())) {
    return;
  }

  const actionSeq = await nextSyncActionSeq();
  const deviceId = await getSyncDeviceId();
  const timestamp = now();
  const tombstone = {
    schemaVersion: SYNC_SCHEMA_VERSION,
    tabUuid,
    homeUrl,
    pinned: false,
    status: 'deleted',
    updatedAt: timestamp,
    deletedAt: timestamp,
    expiresAt: timestamp + TOMBSTONE_TTL_MS,
    deviceId,
    actionSeq,
    urlHint: homeUrl,
  };
  await browser.storage.sync.set({ [tabUuid]: tombstone });
}

async function pruneExpiredRemoteTombstones() {
  if (!(await getSyncEnabled())) {
    return;
  }

  const syncRecords = await browser.storage.sync.get(null);
  const toRemove = [];
  const timestamp = now();
  for (const [key, record] of Object.entries(syncRecords)) {
    if (
      record?.schemaVersion === SYNC_SCHEMA_VERSION &&
      record?.status === 'deleted' &&
      typeof record?.expiresAt === 'number' &&
      record.expiresAt <= timestamp
    ) {
      toRemove.push(key);
    }
  }

  if (toRemove.length > 0) {
    await browser.storage.sync.remove(toRemove);
  }
}

async function applyRemoteManagedRecord(syncRecord) {
  const localManagedTabs = await getManagedTabsMap();
  const localRecord = localManagedTabs[syncRecord.tabUuid];

  if (localRecord) {
    const cmp = compareSyncRecords(
      {
        updatedAt: localRecord.lastUpdated,
        deviceId: localRecord.deviceId,
        actionSeq: localRecord.actionSeq,
      },
      syncRecord,
    );
    if (cmp > 0) {
      console.info(`Skipping remote managed record ${syncRecord.tabUuid}; local state is newer.`);
      return;
    }
  }

  let targetTab = await findLocalTabByUuid(syncRecord.tabUuid);
  if (!targetTab) {
    const candidates = await findExactUrlCandidates(syncRecord.homeUrl || syncRecord.urlHint);
    const uniqueCandidate = candidates.length === 1 ? candidates[0] : null;
    if (uniqueCandidate) {
      targetTab = uniqueCandidate;
    }
  }

  if (!targetTab) {
    const locallyDeleted = await getLocallyDeletedMap();
    if (locallyDeleted[syncRecord.tabUuid]) {
      console.info(`Skipping remote-only creation for ${syncRecord.tabUuid}; tab was removed locally before.`);
      return;
    }

    if (!syncRecord.homeUrl) {
      console.info(`Skipping remote-only creation for ${syncRecord.tabUuid}; missing homeUrl.`);
      return;
    }

    const createdTab = await browser.tabs.create({
      url: syncRecord.homeUrl,
      pinned: !!syncRecord.pinned,
      active: false,
    });
    await setPinnedURL(createdTab.id, syncRecord.homeUrl);
    await setTabUuid(createdTab.id, syncRecord.tabUuid);
    await removeLocallyDeletedEntry(syncRecord.tabUuid);
    await upsertManagedRecord({
      tabId: createdTab.id,
      tabUuid: syncRecord.tabUuid,
      homeUrl: syncRecord.homeUrl,
      pinned: !!syncRecord.pinned,
      managed: true,
      lastUpdated: syncRecord.updatedAt || now(),
      deviceId: syncRecord.deviceId,
      actionSeq: syncRecord.actionSeq,
    });
    return;
  }

  if (syncRecord.pinned && !targetTab.pinned) {
    await browser.tabs.update(targetTab.id, { pinned: true });
  }

  if (syncRecord.homeUrl && targetTab.url !== syncRecord.homeUrl) {
    await browser.tabs.update(targetTab.id, { url: syncRecord.homeUrl });
  }

  if (syncRecord.homeUrl) {
    await setPinnedURL(targetTab.id, syncRecord.homeUrl);
  }
  await setTabUuid(targetTab.id, syncRecord.tabUuid);
  await removeLocallyDeletedEntry(syncRecord.tabUuid);
  await upsertManagedRecord({
    tabId: targetTab.id,
    tabUuid: syncRecord.tabUuid,
    homeUrl: syncRecord.homeUrl || syncRecord.urlHint || targetTab.url,
    pinned: !!syncRecord.pinned,
    managed: true,
    lastUpdated: syncRecord.updatedAt || now(),
    deviceId: syncRecord.deviceId,
    actionSeq: syncRecord.actionSeq,
  });
}

async function applyRemoteDeleteRecord(syncRecord) {
  const tab = await findLocalTabByUuid(syncRecord.tabUuid);
  if (!tab) {
    console.info(`No confident local match for remote delete ${syncRecord.tabUuid}; keeping remote tombstone.`);
    return;
  }

  await clearTabManagedState(tab.id);
  await removeManagedRecord(syncRecord.tabUuid);
  await addLocallyDeletedEntry(syncRecord.tabUuid);
}

async function applySyncRecord(syncRecord) {
  if (!syncRecord || syncRecord.schemaVersion !== SYNC_SCHEMA_VERSION || !syncRecord.tabUuid) {
    return;
  }

  if (syncRecord.status === 'deleted') {
    await applyRemoteDeleteRecord(syncRecord);
    return;
  }

  if (syncRecord.status !== 'managed') {
    return;
  }

  await applyRemoteManagedRecord(syncRecord);
}

async function resolveOrCreateTabUuid(tab) {
  const existing = await getTabUuid(tab.id);
  if (existing) {
    return existing;
  }

  const generated = createUuid();
  await setTabUuid(tab.id, generated);
  return generated;
}

export async function getShouldUnloadResetTabs() {
  const result = await getStorageLocal(SHOULD_UNLOAD_RESETTABS_KEY);
  return !!result[SHOULD_UNLOAD_RESETTABS_KEY];
}

export async function setShouldUnloadResetTabs(value) {
  await setStorageLocal({
    [SHOULD_UNLOAD_RESETTABS_KEY]: !!value,
  });
}

export async function getSyncEnabled() {
  const result = await getStorageLocal(SYNC_ENABLED_KEY);
  return !!result[SYNC_ENABLED_KEY];
}

export async function setSyncEnabled(value) {
  const enabled = !!value;
  await setStorageLocal({ [SYNC_ENABLED_KEY]: enabled });
  if (enabled) {
    await bootstrapSyncFromLocalState();
    await reconcileSyncedState();
    await pruneExpiredRemoteTombstones();
  }
}

export async function bootstrapSyncFromLocalState() {
  if (!(await getSyncEnabled())) {
    return;
  }

  const pinnedTabs = await browser.tabs.query({ pinned: true });
  for (const tab of pinnedTabs) {
    const homeUrl = await getPinnedURL(tab.id);
    if (!homeUrl) {
      continue;
    }

    const tabUuid = await resolveOrCreateTabUuid(tab);
    const record = await buildLocalManagedRecord(tab, tabUuid, homeUrl);
    await upsertManagedRecord(record);
    const syncRecord = await writeManagedRecordToSync(record);
    if (syncRecord) {
      await upsertManagedRecord({
        ...record,
        lastUpdated: syncRecord.updatedAt,
        deviceId: syncRecord.deviceId,
        actionSeq: syncRecord.actionSeq,
      });
    }
  }
}

export async function reconcileSyncedState() {
  if (!(await getSyncEnabled())) {
    return;
  }

  await pruneExpiredRemoteTombstones();
  const syncRecords = await browser.storage.sync.get(null);
  for (const record of Object.values(syncRecords)) {
    await applySyncRecord(record);
  }
}

export async function handleSyncStorageChanged(changes, areaName) {
  if (areaName !== 'sync') {
    return;
  }

  if (!(await getSyncEnabled())) {
    return;
  }

  for (const change of Object.values(changes)) {
    const incoming = change?.newValue;
    if (!incoming) {
      continue;
    }
    await applySyncRecord(incoming);
  }
}

export async function handleManagedTabPinned(tab, { writeSync = true } = {}) {
  const resolvedTab = await resolveTab(tab);
  if (!resolvedTab?.id) {
    return;
  }

  const homeUrl = await getPinnedURL(resolvedTab.id);
  const tabUuid = await resolveOrCreateTabUuid(resolvedTab);
  const record = await buildLocalManagedRecord(resolvedTab, tabUuid, homeUrl || resolvedTab.url);
  await upsertManagedRecord(record);
  await removeLocallyDeletedEntry(tabUuid);
  if (writeSync) {
    const syncRecord = await writeManagedRecordToSync(record);
    if (syncRecord) {
      await upsertManagedRecord({
        ...record,
        lastUpdated: syncRecord.updatedAt,
        deviceId: syncRecord.deviceId,
        actionSeq: syncRecord.actionSeq,
      });
    }
  }
}

export async function handleManagedTabUnpinned(tab) {
  const resolvedTab = await resolveTab(tab);
  if (!resolvedTab?.id) {
    return;
  }

  const tabUuid = await getTabUuid(resolvedTab.id);
  const homeUrl = await getPinnedURL(resolvedTab.id);
  if (!tabUuid) {
    await removePinnedURL(resolvedTab.id);
    return;
  }

  await clearTabManagedState(resolvedTab.id);
  await removeManagedRecord(tabUuid);
  await addLocallyDeletedEntry(tabUuid);
  await writeDeleteTombstoneToSync(tabUuid, homeUrl || resolvedTab.url || '');
}

export async function handleManagedTabRemoved(tabId) {
  const managedRecord = await getManagedRecordByTabId(tabId);
  if (!managedRecord?.tabUuid) {
    return;
  }

  await removeManagedRecord(managedRecord.tabUuid);
  await addLocallyDeletedEntry(managedRecord.tabUuid);
  await writeDeleteTombstoneToSync(managedRecord.tabUuid, managedRecord.homeUrl || '');
}

/**
 * Sync the state of all pinned tabs on startup or installation.
 *
 * - tracks original URLs for pinned tabs for newly pinned tabs
 * - resets pinned tabs to their original URLs if they have changed
 * - discards pinned tabs to free up resources
 */
export async function syncPinnedTabsState() {
  const pinnedTabs = await browser.tabs.query({ pinned: true });
  for (const tab of pinnedTabs) {
    const existing = await getPinnedURL(tab.id);
    if (!existing) {
      await setPinnedURL(tab.id, tab.url);
      await handleManagedTabPinned(tab, { writeSync: false });
      console.log(`Saved Home URL: ${tab.url}`);
      continue;
    }

    await browser.tabs.discard(tab.id);
    console.log(`Discarded tab ${tab.id} to reset it to Home URL`);

    if (existing && existing !== tab.url) {
      await browser.tabs.update(tab.id, { url: existing });
      console.log(`Reset tab ${tab.id} to Home URL: ${existing}`);
    }

    await handleManagedTabPinned(tab, { writeSync: false });
  }
}

/**
 * Resets a single pinned tab to its original URL if it has changed, otherwise do nothing.
 *
 * @param {*} tab
 * @returns
 */
export async function resetTab(tab) {
  tab = await resolveTab(tab);
  if (!tab) {
    console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
    return;
  }

  if (!tab?.pinned) {
    console.log(`Tab ${tab.id} is not pinned. No action taken.`);
    return;
  }

  const url = await getPinnedURL(tab.id);
  if (url && tab.url !== url) {
    await browser.tabs.update(tab.id, { url });
    console.log(`Reset tab ${tab.id} to Home URL: ${url}`);
  }

  const shouldUnloadResettedTabs = await getShouldUnloadResetTabs();
  if (shouldUnloadResettedTabs) {
    await browser.tabs.discard(tab.id);
    console.log(`Discarded tab ${tab.id} after resetting it to Home URL`);
  }
}

/**
 * Changes the original URL of a pinned tab to the current URL, effectively 'repinning' it to the new address.
 *
 * @param {*} tab
 * @returns Promise<void>
 */
export async function repinTab(tab) {
  tab = await resolveTab(tab);
  if (!tab) {
    console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
    return;
  }

  if (!tab?.pinned) {
    console.log(`Tab ${tab.id} is not pinned. No action taken.`);
    return;
  }

  await setPinnedURL(tab.id, tab.url);
  await handleManagedTabPinned(tab);
  console.log(`Repinned tab ${tab.id} to new Home URL: ${tab.url}`);
}

/**
 * Resets all pinned tabs to their original URLs if they have changed.
 */
export async function resetAllPinnedTabs() {
  const pinnedTabs = await browser.tabs.query({ pinned: true });
  try {
    await Promise.all(pinnedTabs.map(resetTab));
    console.log('All pinned tabs have been reset to their Home URLs.');
  } catch (error) {
    console.error('Error resetting pinned tabs:', error);
  }
}

/**
 * Toggle the pinned state of a tab.
 * @param {*} tab
 * @param {*} pinned
 * @returns
 */
export async function toggleTabPin(tab, pinned) {
  tab = await resolveTab(tab);
  if (!tab) {
    console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
    return;
  }

  if (tab.pinned === pinned) {
    return;
  }

  await browser.tabs.update(tab.id, { pinned });
  console.log(`${pinned ? 'Pinned' : 'Unpinned'} tab ${tab.id}`);
}

export async function getPinnedTabs() {
  const pinnedTabs = await browser.tabs.query({ pinned: true });
  const tabs = pinnedTabs.map((tab) => ({
    id: tab.id,
    url: tab.url,
    pinnedURL: tab.pinnedURL,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
  }));

  for (const tab of tabs) {
    const pinnedURL = await getPinnedURL(tab.id);
    tab.pinnedURL = pinnedURL || '';
  }

  return tabs;
}

/**
 * Get the pinned url of pinned tab by its id.
 *
 * @param {*} tabId
 *
 * @returns Promise<string> The pinned URL of the tab, or null if not set.
 */
export async function getPinnedURL(tabId) {
  if (typeof browser?.sessions?.getTabValue === 'function') {
    return browser.sessions.getTabValue(tabId, ORG_URL_KEY);
  }

  const result = await browser.storage.session.get(`${ORG_URL_KEY}_${tabId}`);
  return result ? result[`${ORG_URL_KEY}_${tabId}`] : null;
}

/**
 * Set the pinned url of pinned tab by its id.
 *
 * @param {*} tabId
 * @param {*} url
 * @return Promise<void>
 */
export async function setPinnedURL(tabId, url) {
  if (typeof browser?.sessions?.setTabValue === 'function') {
    await browser.sessions.setTabValue(tabId, ORG_URL_KEY, url);
  } else {
    await browser.storage.session.set({ [`${ORG_URL_KEY}_${tabId}`]: url });
  }
  console.log(`Updated Home URL for tab ${tabId} to: ${url}`);
}

export async function removePinnedURL(tabId) {
  if (typeof browser?.sessions?.removeTabValue === 'function') {
    await browser.sessions.removeTabValue(tabId, ORG_URL_KEY);
    return;
  }
  await browser.storage.session.remove(`${ORG_URL_KEY}_${tabId}`);
}

export async function getTabUuid(tabId) {
  if (typeof browser?.sessions?.getTabValue === 'function') {
    return browser.sessions.getTabValue(tabId, TAB_UUID_KEY);
  }
  const result = await browser.storage.session.get(`${TAB_UUID_KEY}_${tabId}`);
  return result ? result[`${TAB_UUID_KEY}_${tabId}`] : null;
}

export async function setTabUuid(tabId, tabUuid) {
  if (typeof browser?.sessions?.setTabValue === 'function') {
    await browser.sessions.setTabValue(tabId, TAB_UUID_KEY, tabUuid);
    return;
  }
  await browser.storage.session.set({ [`${TAB_UUID_KEY}_${tabId}`]: tabUuid });
}

export async function removeTabUuid(tabId) {
  if (typeof browser?.sessions?.removeTabValue === 'function') {
    await browser.sessions.removeTabValue(tabId, TAB_UUID_KEY);
    return;
  }
  await browser.storage.session.remove(`${TAB_UUID_KEY}_${tabId}`);
}

export async function resetSyncState() {
  await removeStorageLocal([
    SYNC_ENABLED_KEY,
    SYNC_DEVICE_ID_KEY,
    SYNC_ACTION_SEQ_KEY,
    MANAGED_TABS_KEY,
    LOCALLY_DELETED_TABS_KEY,
  ]);
}
