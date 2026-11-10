const ORG_URL_KEY = 'originalUrl';
const TAB_UUID_KEY = 'tabUuid';

export async function resolveTab(tabOrId) {
  if (typeof tabOrId === 'number') {
    return browser.tabs.get(tabOrId);
  }
  return tabOrId;
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
