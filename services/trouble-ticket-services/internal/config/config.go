package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Logging  LoggingConfig
	External ExternalConfig
	Cache    CacheConfig
}

type AppConfig struct {
	NodeEnv   string
	Port      int
	Host      string
	APIPrefix string
	IsDev     bool
	IsProd    bool
}

type DatabaseConfig struct {
	URL string
}

type LoggingConfig struct {
	Level string
}

type ExternalConfig struct {
	SitesServiceURL string
	SlaServiceURL   string
}

type CacheConfig struct {
	RedisURL string
}

var App *Config

func Load() error {
	_ = godotenv.Load()

	App = &Config{
		App: AppConfig{
			NodeEnv:   getEnv("NODE_ENV", "development"),
			Port:      getEnvAsInt("PORT", 3006),
			Host:      getEnv("HOST", "localhost"),
			APIPrefix: getEnv("API_PREFIX", "/api/v1"),
			IsDev:     getEnv("NODE_ENV", "development") == "development",
			IsProd:    getEnv("NODE_ENV", "development") == "production",
		},
		Database: DatabaseConfig{
			URL: getEnv("TROUBLE_TICKET_DATABASE_URL", ""),
		},
		Logging: LoggingConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
		External: ExternalConfig{
			SitesServiceURL: getEnv("SITES_SERVICE_URL", "http://localhost:3001"),
			SlaServiceURL:   getEnv("SLA_SERVICE_URL", "http://localhost:3002"),
		},
		Cache: CacheConfig{
			RedisURL: getEnv("REDIS_URL", "redis://localhost:6379"),
		},
	}

	if App.Database.URL == "" {
		return fmt.Errorf("TROUBLE_TICKET_DATABASE_URL is required")
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
