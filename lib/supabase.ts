// Apply polyfills IMMEDIATELY before any imports
const applyWebPolyfills = () => {
  if (typeof window === 'undefined') return;
  
  try {
    // Always override BroadcastChannel to prevent "operation is insecure" errors
    (window as any).BroadcastChannel = class MockBroadcastChannel {
      name: string;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onmessageerror: ((event: MessageEvent) => void) | null = null;
      constructor(name: string) { this.name = name; }
      postMessage(): void {}
      close(): void {}
      addEventListener(): void {}
      removeEventListener(): void {}
      dispatchEvent(): boolean { return true; }
    };

    // Mock LockManager
    if (typeof navigator !== 'undefined') {
      (navigator as any).locks = {
        request: async <T>(_name: string, callback: () => Promise<T>): Promise<T> => {
          return callback();
        },
        query: async () => ({ held: [], pending: [] }),
      };
    }

    // Mock crypto.randomUUID if needed
    if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
      (crypto as any).randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
    }
  } catch (e) {
    console.warn('[Supabase] Error applying polyfills:', e);
  }
};

applyWebPolyfills();

// eslint-disable-next-line import/first
import { Platform } from 'react-native';
// eslint-disable-next-line import/first
import AsyncStorage from '@react-native-async-storage/async-storage';
// eslint-disable-next-line import/first
import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
// eslint-disable-next-line import/first
import Constants from 'expo-constants';

const isRestrictedWebContext = (): boolean => {
  if (Platform.OS !== 'web') return false;
  
  // Always treat web as restricted to avoid security errors
  return true;
};

function getSupabaseUrl(): string {
  try {
    return process.env.EXPO_PUBLIC_SUPABASE_URL || 
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
  } catch {
    return '';
  }
}

function getSupabaseAnonKey(): string {
  try {
    return process.env.EXPO_PUBLIC_SUPABASE_KEY || 
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ||
      Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  } catch {
    return '';
  }
}

function checkIsSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key);
}

const isSupabaseConfigured = checkIsSupabaseConfigured();

class SupabaseStorage {
  private memoryStorage: Map<string, string> = new Map();
  private storageAvailable: boolean | null = null;
  private useMemoryOnly: boolean = false;

  constructor() {
    this.useMemoryOnly = isRestrictedWebContext();
    if (this.useMemoryOnly) {
      console.log('[Supabase] Using memory-only storage due to restricted context');
    }
  }

  private checkStorageAvailable(): boolean {
    if (this.useMemoryOnly) {
      return false;
    }

    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }

    if (Platform.OS !== 'web') {
      this.storageAvailable = true;
      return true;
    }

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        this.storageAvailable = false;
        return false;
      }
      const testKey = '__supabase_storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch {
      this.storageAvailable = false;
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        return await AsyncStorage.getItem(key);
      }
      
      if (this.checkStorageAvailable()) {
        const value = window.localStorage.getItem(key);
        return value;
      }
      
      return this.memoryStorage.get(key) || null;
    } catch (error) {
      console.warn('[Supabase] getItem error:', error);
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryStorage.set(key, value);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(key, value);
      } else if (this.checkStorageAvailable()) {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('[Supabase] setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStorage.delete(key);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.removeItem(key);
      } else if (this.checkStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('[Supabase] removeItem error:', error);
    }
  }
}

const supabaseStorage = new SupabaseStorage();

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  }
  
  if (!supabaseInstance) {
    const isWebPlatform = Platform.OS === 'web';
    const isRestricted = isRestrictedWebContext();
    
    const noOpLock = async <R>(
      _name: string,
      _acquireTimeout: number,
      fn: () => Promise<R>
    ): Promise<R> => {
      return fn();
    };
    
    const clientOptions = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        storage: supabaseStorage,
        flowType: 'implicit' as const,
        lock: noOpLock,
        storageKey: 'sb-auth',
        debug: false,
      },
      global: {
        headers: {
          'X-Client-Info': `expo-${Platform.OS}`,
        },
      },
    };

    // Completely disable realtime on web
    if (isWebPlatform) {
      (clientOptions as any).realtime = false;
    }

    supabaseInstance = createClient(getSupabaseUrl(), getSupabaseAnonKey(), clientOptions);
    
    // Force disconnect realtime on web to prevent BroadcastChannel usage
    if (isWebPlatform && supabaseInstance) {
      try {
        supabaseInstance.realtime?.disconnect();
        (supabaseInstance as any).realtime = null;
      } catch {
        // Ignore errors
      }
    }
    
    console.log('[Supabase] Client initialized', {
      platform: Platform.OS,
      restrictedContext: isRestricted,
      realtimeDisabled: isWebPlatform,
    });
  }
  
  return supabaseInstance;
}

function initSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  
  try {
    return getSupabaseClient();
  } catch (error) {
    console.error('[Supabase] Failed to initialize:', error);
    return null;
  }
}

export const supabase = initSupabase() as SupabaseClient;

export { isSupabaseConfigured };

export class SupabaseError extends Error {
  code: string;
  details: string | null;
  hint: string | null;

  constructor(error: PostgrestError | Error | string) {
    if (typeof error === 'string') {
      super(error);
      this.code = 'UNKNOWN';
      this.details = null;
      this.hint = null;
    } else if ('code' in error) {
      const pgError = error as PostgrestError;
      super(pgError.message);
      this.code = pgError.code;
      this.details = pgError.details;
      this.hint = pgError.hint;
    } else {
      super(error.message);
      this.code = 'UNKNOWN';
      this.details = null;
      this.hint = null;
    }
    this.name = 'SupabaseError';
  }

  get isNetworkError(): boolean {
    return this.message.includes('network') || 
           this.message.includes('fetch') ||
           this.code === 'PGRST301';
  }

  get isAuthError(): boolean {
    return this.code?.startsWith('AUTH') || 
           this.code === 'PGRST301' ||
           this.message.includes('JWT');
  }

  get isNotFound(): boolean {
    return this.code === 'PGRST116' || this.code === '404';
  }

  get userMessage(): string {
    if (this.isNetworkError) return 'Connection error. Please check your internet.';
    if (this.isAuthError) return 'Session expired. Please sign in again.';
    if (this.isNotFound) return 'The requested item was not found.';
    return this.message || 'An unexpected error occurred.';
  }
}

export async function safeSupabaseCall<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: { retries?: number; retryDelay?: number }
): Promise<{ data: T | null; error: SupabaseError | null }> {
  const { retries = 2, retryDelay = 1000 } = options || {};
  let lastError: SupabaseError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (!isSupabaseConfigured || !supabase) {
        return { data: null, error: new SupabaseError('Supabase is not configured') };
      }

      const { data, error } = await operation();

      if (error) {
        lastError = new SupabaseError(error);
        
        if (!lastError.isNetworkError || attempt === retries) {
          console.error(`[Supabase] Operation failed:`, {
            code: lastError.code,
            message: lastError.message,
            details: lastError.details,
          });
          return { data: null, error: lastError };
        }
        
        console.warn(`[Supabase] Retry ${attempt + 1}/${retries} after network error`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      return { data, error: null };
    } catch (err) {
      lastError = new SupabaseError(err instanceof Error ? err : String(err));
      
      if (attempt === retries) {
        console.error(`[Supabase] Unexpected error:`, err);
        return { data: null, error: lastError };
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  return { data: null, error: lastError };
}

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function refreshSession(): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('[Supabase] Session refresh failed:', error.message);
      return false;
    }
    return !!data.session;
  } catch (err) {
    console.error('[Supabase] Session refresh error:', err);
    return false;
  }
}
