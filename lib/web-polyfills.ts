import { Platform } from 'react-native';

// Apply polyfills for restricted web contexts (iframes, preview environments)
// This must run synchronously before any other imports
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Suppress specific console errors for known issues FIRST
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  const shouldSuppress = (message: unknown): boolean => {
    if (typeof message !== 'string') return false;
    return (
      message.includes('BroadcastChannel') ||
      message.includes('operation is insecure') ||
      message.includes('LockManager') ||
      message.includes('SecurityError') ||
      message.includes('The operation is insecure') ||
      message.includes('multi-tab state changes')
    );
  };

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args[0])) return;
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args[0])) return;
    originalConsoleWarn.apply(console, args);
  };

  // Mock BroadcastChannel IMMEDIATELY - don't check if it exists
  const MockBroadcastChannel = class {
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

  try {
    Object.defineProperty(window, 'BroadcastChannel', {
      value: MockBroadcastChannel,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (window as any).BroadcastChannel = MockBroadcastChannel;
    } catch {
      // Unable to set
    }
  }

  // Mock LockManager IMMEDIATELY
  const mockLocks = {
    request: async <T>(_name: string, callbackOrOptions: unknown, maybeCallback?: unknown): Promise<T> => {
      const callback = typeof callbackOrOptions === 'function' 
        ? callbackOrOptions 
        : maybeCallback;
      if (typeof callback === 'function') {
        return callback();
      }
      return undefined as T;
    },
    query: async () => ({ held: [], pending: [] }),
  };

  try {
    Object.defineProperty(navigator, 'locks', {
      value: mockLocks,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      (navigator as any).locks = mockLocks;
    } catch {
      // Unable to set
    }
  }

  // Create memory storage fallback
  const memoryStorage = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => { memoryStorage.set(key, value); },
    removeItem: (key: string) => { memoryStorage.delete(key); },
    clear: () => { memoryStorage.clear(); },
    get length() { return memoryStorage.size; },
    key: (index: number) => Array.from(memoryStorage.keys())[index] ?? null,
  };

  // Check if localStorage is available WITHOUT triggering security error
  let useMemoryStorage = true;
  try {
    if (typeof window.localStorage !== 'undefined') {
      // Try a quick test
      const testKey = '__ws_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      useMemoryStorage = false;
    }
  } catch {
    useMemoryStorage = true;
  }

  if (useMemoryStorage) {
    try {
      Object.defineProperty(window, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    } catch {
      // Can't override localStorage
    }

    try {
      Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });
    } catch {
      // Can't override sessionStorage
    }
  }
}

export {};
