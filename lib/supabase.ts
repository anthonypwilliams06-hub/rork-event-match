import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.');
}

class SupabaseStorage {
  private memoryStorage: Map<string, string> = new Map();
  private storageAvailable: boolean | null = null;

  private async checkStorageAvailable(): Promise<boolean> {
    if (this.storageAvailable !== null) {
      return this.storageAvailable;
    }

    if (Platform.OS !== 'web') {
      this.storageAvailable = true;
      return true;
    }

    try {
      const testKey = '__supabase_storage_test__';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      this.storageAvailable = true;
      return true;
    } catch {
      console.warn('[Supabase Storage] AsyncStorage not available, using memory fallback');
      this.storageAvailable = false;
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const available = await this.checkStorageAvailable();
    
    if (!available) {
      return this.memoryStorage.get(key) || null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`[Supabase Storage] Error getting ${key}:`, error);
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const available = await this.checkStorageAvailable();
    
    this.memoryStorage.set(key, value);

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[Supabase Storage] Error setting ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    const available = await this.checkStorageAvailable();
    
    this.memoryStorage.delete(key);

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Supabase Storage] Error removing ${key}:`, error);
    }
  }
}

const supabaseStorage = new SupabaseStorage();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: supabaseStorage,
  },
});
