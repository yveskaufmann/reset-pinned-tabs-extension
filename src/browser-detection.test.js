import { afterEach, describe, expect, it } from 'vitest';

import { isChrome, isFirefox } from './browser-detection.js';

function resetBrowserGlobals() {
  Reflect.deleteProperty(globalThis, 'chrome');
  Reflect.deleteProperty(globalThis, 'browser');
}

afterEach(() => {
  resetBrowserGlobals();
});

describe('browser detection', () => {
  it('detects Chrome from runtime URL', () => {
    globalThis.chrome = {
      runtime: {
        getURL: () => 'chrome-extension://abc123/',
      },
    };

    expect(isChrome()).toBe(true);
  });

  it('detects Firefox from runtime URL', () => {
    globalThis.browser = {
      runtime: {
        getURL: () => 'moz-extension://abc123/',
      },
    };

    expect(isFirefox()).toBe(true);
  });

  it('returns false when browser globals are missing', () => {
    expect(isChrome()).toBe(false);
    expect(isFirefox()).toBe(false);
  });

  it('returns false for non-matching runtime URL scheme', () => {
    globalThis.chrome = {
      runtime: {
        getURL: () => 'moz-extension://abc123/',
      },
    };
    globalThis.browser = {
      runtime: {
        getURL: () => 'chrome-extension://abc123/',
      },
    };

    expect(isChrome()).toBe(false);
    expect(isFirefox()).toBe(false);
  });
});
