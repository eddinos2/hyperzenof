// Cache intelligent pour améliorer les performances
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set<T>(key: string, data: T, expiresInMinutes: number = 5): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMinutes * 60 * 1000
    };
    this.cache.set(key, item);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.expiresIn) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache avec fallback pour les requêtes Supabase
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresInMinutes: number = 5
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, expiresInMinutes);
    return data;
  }

  // Préchargement intelligent
  preload<T>(key: string, fetcher: () => Promise<T>, expiresInMinutes: number = 5): void {
    setTimeout(async () => {
      try {
        const data = await fetcher();
        this.set(key, data, expiresInMinutes);
      } catch (error) {
        console.warn('Preload failed for key:', key, error);
      }
    }, 0);
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const item of this.cache.values()) {
      if (now - item.timestamp > item.expiresIn) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      hitRatio: valid / (valid + expired) || 0
    };
  }
}

export const cacheManager = CacheManager.getInstance();

// Hook pour utiliser le cache avec React
import { useCallback } from 'react';

export function useCache() {
  const set = useCallback(<T>(key: string, data: T, expiresInMinutes?: number) => {
    cacheManager.set(key, data, expiresInMinutes);
  }, []);

  const get = useCallback(<T>(key: string): T | null => {
    return cacheManager.get<T>(key);
  }, []);

  const invalidate = useCallback((key: string) => {
    cacheManager.invalidate(key);
  }, []);

  const invalidatePattern = useCallback((pattern: string) => {
    cacheManager.invalidatePattern(pattern);
  }, []);

  const withCache = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    expiresInMinutes?: number
  ): Promise<T> => {
    return cacheManager.withCache(key, fetcher, expiresInMinutes);
  }, []);

  return {
    set,
    get,
    invalidate,
    invalidatePattern,
    withCache,
    clear: cacheManager.clear.bind(cacheManager),
    getStats: cacheManager.getStats.bind(cacheManager)
  };
}