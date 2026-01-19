import Redis from "ioredis";
import { shippingLogger } from "../utils/logger";
import { config } from "../config/env";

/**
 * Cache Service with Redis
 * Provides caching functionality with fallback to database
 */
export class CacheService {
    private redis: Redis | null = null;
    private isRedisAvailable: boolean = false;

    constructor() {
        if (!config.cache.redisUrl) {
            shippingLogger.warn("Redis URL not configured, cache disabled");
            return;
        }

        try {
            this.redis = new Redis(config.cache.redisUrl, {
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
                shippingLogger.warn({ error: error.message }, "Redis connection error");
            });

            this.redis.on("connect", () => {
                this.isRedisAvailable = true;
                shippingLogger.info("Redis connected");
            });

            this.redis.on("ready", () => {
                this.isRedisAvailable = true;
                shippingLogger.info("Redis ready");
            });

            this.redis.on("close", () => {
                this.isRedisAvailable = false;
                shippingLogger.warn("Redis connection closed");
            });

            // Try to connect
            this.redis.connect().catch((error) => {
                shippingLogger.warn({ error: error.message }, "Failed to connect to Redis, cache disabled");
                this.isRedisAvailable = false;
            });
        } catch (error) {
            shippingLogger.warn({ error }, "Redis initialization failed, cache disabled");
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
    async get<T>(key: string, fetchFromDb: () => Promise<T>, ttl: number = 3600): Promise<T> {
        // Try to get from cache
        if (this.isRedisAvailable && this.redis) {
            try {
                const cached = await this.redis.get(key);
                if (cached) {
                    shippingLogger.debug({ key }, "Cache hit");
                    return JSON.parse(cached) as T;
                }
            } catch (error) {
                shippingLogger.warn({ error, key }, "Cache read error, falling back to database");
            }
        }

        // Cache miss or Redis error → Fetch from database
        shippingLogger.debug({ key }, "Cache miss, fetching from database");
        const data = await fetchFromDb();

        // Try to save to cache (non-blocking)
        if (this.isRedisAvailable && this.redis) {
            try {
                await this.redis.setex(key, ttl, JSON.stringify(data));
                shippingLogger.debug({ key, ttl }, "Data cached successfully");
            } catch (error) {
                shippingLogger.warn({ error, key }, "Failed to cache data");
            }
        }

        return data;
    }

    /**
     * Set data in cache
     */
    async set(key: string, value: any, ttl: number = 3600): Promise<void> {
        if (this.isRedisAvailable && this.redis) {
            try {
                await this.redis.setex(key, ttl, JSON.stringify(value));
                shippingLogger.debug({ key, ttl }, "Data set in cache");
            } catch (error) {
                shippingLogger.warn({ error, key }, "Failed to set cache");
            }
        }
    }

    /**
     * Delete data from cache
     */
    async delete(key: string): Promise<void> {
        if (this.isRedisAvailable && this.redis) {
            try {
                await this.redis.del(key);
                shippingLogger.debug({ key }, "Data deleted from cache");
            } catch (error) {
                shippingLogger.warn({ error, key }, "Failed to delete from cache");
            }
        }
    }

    /**
     * Invalidate cache by pattern
     */
    async invalidatePattern(pattern: string): Promise<void> {
        if (this.isRedisAvailable && this.redis) {
            try {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    shippingLogger.debug({ pattern, count: keys.length }, "Cache invalidated by pattern");
                }
            } catch (error) {
                shippingLogger.warn({ error, pattern }, "Failed to invalidate cache pattern");
            }
        }
    }

    /**
     * Close Redis connection
     */
    async disconnect(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.isRedisAvailable = false;
            shippingLogger.info("Redis disconnected");
        }
    }
}

export const cacheService = new CacheService();

