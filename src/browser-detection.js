export function isChrome() {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined') {
    return false;
  }
  return chrome.runtime.getURL('').startsWith('chrome-extension://');
}

export function isFirefox() {
  if (typeof browser !== 'undefined' && typeof browser.runtime !== 'undefined') {
    return false;
  }
  return browser.runtime.getURL('').startsWith('moz-extension://');
}
