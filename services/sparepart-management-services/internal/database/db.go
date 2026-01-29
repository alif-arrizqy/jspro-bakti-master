package database

import (
	"context"
	"fmt"
	"sparepart-management-services/internal/config"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

var DB *pgxpool.Pool

// Connect establishes a connection pool to PostgreSQL
func Connect() error {
	cfg, err := pgxpool.ParseConfig(config.App.Database.URL)
	if err != nil {
		return fmt.Errorf("failed to parse database URL: %w", err)
	}

	// Configure connection pool for performance and concurrency
	cfg.MaxConns = 25                    // Maximum number of connections
	cfg.MinConns = 5                     // Minimum number of connections
	cfg.MaxConnLifetime = 30 * time.Minute // Maximum connection lifetime
	cfg.MaxConnIdleTime = 5 * time.Minute // Maximum idle time
	cfg.HealthCheckPeriod = 1 * time.Minute

	// Create connection pool
	DB, err = pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := DB.Ping(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	return nil
}

// Close closes the database connection pool
func Close() {
	if DB != nil {
		DB.Close()
	}
}

// GetDB returns the database connection pool
func GetDB() *pgxpool.Pool {
	return DB
}

// HealthCheck checks database health
func HealthCheck(ctx context.Context) error {
	if DB == nil {
		return fmt.Errorf("database connection pool is nil")
	}
	return DB.Ping(ctx)
}

// WithTransaction executes a function within a database transaction
func WithTransaction(ctx context.Context, fn func(context.Context, pgx.Tx) error) error {
	if DB == nil {
		return fmt.Errorf("database connection pool is nil")
	}

	// Acquire connection from pool
	conn, err := DB.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}
	defer conn.Release()

	// Begin transaction
	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		} else if err != nil {
			_ = tx.Rollback(ctx)
		} else {
			err = tx.Commit(ctx)
		}
	}()

	err = fn(ctx, tx)
	return err
}

// LogPoolStats logs connection pool statistics
func LogPoolStats(logger *zap.Logger) {
	if DB == nil {
		return
	}
	stats := DB.Stat()
	logger.Info("Database pool stats",
		zap.Int32("max_conns", stats.MaxConns()),
		zap.Int32("acquired_conns", stats.AcquiredConns()),
		zap.Int32("idle_conns", stats.IdleConns()),
		zap.Int32("constructing_conns", stats.ConstructingConns()),
		zap.Int32("total_conns", stats.TotalConns()),
	)
}
