import type { Product } from '../types/product';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // in milliseconds
}

class CacheService {
  private readonly CACHE_KEYS = {
    PRODUCTS: 'cached_products',
  } as const;

  // Default cache duration: 5 minutes
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000;

  private setCache<T>(key: string, data: T, expiresIn: number = this.DEFAULT_CACHE_DURATION): void {
    try {
      const cachedData: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresIn,
      };
      localStorage.setItem(key, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Failed to cache data:', error);
    }
  }

  private getCache<T>(key: string): T | null {
    try {
      const cachedString = localStorage.getItem(key);
      if (!cachedString) return null;

      const cached: CachedData<T> = JSON.parse(cachedString);
      const now = Date.now();
      
      // Check if cache has expired
      if (now - cached.timestamp > cached.expiresIn) {
        localStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  private clearCache(key: string): void {
    localStorage.removeItem(key);
  }

  // Product-specific caching methods
  cacheProducts(products: Product[], expiresIn?: number): void {
    this.setCache(this.CACHE_KEYS.PRODUCTS, products, expiresIn);
  }

  getCachedProducts(): Product[] | null {
    return this.getCache<Product[]>(this.CACHE_KEYS.PRODUCTS);
  }

  clearProductsCache(): void {
    this.clearCache(this.CACHE_KEYS.PRODUCTS);
  }

  // Check if products cache exists and is valid
  hasValidProductsCache(): boolean {
    return this.getCachedProducts() !== null;
  }

  // Clear all cache
  clearAllCache(): void {
    Object.values(this.CACHE_KEYS).forEach(key => {
      this.clearCache(key);
    });
  }
}

export const cacheService = new CacheService();