import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function validateSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.includes('supabase');
  } catch {
    return false;
  }
}

if (!isSupabaseConfigured) {
  console.warn('[Supabase] ⚠️ URL or Anon Key is missing. Check your environment variables.');
} else if (!validateSupabaseUrl(supabaseUrl)) {
  console.warn('[Supabase] ⚠️ URL format appears invalid. Expected https://*.supabase.co');
}

function isLocalStorageSafe(): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }
  
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }
    
    const testKey = '__supabase_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    const result = window.localStorage.getItem(testKey);
    window.localStorage.removeItem(testKey);
    return result === testKey;
  } catch {
    return false;
  }
}

class SupabaseStorage {
  private memoryStorage: Map<string, string> = new Map();
  private localStorageSafe: boolean | null = null;

  private checkLocalStorage(): boolean {
    if (this.localStorageSafe !== null) {
      return this.localStorageSafe;
    }
    try {
      this.localStorageSafe = isLocalStorageSafe();
    } catch {
      this.localStorageSafe = false;
    }
    return this.localStorageSafe;
  }

  private getStorage(): Storage | null {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        return window.localStorage;
      }
    } catch {
      // localStorage access threw - not available
    }
    return null;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        return await AsyncStorage.getItem(key);
      }
      
      if (this.checkLocalStorage()) {
        try {
          const storage = this.getStorage();
          if (storage) {
            return storage.getItem(key);
          }
        } catch {
          return this.memoryStorage.get(key) || null;
        }
      }
      
      return this.memoryStorage.get(key) || null;
    } catch {
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryStorage.set(key, value);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(key, value);
        return;
      }
      
      if (this.checkLocalStorage()) {
        try {
          const storage = this.getStorage();
          if (storage) {
            storage.setItem(key, value);
          }
        } catch {
          // Memory storage already set
        }
      }
    } catch {
      // Memory storage already set
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStorage.delete(key);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.removeItem(key);
        return;
      }
      
      if (this.checkLocalStorage()) {
        try {
          const storage = this.getStorage();
          if (storage) {
            storage.removeItem(key);
          }
        } catch {
          // Already removed from memory
        }
      }
    } catch {
      // Already removed from memory
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
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: Platform.OS !== 'web',
        persistSession: Platform.OS !== 'web',
        detectSessionInUrl: false,
        storage: supabaseStorage,
      },
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
