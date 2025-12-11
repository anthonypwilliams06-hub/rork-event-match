import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

function isLocalStorageAvailable(): boolean {
  if (Platform.OS !== 'web') {
    return false;
  }
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

class SupabaseStorage {
  private memoryStorage: Map<string, string> = new Map();
  private useLocalStorage: boolean;

  constructor() {
    this.useLocalStorage = isLocalStorageAvailable();
    console.log('[Supabase Storage] Using localStorage:', this.useLocalStorage);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.useLocalStorage) {
        return window.localStorage.getItem(key);
      }
      
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      }
      
      return this.memoryStorage.get(key) || null;
    } catch (error) {
      console.warn(`[Supabase Storage] Error getting ${key}:`, error);
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    this.memoryStorage.set(key, value);
    
    try {
      if (this.useLocalStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`[Supabase Storage] Error setting ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    this.memoryStorage.delete(key);
    
    try {
      if (this.useLocalStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      
      if (Platform.OS !== 'web') {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`[Supabase Storage] Error removing ${key}:`, error);
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
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storage: supabaseStorage,
      },
    });
  }
  
  return supabaseInstance;
}

export const supabase = isSupabaseConfigured 
  ? getSupabaseClient() 
  : (null as unknown as SupabaseClient);

export { isSupabaseConfigured };
