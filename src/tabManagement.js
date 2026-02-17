const ORG_URL_KEY = 'originalUrl';

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
    // When a pinned tab had no original URL set, we set it to the current URL
    const existing = await getPinnedURL(tab.id);
    if (!existing) {
      // If no original URL is set, we set it to the current URL
      await setPinnedURL(tab.id, tab.url);
      console.log(`Saved Home URL: ${tab.url}`);
      continue; // No need to discard if we just set the original URL
    }

    await browser.tabs.discard(tab.id);
    console.log(`Discarded tab ${tab.id} to reset it to Home URL`);

    if (existing && existing !== tab.url) {
      // If an original URL is set but doesn't match the current URL, we reset it
      await browser.tabs.update(tab.id, { url: existing });
      console.log(`Reset tab ${tab.id} to Home URL: ${existing}`);
    }
  }
}

/**
 * Resets a single pinned tab to its original URL if it has changed, otherwise do nothing.
 *
 * @param {*} tab
 * @returns
 */
export async function resetTab(tab) {
  if (typeof tab === 'number') {
    tab = await browser.tabs.get(tab);
    if (!tab) {
      console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
      return;
    }
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
}

/**
 * Changes the original URL of a pinned tab to the current URL, effectively 'repinning' it to the new address.
 *
 * @param {*} tab
 * @returns Promise<void>
 */
export async function repinTab(tab) {
  if (typeof tab === 'number') {
    tab = await browser.tabs.get(tab);
    if (!tab) {
      console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
      return;
    }
  }

  if (!tab?.pinned) {
    console.log(`Tab ${tab.id} is not pinned. No action taken.`);
    return;
  }

  await setPinnedURL(tab.id, tab.url);
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
  if (typeof tab === 'number') {
    tab = await browser.tabs.get(tab);
    if (!tab) {
      console.log(`Tab ${tab} is not pinned or does not exist. No action taken.`);
      return;
    }
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
  // Fallback for Chrome
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
    // Fallback for Chrome
    await browser.storage.session.set({ [`${ORG_URL_KEY}_${tabId}`]: url });
  }
  console.log(`Updated Home URL for tab ${tabId} to: ${url}`);
}
