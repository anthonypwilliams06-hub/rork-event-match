import { Platform } from 'react-native';

// Apply polyfills for restricted web contexts (iframes, preview environments)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Suppress specific console errors for known issues
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      if (
        message.includes('BroadcastChannel') ||
        message.includes('operation is insecure') ||
        message.includes('LockManager') ||
        message.includes('SecurityError')
      ) {
        return; // Suppress these known errors
      }
    }
    originalConsoleError.apply(console, args);
  };

  // Mock BroadcastChannel
  try {
    (window as any).BroadcastChannel = class MockBroadcastChannel {
      name: string;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onmessageerror: ((event: MessageEvent) => void) | null = null;
      constructor(name: string) { this.name = name; }
      postMessage(_message: unknown): void {}
      close(): void {}
      addEventListener(_type: string, _listener: unknown): void {}
      removeEventListener(_type: string, _listener: unknown): void {}
      dispatchEvent(_event: Event): boolean { return true; }
    };
  } catch {
    // Ignore if can't set
  }

  // Mock LockManager
  try {
    (navigator as any).locks = {
      request: async <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
        return callback();
      },
      query: async () => ({ held: [], pending: [] }),
    };
  } catch {
    // Ignore if can't set
  }

  // Wrap localStorage to prevent errors
  try {
    const memoryStorage = new Map<string, string>();
    let localStorageAvailable = false;
    
    try {
      const testKey = '__polyfill_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      localStorageAvailable = true;
    } catch {
      localStorageAvailable = false;
    }

    if (!localStorageAvailable) {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => memoryStorage.get(key) ?? null,
          setItem: (key: string, value: string) => memoryStorage.set(key, value),
          removeItem: (key: string) => memoryStorage.delete(key),
          clear: () => memoryStorage.clear(),
          get length() { return memoryStorage.size; },
          key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
        },
        writable: true,
        configurable: true,
      });
    }
  } catch {
    // Ignore if can't set
  }

  console.log('[WebPolyfills] Applied for restricted context');
}

export {};
