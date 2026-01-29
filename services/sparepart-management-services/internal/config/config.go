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
	Upload   UploadConfig
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

type UploadConfig struct {
	Dir         string
	MaxFileSize int64
}

var App *Config

func Load() error {
	// Load .env file if exists (ignore error if not found)
	_ = godotenv.Load()

	App = &Config{
		App: AppConfig{
			NodeEnv:   getEnv("NODE_ENV", "development"),
			Port:      getEnvAsInt("PORT", 3005),
			Host:      getEnv("HOST", "localhost"),
			APIPrefix: getEnv("API_PREFIX", "/api/v1"),
			IsDev:     getEnv("NODE_ENV", "development") == "development",
			IsProd:    getEnv("NODE_ENV", "development") == "production",
		},
		Database: DatabaseConfig{
			URL: getEnv("SPAREPART_DATABASE_URL", ""),
		},
		Logging: LoggingConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
		Upload: UploadConfig{
			Dir:         getEnv("UPLOAD_DIR", "./uploads"),
			MaxFileSize: getEnvAsInt64("MAX_FILE_SIZE", 5*1024*1024), // 5MB default
		},
	}

	if App.Database.URL == "" {
		return fmt.Errorf("SPAREPART_DATABASE_URL is required")
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

func getEnvAsInt64(key string, defaultValue int64) int64 {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseInt(valueStr, 10, 64)
	if err != nil {
		return defaultValue
	}
	return value
}
