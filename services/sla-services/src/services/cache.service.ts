import Redis from "ioredis";
import { slaLogger } from "../utils/logger";
import { config } from "../config/env";
import dayjs from "dayjs";
import crypto from "crypto";

/**
 * Cache Service with Redis
 * Provides caching functionality with fallback to database
 */
export class CacheService {
    private redis: Redis | null = null;
    private isRedisAvailable: boolean = false;

    constructor() {
        try {
            const redisUrl = config.cache?.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
            
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
                slaLogger.warn({ error: error.message }, "Redis connection error");
            });

            this.redis.on("connect", () => {
                this.isRedisAvailable = true;
                slaLogger.info("Redis connected");
            });

            this.redis.on("ready", () => {
                this.isRedisAvailable = true;
                slaLogger.info("Redis ready");
            });

            this.redis.on("close", () => {
                this.isRedisAvailable = false;
                slaLogger.warn("Redis connection closed");
            });

            // Try to connect
            this.redis.connect().catch((error) => {
                slaLogger.warn({ error: error.message }, "Failed to connect to Redis, cache disabled");
                this.isRedisAvailable = false;
            });
        } catch (error) {
            slaLogger.warn({ error }, "Redis initialization failed, cache disabled");
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
                    slaLogger.debug({ key }, "Cache hit");
                    return JSON.parse(cached) as T;
                }
            } catch (error) {
                slaLogger.warn({ error, key }, "Cache read error, falling back to database");
            }
        }

        // Cache miss or Redis error → Fetch from database
        slaLogger.debug({ key }, "Cache miss, fetching from database");
        const data = await fetchFromDb();

        // Try to save to cache (non-blocking)
        if (this.isRedisAvailable && this.redis) {
            try {
                await this.redis.setex(key, ttl, JSON.stringify(data));
                slaLogger.debug({ key, ttl }, "Data cached successfully");
            } catch (error) {
                slaLogger.warn({ error, key }, "Failed to cache data");
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
            slaLogger.debug("Redis not available, skipping cache invalidation");
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
                    slaLogger.info({ pattern, count: keys.length }, "Cache invalidated");
                }
            } catch (error) {
                slaLogger.error({ error, pattern }, "Failed to invalidate cache");
                // Don't throw error, allow process to continue
            }
        }
    }

    /**
     * Invalidate cache by date range
     * This function invalidates all cache keys that overlap with the given date range
     * @param startDate Start date (YYYY-MM-DD)
     * @param endDate End date (YYYY-MM-DD)
     */
    async invalidateByDateRange(startDate: string, endDate: string): Promise<void> {
        if (!this.isRedisAvailable || !this.redis) {
            slaLogger.debug("Redis not available, skipping cache invalidation");
            return;
        }

        const invalidateStart = dayjs(startDate);
        const invalidateEnd = dayjs(endDate);
        const dates: string[] = [];
        let current = invalidateStart;

        // Generate all dates in range
        while (current.isBefore(invalidateEnd) || current.isSame(invalidateEnd)) {
            dates.push(current.format("YYYY-MM-DD"));
            current = current.add(1, "day");
        }

        const patterns: string[] = [];
        const keysToDelete: string[] = [];

        // Helper function to check if two date ranges overlap
        const rangesOverlap = (range1Start: dayjs.Dayjs, range1End: dayjs.Dayjs, 
                               range2Start: dayjs.Dayjs, range2End: dayjs.Dayjs): boolean => {
            // Two ranges overlap if: range1Start <= range2End AND range1End >= range2Start
            return (range1Start.isBefore(range2End) || range1Start.isSame(range2End)) && 
                   (range1End.isAfter(range2Start) || range1End.isSame(range2Start));
        };

        // Helper function to parse date from cache key
        const parseDateFromKey = (key: string, prefix: string): { startDate?: string; endDate?: string } => {
            // Pattern: prefix:startDate:endDate or prefix:*:startDate:endDate
            const parts = key.split(":");
            const prefixParts = prefix.split(":");
            
            // Find where prefix ends
            let dateIndex = prefixParts.length;
            
            // Try to find date pattern YYYY-MM-DD
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            const dates: string[] = [];
            
            for (let i = dateIndex; i < parts.length; i++) {
                if (datePattern.test(parts[i])) {
                    dates.push(parts[i]);
                }
            }
            
            if (dates.length >= 2) {
                return { startDate: dates[0], endDate: dates[1] };
            } else if (dates.length === 1) {
                // For monthly summary: sla:monthly:summary:YYYY-MM-01:endDate
                return { startDate: dates[0], endDate: dates[0] };
            }
            
            return {};
        };

        // Patterns to scan for different cache types
        const cachePrefixes = [
            "sla:chart:daily",
            "sla:chart:weekly",
            "sla:chart:battery",
            "sla:detail:daily",
            "sla:master",
        ];

        try {
            // For each cache type, scan all keys and check for overlap
            for (const prefix of cachePrefixes) {
                const stream = this.redis.scanStream({
                    match: `${prefix}:*`,
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

                // Check each key for date range overlap
                for (const key of keys) {
                    const parsed = parseDateFromKey(key, prefix);
                    
                    if (parsed.startDate && parsed.endDate) {
                        const keyStart = dayjs(parsed.startDate);
                        const keyEnd = dayjs(parsed.endDate);
                        
                        // Check if ranges overlap
                        if (rangesOverlap(invalidateStart, invalidateEnd, keyStart, keyEnd)) {
                            keysToDelete.push(key);
                        }
                    } else {
                        // If we can't parse dates, include it to be safe (for keys with hash)
                        // Check if key contains any of the dates in the invalidate range
                        const keyContainsDate = dates.some(date => key.includes(date));
                        if (keyContainsDate) {
                            keysToDelete.push(key);
                        }
                    }
                }
            }

            // Handle monthly summary separately (different format)
            for (const date of dates) {
                const yearMonth = dayjs(date).format("YYYY-MM");
                patterns.push(`sla:monthly:summary:${yearMonth}-01:*`);
            }

            // Also add pattern-based invalidation for keys we might have missed
            // These patterns are more aggressive to catch edge cases
            for (const date of dates) {
                // Pattern for keys ending with the date
                patterns.push(`sla:chart:daily:*:${date}`);
                patterns.push(`sla:chart:daily:*:${date}:*`);
                patterns.push(`sla:chart:weekly:*:${date}`);
                patterns.push(`sla:chart:battery:*:*:${date}`);
                patterns.push(`sla:detail:daily:*:${date}`);
                patterns.push(`sla:master:*:${date}:*`);
                
                // Pattern for keys starting with the date
                patterns.push(`sla:chart:daily:${date}:*`);
                patterns.push(`sla:chart:weekly:${date}:*`);
                patterns.push(`sla:detail:daily:${date}:*`);
            }

            // Add exact range patterns
            patterns.push(`sla:chart:daily:${startDate}:${endDate}`);
            patterns.push(`sla:chart:weekly:${startDate}:${endDate}`);
            patterns.push(`sla:detail:daily:${startDate}:${endDate}`);
            patterns.push(`sla:master:${startDate}:${endDate}:*`);

            // Delete keys that overlap
            if (keysToDelete.length > 0) {
                // Remove duplicates
                const uniqueKeys = Array.from(new Set(keysToDelete));
                await this.redis.del(...uniqueKeys);
                slaLogger.info({ 
                    count: uniqueKeys.length, 
                    dateRange: [startDate, endDate] 
                }, "Cache keys invalidated by date range overlap");
            }

            // Also invalidate by patterns (for keys we might have missed)
            await this.invalidate(patterns);

        } catch (error) {
            slaLogger.error({ error, startDate, endDate }, "Failed to invalidate cache by date range");
            // Don't throw error, allow process to continue
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
            slaLogger.info({ keys, count: keys.length }, "Cache keys invalidated");
        } catch (error) {
            slaLogger.error({ error, keys }, "Failed to invalidate cache keys");
        }
    }

    /**
     * Generate cache key for daily chart
     */
    static getDailyChartKey(startDate: string, endDate: string): string {
        return `sla:chart:daily:${startDate}:${endDate}`;
    }

    /**
     * Generate cache key for daily chart by battery version
     */
    static getDailyChartBatteryKey(
        startDate: string,
        endDate: string,
        batteryVersion: string
    ): string {
        return `sla:chart:daily:battery:${batteryVersion}:${startDate}:${endDate}`;
    }

    /**
     * Generate cache key for weekly chart
     */
    static getWeeklyChartKey(startDate: string, endDate: string): string {
        return `sla:chart:weekly:${startDate}:${endDate}`;
    }

    /**
     * Generate cache key for daily detail report
     */
    static getDailyDetailKey(startDate: string, endDate: string): string {
        return `sla:detail:daily:${startDate}:${endDate}`;
    }

    /**
     * Generate cache key for monthly summary report
     */
    static getMonthlySummaryKey(startDate: string, endDate: string): string {
        return `sla:monthly:summary:${startDate}:${endDate}`;
    }

    /**
     * Generate cache key for master data
     */
    static getMasterKey(params: {
        startDate: string;
        endDate: string;
        siteId?: string;
        siteName?: string;
        batteryVersion?: string;
        statusSP?: string;
        slaStatus?: string;
        slaMin?: number;
        slaMax?: number;
        province?: string;
        pic?: string;
        page?: number;
        limit?: number;
    }): string {
        // Create a hash of all filter parameters for cache key
        // Use a more robust approach: sort keys and include all values explicitly
        // This ensures consistent hash generation even with undefined values
        const filterObj = {
            siteId: params.siteId || "",
            siteName: params.siteName || "",
            batteryVersion: params.batteryVersion || "",
            statusSP: params.statusSP || "",
            slaStatus: params.slaStatus || "",
            slaMin: params.slaMin !== undefined ? String(params.slaMin) : "",
            slaMax: params.slaMax !== undefined ? String(params.slaMax) : "",
            province: params.province || "",
            pic: params.pic || "",
            page: params.page !== undefined ? String(params.page) : "",
            limit: params.limit !== undefined ? String(params.limit) : "",
        };
        
        // Create hash using crypto for better uniqueness
        const filterHash = crypto
            .createHash("md5")
            .update(JSON.stringify(filterObj))
            .digest("hex")
            .substring(0, 16);

        return `sla:master:${params.startDate}:${params.endDate}:${filterHash}`;
    }

    /**
     * Calculate TTL based on date range
     * - Past dates: longer TTL (24 hours)
     * - Current dates: shorter TTL (30 minutes - 1 hour)
     */
    static calculateTTL(startDate: string, endDate: string): number {
        const today = dayjs();
        const end = dayjs(endDate);

        // If end date is in the past, use longer TTL
        if (end.isBefore(today, "day")) {
            return 24 * 60 * 60; // 24 hours
        }

        // If end date is today or in the future, use shorter TTL
        return 30 * 60; // 30 minutes
    }

    /**
     * Calculate TTL for monthly summary
     * - Past months: 24 hours
     * - Current month: 1 hour
     */
    static calculateMonthlyTTL(startDate: string): number {
        const today = dayjs();
        const monthStart = dayjs(startDate);

        // If month is in the past, use longer TTL
        if (monthStart.isBefore(today, "month")) {
            return 24 * 60 * 60; // 24 hours
        }

        // Current month, use shorter TTL
        return 1 * 60 * 60; // 1 hour
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
            this.isRedisAvailable = false;
            slaLogger.info("Redis connection closed");
        }
    }
}

// Export singleton instance
export const cacheService = new CacheService();

