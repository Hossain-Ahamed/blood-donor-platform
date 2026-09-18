import { Cache } from "cache-manager";
import { Logger } from "@nestjs/common";

const logger = new Logger("CacheStampedeProtection");
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Executes a cache read with Cache Stampede protection (single-flight locking)
 * and optional cache-bypass for fresh data.
 *
 * @param cacheManager NestJS cache manager instance
 * @param key Cache key
 * @param fetcher Database or heavy computation function
 * @param ttlMs Time-to-live in milliseconds (default: 60,000ms = 1 minute)
 * @param forceRefresh If true, bypasses the cache and repopulates it with fresh data
 */
export async function getOrSetWithStampedeProtection<T>(
  cacheManager: Cache,
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60000,
  forceRefresh: boolean = false,
): Promise<T> {
  // If not forcing fresh data, check cache first
  if (!forceRefresh) {
    try {
      const cached = await cacheManager.get<T>(key);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (err) {
      logger.warn(`Failed to read from cache for key "${key}": ${err}`);
    }
  }

  // Stampede protection: if there is already an in-flight fetch for this key, join it
  if (inFlightRequests.has(key)) {
    try {
      return await inFlightRequests.get(key);
    } catch {
      // In case the joined promise fails, continue below to execute fresh
    }
  }

  // Create new in-flight fetcher
  const promise = (async () => {
    try {
      const result = await fetcher();
      try {
        await cacheManager.set(key, result, ttlMs);
      } catch (cacheErr) {
        logger.warn(`Failed to set cache for key "${key}": ${cacheErr}`);
      }
      return result;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Safely invalidates one or more keys or key prefixes from the cache.
 */
export async function invalidateCacheKeys(
  cacheManager: Cache,
  keys: string[],
): Promise<void> {
  for (const key of keys) {
    try {
      await cacheManager.del(key);
    } catch (err) {
      logger.warn(`Failed to delete cache key "${key}": ${err}`);
    }
  }
}
