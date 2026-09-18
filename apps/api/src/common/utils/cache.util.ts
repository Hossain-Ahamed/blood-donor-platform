import { Cache } from "cache-manager";
import { Logger } from "@nestjs/common";

const logger = new Logger("CacheProtectionUtil");
const inFlightRequests = new Map<string, Promise<any>>();

const SENTINEL_NULL_FLAG = "__SENTINEL_NULL__";

export interface CacheOptions {
  ttlMs?: number;
  nullTtlMs?: number;
  jitterPercent?: number;
  forceRefresh?: boolean;
  enablePenetrationProtection?: boolean;
}

/**
 * Adds randomized jitter (default +/- 15%) to TTL to prevent Cache Avalanche / Stampede
 * where bulk keys expire at the exact same millisecond.
 */
export function applyTtlJitter(ttlMs: number, jitterPercent = 0.15): number {
  const min = ttlMs * (1 - jitterPercent);
  const max = ttlMs * (1 + jitterPercent);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Advanced Cache-Aside fetcher with:
 * 1. Cache Stampede Protection (Single-Flight In-Memory Promise Deduplication)
 * 2. Cache Avalanche Protection (Jittered TTLs)
 * 3. Cache Penetration Protection (Sentinel Null Caching with Short TTL)
 *
 * @param cacheManager Cache manager instance
 * @param key Cache key
 * @param fetcher Async function retrieving data from the database
 * @param options Configuration options for TTL, jitter, and penetration safeguards
 */
export async function getOrSetWithStampedeProtection<T>(
  cacheManager: Cache,
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 60000,
  forceRefresh: boolean = false,
  options: Partial<CacheOptions> = {},
): Promise<T> {
  const config: CacheOptions = {
    ttlMs,
    nullTtlMs: options.nullTtlMs ?? 30000, // 30 seconds for null/empty results
    jitterPercent: options.jitterPercent ?? 0.15,
    forceRefresh: forceRefresh || options.forceRefresh || false,
    enablePenetrationProtection:
      options.enablePenetrationProtection !== undefined
        ? options.enablePenetrationProtection
        : true,
  };

  // 1. Read from cache if not forcing refresh
  if (!config.forceRefresh) {
    try {
      const cached = await cacheManager.get<any>(key);
      if (cached !== undefined && cached !== null) {
        // Cache Penetration Check: Sentinel object detected
        if (
          config.enablePenetrationProtection &&
          cached &&
          typeof cached === "object" &&
          cached[SENTINEL_NULL_FLAG] === true
        ) {
          return null as unknown as T;
        }
        return cached as T;
      }
    } catch (err) {
      logger.warn(`Failed to read from cache for key "${key}": ${err}`);
    }
  }

  // 2. Cache Stampede Protection: Single-flight request deduplication
  // If a request for this exact key is already in flight, await that promise
  if (inFlightRequests.has(key)) {
    try {
      return await inFlightRequests.get(key);
    } catch {
      // If the joined in-flight request fails, continue below to execute fresh
    }
  }

  // 3. Create single-flight promise to fetch from DB and populate cache
  const promise = (async () => {
    try {
      const result = await fetcher();

      // Check for empty/null result -> apply Cache Penetration Sentinel
      if (result === null || result === undefined) {
        if (config.enablePenetrationProtection) {
          const sentinelTtl = applyTtlJitter(
            config.nullTtlMs!,
            config.jitterPercent,
          );
          try {
            await cacheManager.set(
              key,
              { [SENTINEL_NULL_FLAG]: true },
              sentinelTtl,
            );
          } catch (cacheErr) {
            logger.warn(
              `Failed to set null sentinel cache for key "${key}": ${cacheErr}`,
            );
          }
        }
        return null as unknown as T;
      }

      // Normal valid data: store with jittered TTL to avoid stampede avalanche
      const effectiveTtl = applyTtlJitter(
        config.ttlMs!,
        config.jitterPercent,
      );
      try {
        await cacheManager.set(key, result, effectiveTtl);
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
 * Safely invalidates one or more keys from the cache.
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
