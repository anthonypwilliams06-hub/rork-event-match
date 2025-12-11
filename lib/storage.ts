import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class SafeStorage {
  private memoryStorage: Map<string, string> = new Map();
  private isAvailable: boolean | null = null;
  private checkInProgress: Promise<boolean> | null = null;

  private async checkAvailability(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    if (this.checkInProgress) {
      return this.checkInProgress;
    }

    this.checkInProgress = this.performCheck();
    return this.checkInProgress;
  }

  private async performCheck(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      this.isAvailable = true;
      return true;
    }

    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.isAvailable = false;
        return false;
      }
      
      const testKey = '__safe_storage_test__';
      localStorage.setItem(testKey, testKey);
      const result = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      this.isAvailable = result === testKey;
      return this.isAvailable;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const available = await this.checkAvailability();
    
    if (!available) {
      return this.memoryStorage.get(key) || null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`[Storage] Error getting item ${key}:`, error);
      return this.memoryStorage.get(key) || null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const available = await this.checkAvailability();
    
    this.memoryStorage.set(key, value);

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[Storage] Error setting item ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    const available = await this.checkAvailability();
    
    this.memoryStorage.delete(key);

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Storage] Error removing item ${key}:`, error);
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    const available = await this.checkAvailability();
    
    if (!available) {
      return keys.map(key => [key, this.memoryStorage.get(key) || null]) as [string, string | null][];
    }

    try {
      const result = await AsyncStorage.multiGet(keys);
      return result as [string, string | null][];
    } catch (error) {
      console.warn('[Storage] Error getting multiple items:', error);
      return keys.map(key => [key, this.memoryStorage.get(key) || null]);
    }
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    const available = await this.checkAvailability();
    
    keyValuePairs.forEach(([key, value]) => {
      this.memoryStorage.set(key, value);
    });

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.warn('[Storage] Error setting multiple items:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    const available = await this.checkAvailability();
    
    keys.forEach(key => {
      this.memoryStorage.delete(key);
    });

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.warn('[Storage] Error removing multiple items:', error);
    }
  }

  async clear(): Promise<void> {
    const available = await this.checkAvailability();
    
    this.memoryStorage.clear();

    if (!available) {
      return;
    }

    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.warn('[Storage] Error clearing storage:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    const available = await this.checkAvailability();
    
    if (!available) {
      return Array.from(this.memoryStorage.keys());
    }

    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch (error) {
      console.warn('[Storage] Error getting all keys:', error);
      return Array.from(this.memoryStorage.keys());
    }
  }
}

export const storage = new SafeStorage();
