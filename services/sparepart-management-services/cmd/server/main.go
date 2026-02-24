package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sparepart-management-services/internal/config"
	"sparepart-management-services/internal/database"
	"sparepart-management-services/internal/models"
	"sparepart-management-services/internal/routes"
	"sparepart-management-services/internal/utils"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize logger
	if err := utils.InitLogger(config.App.Logging.Level); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	logger := utils.GetLogger()
	defer logger.Sync()

	// Create database if not exists (before connecting)
	logger.Info("Checking database existence...")
	if err := database.CreateDatabaseIfNotExists(); err != nil {
		logger.Fatal("Failed to create database", zap.Error(err))
	}
	logger.Info("Database ready")

	// Connect to database
	if err := database.Connect(); err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer database.Close()

	logger.Info("Database connected successfully")

	// Check if migrate command
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		logger.Info("Running database migrations...")
		if err := database.RunMigrations(); err != nil {
			logger.Fatal("Failed to run migrations", zap.Error(err))
		}
		logger.Info("Migrations completed successfully")
		return
	}

	// Check if migrate-down command
	if len(os.Args) > 1 && os.Args[1] == "migrate-down" {
		logger.Info("Rolling back last migration...")
		if err := database.DownMigrations(); err != nil {
			logger.Fatal("Failed to rollback migration", zap.Error(err))
		}
		logger.Info("Migration rollback completed successfully")
		return
	}

	// Check if seed command
	if len(os.Args) > 1 && os.Args[1] == "seed" {
		logger.Info("Running database seeders...")
		ctx := context.Background()
		if err := models.Seed(ctx); err != nil {
			logger.Fatal("Failed to seed database", zap.Error(err))
		}
		logger.Info("Database seeding completed successfully")
		return
	}

	// Check if generate command (sqlc)
	if len(os.Args) > 1 && os.Args[1] == "generate" {
		logger.Info("Generating sqlc code...")
		// sqlc generate will be run via Makefile
		logger.Info("Please run: make generate")
		return
	}

	// Setup Gin
	if config.App.App.IsProd {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Middleware
	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"*"},
		AllowCredentials: true,
	}))

	// Serve static files (uploads)
	r.Use(static.Serve("/uploads", static.LocalFile(config.App.Upload.Dir, false)))

	// Setup routes
	routes.SetupRoutes(r)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", config.App.App.Host, config.App.App.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Starting Sparepart Management Service",
			zap.String("host", config.App.App.Host),
			zap.Int("port", config.App.App.Port),
			zap.String("env", config.App.App.NodeEnv),
		)
		logger.Info("API available at http://" + config.App.App.Host + ":" + strconv.Itoa(config.App.App.Port) + config.App.App.APIPrefix)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
