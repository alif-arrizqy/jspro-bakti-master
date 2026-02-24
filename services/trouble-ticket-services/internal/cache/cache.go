package cache

import (
	"context"
	"encoding/json"
	"time"
	"trouble-ticket-services/internal/config"
	"trouble-ticket-services/internal/utils"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

var (
	client      *redis.Client
	isAvailable bool
)

// Init initializes the Redis client. If Redis is unreachable, caching is disabled
// gracefully — the service continues to work without cache.
func Init() {
	url := config.App.Cache.RedisURL
	if url == "" {
		utils.GetLogger().Warn("REDIS_URL not configured, caching disabled")
		return
	}

	opt, err := redis.ParseURL(url)
	if err != nil {
		utils.GetLogger().Warn("Failed to parse REDIS_URL, caching disabled", zap.Error(err))
		return
	}

	client = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		utils.GetLogger().Warn("Redis not reachable, caching disabled", zap.Error(err))
		return
	}

	isAvailable = true
	utils.GetLogger().Info("Redis connected", zap.String("url", url))
}

// Close closes the Redis connection.
func Close() {
	if client != nil {
		_ = client.Close()
	}
}

// Get retrieves a cached value by key and unmarshals it into dest.
// Returns true on cache hit, false on miss or when Redis is unavailable.
func Get(ctx context.Context, key string, dest interface{}) bool {
	if !isAvailable {
		return false
	}

	data, err := client.Get(ctx, key).Bytes()
	if err != nil {
		// redis.Nil means key not found — normal cache miss, not an error
		return false
	}

	if err := json.Unmarshal(data, dest); err != nil {
		utils.GetLogger().Warn("Failed to unmarshal cache value", zap.String("key", key), zap.Error(err))
		return false
	}

	return true
}

// Set stores a value by key with a TTL. Failures are logged and silently ignored.
func Set(ctx context.Context, key string, value interface{}, ttl time.Duration) {
	if !isAvailable {
		return
	}

	data, err := json.Marshal(value)
	if err != nil {
		utils.GetLogger().Warn("Failed to marshal cache value", zap.String("key", key), zap.Error(err))
		return
	}

	if err := client.Set(ctx, key, data, ttl).Err(); err != nil {
		utils.GetLogger().Warn("Failed to set cache", zap.String("key", key), zap.Error(err))
	}
}

// Delete removes a key from cache. No-op if Redis is unavailable.
func Delete(ctx context.Context, key string) {
	if !isAvailable {
		return
	}
	client.Del(ctx, key)
}
