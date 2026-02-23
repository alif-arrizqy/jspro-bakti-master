package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
	"trouble-ticket-services/internal/cache"
	"trouble-ticket-services/internal/config"
	"trouble-ticket-services/internal/database"
	"trouble-ticket-services/internal/models"
	"trouble-ticket-services/internal/routes"
	"trouble-ticket-services/internal/utils"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	if err := utils.InitLogger(config.App.Logging.Level); err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	logger := utils.GetLogger()
	defer logger.Sync()

	logger.Info("Checking database existence...")
	if err := database.CreateDatabaseIfNotExists(); err != nil {
		logger.Fatal("Failed to create database", zap.Error(err))
	}
	logger.Info("Database ready")

	if err := database.Connect(); err != nil {
		logger.Fatal("Failed to connect to database", zap.Error(err))
	}
	defer database.Close()

	logger.Info("Database connected successfully")

	cache.Init()
	defer cache.Close()

	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		logger.Info("Running database migrations...")
		if err := database.RunMigrations(); err != nil {
			logger.Fatal("Failed to run migrations", zap.Error(err))
		}
		logger.Info("Migrations completed successfully")
		return
	}

	if len(os.Args) > 1 && os.Args[1] == "migrate-down" {
		logger.Info("Rolling back last migration...")
		if err := database.DownMigrations(); err != nil {
			logger.Fatal("Failed to rollback migration", zap.Error(err))
		}
		logger.Info("Migration rollback completed successfully")
		return
	}

	if len(os.Args) > 1 && os.Args[1] == "seed" {
		logger.Info("Running database seeders...")
		ctx := context.Background()
		if err := models.Seed(ctx); err != nil {
			logger.Fatal("Failed to seed database", zap.Error(err))
		}
		logger.Info("Database seeding completed successfully")
		return
	}

	if config.App.App.IsProd {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	r.Use(gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		ExposeHeaders:    []string{"*"},
		AllowCredentials: true,
	}))

	routes.SetupRoutes(r)

	srv := &http.Server{
		Addr:         fmt.Sprintf("%s:%d", config.App.App.Host, config.App.App.Port),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.Info("Starting Trouble Ticket Service",
			zap.String("host", config.App.App.Host),
			zap.Int("port", config.App.App.Port),
			zap.String("env", config.App.App.NodeEnv),
		)
		logger.Info("API available at http://" + config.App.App.Host + ":" + strconv.Itoa(config.App.App.Port) + config.App.App.APIPrefix)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
