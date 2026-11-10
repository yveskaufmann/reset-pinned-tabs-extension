import { getPinnedURL, resolveTab, setPinnedURL } from './tabMetadata.js';
import { handleManagedTabPinned } from './tabSyncManagement.js';

const SHOULD_UNLOAD_RESETTABS_KEY = 'shouldUnloadResetTabs';

export async function getShouldUnloadResetTabs() {
  const result = await browser.storage.local.get(SHOULD_UNLOAD_RESETTABS_KEY);
  return !!result[SHOULD_UNLOAD_RESETTABS_KEY];
}

export async function setShouldUnloadResetTabs(value) {
  await browser.storage.local.set({
    [SHOULD_UNLOAD_RESETTABS_KEY]: !!value,
  });
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

export { getPinnedURL, setPinnedURL } from './tabMetadata.js';
