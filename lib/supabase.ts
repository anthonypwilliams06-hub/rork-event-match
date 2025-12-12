import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
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
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
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
