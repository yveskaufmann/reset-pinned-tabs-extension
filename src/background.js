import './pollyfill.js';

import {
  repinTab,
  resetAllPinnedTabs,
  resetTab,
  syncPinnedTabsState,
  toggleTabPin,
  getPinnedURL,
  setPinnedURL,
} from './tabManagement.js';
import { isFirefox } from './browser-detection.js';

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
    const existing = await getPinnedURL(tabId);
    if (existing) {
      console.log(`Tab ${tabId} is already pinned with Home URL: ${existing}`);
      return;
    }
    await setPinnedURL(tabId, tab.url);
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
    const originalUrl = await getPinnedURL(tab.id);
    await browser.menus.update('pin-tab', { checked: tab.pinned });
    await browser.menus.update('reset-this-tab', {
      enabled: tab.pinned && !!originalUrl && tab.url !== originalUrl,
    });
    await browser.menus.update('repin-tab', {
      visible: tab.pinned,
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
    case 'repin-tab':
      await repinTab(tab);
      break;
  }
}

/**
 * Create the context menu for the pinned tab extensions.
 */
function createContextMenu() {
  if (!isFirefox()) {
    // Chrome does not support contextMenus API, so we skip creating the menu and rely on the browser action instead.
    return;
  }

  browser.contextMenus.create({
    id: 'reset-this-tab',
    title: 'Restore to Pinned URL',
    contexts: ['tab'],
  });

  browser.contextMenus.create({
    id: 'repin-tab',
    title: 'Update Pinned URL to Current',
    contexts: ['tab'],
  });

  browser.contextMenus.create({
    id: 'separator',
    type: 'separator',
    contexts: ['tab'],
  });

  browser.contextMenus.create({
    id: 'reset-all-pinned',
    title: 'Restore All Pinned Tabs',
    contexts: ['tab'],
  });

  browser.contextMenus.create({
    id: 'pin-tab',
    title: 'Pinned',
    contexts: ['tab'],
    type: 'checkbox',
  });
}

/**
 * Handle the extension installation event
 */
async function onInstalled() {
  createContextMenu();
  await syncPinnedTabsState();
}

/**
 * Handle the browser startup event to ensure pinned tabs are in sync with their original URLs.
 */
async function onStartup() {
  await syncPinnedTabsState();
}

browser.runtime.onInstalled.addListener(onInstalled);
browser.runtime.onStartup.addListener(onStartup);
browser.tabs.onUpdated.addListener(onTabUpdate);
browser.contextMenus.onClicked.addListener(onMenuClicked);
browser.contextMenus?.onShown?.addListener(onMenuShown);
