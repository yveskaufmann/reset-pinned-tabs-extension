const ORG_URL_KEY = 'originalUrl';

// Polyfill for cross-browser compatibility, since Firefox uses the `browser` namespace while Chrome uses `chrome`.
if (typeof browser === 'undefined') {
  globalThis.browser = chrome;
}

/**
 * Handle the tab updates to intercept when a user pins or unpins a tab.
 * Requires the "sessions" permission to store the original URL in the session data of the tab.
 *
 * @param {string} tabId
 * @param {*} changeInfo
 * @param {*} tab
 * @returns
 */
async function onTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.pinned === true) {
    const existing = await browser.sessions.getTabValue(tabId, ORG_URL_KEY);
    if (existing) {
      console.log(`Tab ${tabId} is already pinned with Home URL: ${existing}`);
      return;
    }

    // We store the current URL as the "source of truth"
    await browser.sessions.setTabValue(tabId, ORG_URL_KEY, tab.url);
    console.log(`Locked home URL for tab ${tabId}: ${tab.url}`);
  }
}

/**
 * Populate the context menu state based on the current tab's pinned status and stored original URL,
 * will be triggered when the context menu is shown.
 *
 * @param {*} info
 * @param {*} tab
 * @returns
 */
async function onMenuShown(info, tab) {
  if (!tab) {
    browser.menus.refresh();
    return;
  }

  try {
    const originalUrl = await browser.sessions.getTabValue(tab.id, ORG_URL_KEY);
    await browser.menus.update('pin-tab', { checked: tab.pinned });
    await browser.menus.update('reset-this-tab', {
      enabled: tab.pinned && !!originalUrl && tab.url !== originalUrl,
    });
  } catch (err) {
    console.error('Error updating menu state:', err);
  } finally {
    browser.menus.refresh();
  }
}

/**
 * Handle context menu clicks for pinning/unpinning tabs and resetting them by orchestrating the appropriate actions.
 *
 * @param {*} info
 * @param {*} tab
 */
async function onMenuClicked(info, tab) {
  switch (info.menuItemId) {
    case 'pin-tab':
      await toggleTabPin(tab, info.checked);
      break;
    case 'reset-this-tab':
      await resetTab(tab);
      break;
    case 'reset-all-pinned':
      await resetAllPinnedTabs();
      break;
    case 'repin-tab-to-current-url':
      await repinTab(tab);
      break;
  }
}

/**
 * Create the context menu for the pinned tab extensions.
 */
function createContextMenu() {
  browser.menus.create({
    id: 'reset-this-tab',
    title: 'Reset This Tab',
    contexts: ['tab'],
  });

  browser.menus.create({
    id: 'repin-tab-to-current-url',
    title: 'Repin Tab to Current URL',
    contexts: ['tab'],
  });

  browser.menus.create({
    id: 'reset-all-pinned',
    title: 'Reset All Pinned Tabs',
    contexts: ['tab'],
  });

  browser.menus.create({
    id: 'pin-tab',
    title: 'Pin Tab',
    contexts: ['tab'],
    type: 'checkbox',
  });
}

/**
 * Handle the extension installation event
 */
async function onInstalled() {
  createContextMenu();
  syncPinnedTabsState();
}

/**
 * Handle the browser startup event to ensure pinned tabs are in sync with their original URLs.
 */
async function onStartup() {
  syncPinnedTabsState();
}

/**
 * Sync the state of all pinned tabs on startup or installation.
 *
 * - tracks original URLs for pinned tabs for newly pinned tabs
 * - resets pinned tabs to their original URLs if they have changed
 * - discards pinned tabs to free up resources
 */
async function syncPinnedTabsState() {
  const pinnedTabs = await browser.tabs.query({ pinned: true });
  for (const tab of pinnedTabs) {
    // When a pinned tab had no original URL set, we set it to the current URL
    const existing = await browser.sessions.getTabValue(tab.id, ORG_URL_KEY);
    if (!existing) {
      // If no original URL is set, we set it to the current URL
      await browser.sessions.setTabValue(tab.id, ORG_URL_KEY, tab.url);
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
async function resetTab(tab) {
  if (!tab?.pinned) {
    console.log(`Tab ${tabId} is not pinned. No action taken.`);
    return;
  }

  const url = await browser.sessions.getTabValue(tab.id, ORG_URL_KEY);
  if (url && tab.url !== url) {
    await browser.tabs.update(tab.id, { url, loadReplace: true });
    console.log(`Reset tab ${tab.id} to Home URL: ${url}`);
  }
}

/**
 * Changes the original URL of a pinned tab to the current URL, effectively 'repinning' it to the new address.
 *
 * @param {*} tab
 * @returns Promise<void>
 */
async function repinTab(tab) {
  if (!tab?.pinned) {
    console.log(`Tab ${tabId} is not pinned. No action taken.`);
    return;
  }

  await browser.sessions.setTabValue(tab.id, ORG_URL_KEY, tab.url);
  console.log(`Repinned tab ${tab.id} to new Home URL: ${tab.url}`);
}

/**
 * Resets all pinned tabs to their original URLs if they have changed.
 */
async function resetAllPinnedTabs() {
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
async function toggleTabPin(tab, pinned) {
  if (tab.pinned === pinned) {
    return;
  }

  await browser.tabs.update(tab.id, { pinned });
  console.log(`${pinned ? 'Pinned' : 'Unpinned'} tab ${tab.id}`);
}

browser.runtime.onInstalled.addListener(onInstalled);
browser.runtime.onStartup.addListener(onStartup);
browser.tabs.onUpdated.addListener(onTabUpdate);
browser.menus.onShown.addListener(onMenuShown);
browser.menus.onClicked.addListener(onMenuClicked);
