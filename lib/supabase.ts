import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isRestrictedWebContext = (): boolean => {
  if (Platform.OS !== 'web') return false;
  try {
    if (typeof window === 'undefined') return true;
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return false;
  } catch {
    return true;
  }
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
    
    supabaseInstance = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: !isRestricted,
        persistSession: !isRestricted,
        detectSessionInUrl: false,
        storage: supabaseStorage,
        flowType: 'implicit',
        lock: isWebPlatform ? noOpLock : undefined,
        storageKey: 'supabase-auth-token',
      },
      global: {
        headers: {
          'X-Client-Info': `expo-${Platform.OS}`,
        },
      },
      realtime: isRestricted ? {
        params: {
          eventsPerSecond: 0,
        },
      } : {
        params: {
          eventsPerSecond: 2,
        },
      },
    });
    
    console.log('[Supabase] Client initialized', {
      platform: Platform.OS,
      restrictedContext: isRestricted,
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
