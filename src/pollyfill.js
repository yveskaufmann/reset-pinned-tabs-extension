// Polyfill for cross-browser compatibility, since Firefox uses the `browser` namespace while Chrome uses `chrome`.
if (typeof browser === 'undefined') {
  globalThis.browser = chrome;
}
