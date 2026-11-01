export function isChrome() {
  const runtime = globalThis.chrome?.runtime;
  if (!runtime || typeof runtime.getURL !== 'function') {
    return false;
  }
  return runtime.getURL('').startsWith('chrome-extension://');
}

export function isFirefox() {
  const runtime = globalThis.browser?.runtime;
  if (!runtime || typeof runtime.getURL !== 'function') {
    return false;
  }
  return runtime.getURL('').startsWith('moz-extension://');
}
