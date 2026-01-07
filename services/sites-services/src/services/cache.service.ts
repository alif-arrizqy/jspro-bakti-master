import Redis from "ioredis";
import { env } from "../config/env.js";
import pino from "pino";
import crypto from "crypto";

const logger = pino({
  level: env.isDev ? "debug" : "info",
  transport: env.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      }
    : undefined,
});

/**
 * Cache Service with Redis
 * Provides caching functionality with fallback to database
 */
export class CacheService {
  private redis: Redis | null = null;
  private isRedisAvailable: boolean = false;

  constructor() {
    try {
      const redisUrl = env.REDIS_URL || "redis://localhost:6379";

      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          // Retry with exponential backoff
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      // Monitor Redis connection
      this.redis.on("error", (error) => {
        this.isRedisAvailable = false;
        logger.warn({ error: error.message }, "Redis connection error");
      });

      this.redis.on("connect", () => {
        this.isRedisAvailable = true;
        logger.info("Redis connected");
      });

      this.redis.on("ready", () => {
        this.isRedisAvailable = true;
        logger.info("Redis ready");
      });

      this.redis.on("close", () => {
        this.isRedisAvailable = false;
        logger.warn("Redis connection closed");
      });

      // Try to connect
      this.redis.connect().catch((error) => {
        logger.warn({ error: error.message }, "Failed to connect to Redis, cache disabled");
        this.isRedisAvailable = false;
      });
    } catch (error) {
      logger.warn({ error }, "Redis initialization failed, cache disabled");
      this.isRedisAvailable = false;
    }
  }

  /**
   * Get data from cache with fallback to database
   * @param key Cache key
   * @param fetchFromDb Function to fetch data from database if cache miss
   * @param ttl Time to live in seconds
   * @returns Cached or fresh data
   */
  async get<T>(
    key: string,
    fetchFromDb: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Try to get from cache
    if (this.isRedisAvailable && this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          logger.debug({ key }, "Cache hit");
          return JSON.parse(cached) as T;
        }
      } catch (error) {
        logger.warn({ error, key }, "Cache read error, falling back to database");
      }
    }

    // Cache miss or Redis error → Fetch from database
    logger.debug({ key }, "Cache miss, fetching from database");
    const data = await fetchFromDb();

    // Try to save to cache (non-blocking)
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(data));
        logger.debug({ key, ttl }, "Data cached successfully");
      } catch (error) {
        logger.warn({ error, key }, "Failed to cache data");
      }
    }

    return data;
  }

  /**
   * Invalidate cache keys (pattern matching)
   * @param patterns Array of key patterns to invalidate
   */
  async invalidate(patterns: string[]): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      logger.debug("Redis not available, skipping cache invalidation");
      return;
    }

    for (const pattern of patterns) {
      try {
        // Use SCAN to find matching keys (safer for production)
        const stream = this.redis.scanStream({
          match: pattern,
          count: 100,
        });

        const keys: string[] = [];
        stream.on("data", (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        await new Promise<void>((resolve, reject) => {
          stream.on("end", resolve);
          stream.on("error", reject);
        });

        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info({ pattern, count: keys.length }, "Cache invalidated");
        }
      } catch (error) {
        logger.error({ error, pattern }, "Failed to invalidate cache");
        // Don't throw error, allow process to continue
      }
    }
  }

  /**
   * Invalidate cache by specific keys
   * @param keys Array of exact cache keys to invalidate
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    if (!this.isRedisAvailable || !this.redis || keys.length === 0) {
      return;
    }

    try {
      await this.redis.del(...keys);
      logger.info({ keys, count: keys.length }, "Cache keys invalidated");
    } catch (error) {
      logger.error({ error, keys }, "Failed to invalidate cache keys");
    }
  }

  /**
   * Generate cache key for getAllSites
   */
  static getAllSitesKey(query: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    status?: string;
    province?: string;
    sccType?: string;
    batteryVersion?: string;
    siteId?: string;
    prCode?: string;
  }): string {
    // Normalize query parameters to ensure consistent hash generation
    const filterObj = {
      page: query.page !== undefined ? String(query.page) : "",
      limit: query.limit !== undefined ? String(query.limit) : "",
      search: query.search || "",
      isActive: query.isActive !== undefined ? String(query.isActive) : "",
      sortBy: query.sortBy || "",
      sortOrder: query.sortOrder || "",
      status: query.status || "",
      province: query.province || "",
      sccType: query.sccType || "",
      batteryVersion: query.batteryVersion || "",
      siteId: query.siteId || "",
      prCode: query.prCode || "",
    };

    // Create hash using crypto for better uniqueness and consistency
    const queryHash = crypto
      .createHash("md5")
      .update(JSON.stringify(filterObj))
      .digest("hex")
      .substring(0, 16);

    return `sites:all:${queryHash}`;
  }

  /**
   * Generate cache key for getSiteById
   */
  static getSiteByIdKey(id: string): string {
    return `sites:id:${id}`;
  }


  /**
   * Generate cache key for getStatistics
   */
  static getStatisticsKey(): string {
    return "sites:statistics";
  }

  /**
   * Generate cache key for getDistinctProvinces
   */
  static getDistinctProvincesKey(): string {
    return "sites:provinces:distinct";
  }

  /**
   * Calculate TTL based on query type
   * - Queries with search or filters: shorter TTL (30 minutes)
   * - General queries: longer TTL (1 hour)
   */
  static calculateTTL(query?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): number {
    // If query has search or specific filters, use shorter TTL
    if (query?.search || query?.isActive !== undefined) {
      return 30 * 60; // 30 minutes
    }
    // General queries, use longer TTL
    return 60 * 60; // 1 hour
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.isRedisAvailable = false;
      logger.info("Redis connection closed");
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

