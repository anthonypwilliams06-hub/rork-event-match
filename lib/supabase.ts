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

let localStorageChecked = false;
let localStorageAvailable = false;

function isLocalStorageSafe(): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }
  
  if (localStorageChecked) {
    return localStorageAvailable;
  }
  
  localStorageChecked = true;
  localStorageAvailable = false;
  
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    // Some environments throw just by accessing localStorage property
    let storage: Storage | undefined;
    try {
      storage = window.localStorage;
    } catch {
      console.log('[Supabase] localStorage access blocked');
      return false;
    }
    
    if (!storage) {
      return false;
    }
    
    // Test actual read/write to catch "operation is insecure" errors
    const testKey = '__supabase_storage_test__';
    storage.setItem(testKey, testKey);
    const result = storage.getItem(testKey);
    storage.removeItem(testKey);
    localStorageAvailable = result === testKey;
    return localStorageAvailable;
  } catch {
    console.log('[Supabase] localStorage not available, using memory storage');
    return false;
  }
}

class SupabaseStorage {
  private memoryStorage: Map<string, string> = new Map();
  private localStorageSafe: boolean | null = null;
  private storageChecked = false;

  private checkLocalStorage(): boolean {
    if (this.storageChecked) {
      return this.localStorageSafe === true;
    }
    
    this.storageChecked = true;
    this.localStorageSafe = false;
    
    try {
      this.localStorageSafe = isLocalStorageSafe();
    } catch {
      this.localStorageSafe = false;
    }
    
    return this.localStorageSafe === true;
  }

  private getStorage(): Storage | null {
    if (Platform.OS !== 'web') {
      return null;
    }
    
    // Don't even try if we know it's not safe
    if (this.storageChecked && !this.localStorageSafe) {
      return null;
    }
    
    try {
      if (typeof window !== 'undefined') {
        // Double try-catch because accessing localStorage can throw
        try {
          const storage = window.localStorage;
          if (storage) {
            return storage;
          }
        } catch {
          this.localStorageSafe = false;
          this.storageChecked = true;
        }
      }
    } catch {
      this.localStorageSafe = false;
      this.storageChecked = true;
    }
    return null;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        const value = await AsyncStorage.getItem(key);
        return value;
      }
      
      // For web, try localStorage only if it's safe
      if (this.checkLocalStorage()) {
        const storage = this.getStorage();
        if (storage) {
          try {
            return storage.getItem(key);
          } catch {
            // Fall through to memory storage
          }
        }
      }
      
      return this.memoryStorage.get(key) || null;
    } catch (error) {
      console.warn('[Supabase] getItem error:', error);
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    // Always store in memory as backup
    this.memoryStorage.set(key, value);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.setItem(key, value);
        return;
      }
      
      // For web, try localStorage only if it's safe
      if (this.checkLocalStorage()) {
        const storage = this.getStorage();
        if (storage) {
          try {
            storage.setItem(key, value);
          } catch {
            // Memory storage already set
          }
        }
      }
    } catch (error) {
      console.warn('[Supabase] setItem error:', error);
      // Memory storage already set as backup
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStorage.delete(key);
    
    try {
      if (Platform.OS !== 'web') {
        await AsyncStorage.removeItem(key);
        return;
      }
      
      // For web, try localStorage only if it's safe
      if (this.checkLocalStorage()) {
        const storage = this.getStorage();
        if (storage) {
          try {
            storage.removeItem(key);
          } catch {
            // Already removed from memory
          }
        }
      }
    } catch (error) {
      console.warn('[Supabase] removeItem error:', error);
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
    const isWeb = Platform.OS === 'web';
    
    // For web, always start with session persistence disabled to avoid errors
    // The storage adapter will use memory fallback anyway
    let canUseLocalStorage = false;
    
    if (!isWeb) {
      // Native platforms can always use AsyncStorage
      canUseLocalStorage = true;
    } else {
      // For web, safely check localStorage availability
      try {
        canUseLocalStorage = isLocalStorageSafe();
      } catch {
        canUseLocalStorage = false;
      }
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: canUseLocalStorage,
        persistSession: canUseLocalStorage,
        detectSessionInUrl: false,
        storage: supabaseStorage,
      },
    });
    
    console.log('[Supabase] Client initialized', {
      platform: Platform.OS,
      persistSession: canUseLocalStorage,
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
