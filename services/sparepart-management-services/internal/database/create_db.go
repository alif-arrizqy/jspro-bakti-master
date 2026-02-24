package database

import (
	"database/sql"
	"fmt"
	"regexp"
	"sparepart-management-services/internal/config"
	"strings"

	_ "github.com/lib/pq"
)

// CreateDatabaseIfNotExists creates the database if it doesn't exist
func CreateDatabaseIfNotExists() error {
	// Parse connection string to extract database name
	dbURL := config.App.Database.URL

	// Extract database name from connection string
	// Format: postgresql://user:password@host:port/dbname?params
	re := regexp.MustCompile(`postgresql://[^/]+/([^?]+)`)
	matches := re.FindStringSubmatch(dbURL)
	if len(matches) < 2 {
		return fmt.Errorf("invalid database URL format")
	}

	dbName := matches[1]

	// Create connection string to postgres database (default database)
	// Replace database name with 'postgres' but keep query parameters
	postgresURL := strings.Replace(dbURL, "/"+dbName, "/postgres", 1)

	// Ensure sslmode is set (default to disable if not specified)
	if !strings.Contains(postgresURL, "sslmode=") {
		if strings.Contains(postgresURL, "?") {
			postgresURL += "&sslmode=disable"
		} else {
			postgresURL += "?sslmode=disable"
		}
	}

	// Connect to postgres database
	db, err := sql.Open("postgres", postgresURL)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres database: %w", err)
	}
	defer db.Close()

	// Check if database exists
	// Note: pg_database.datname is an identifier, so we need to quote it properly
	// Using parameterized query for safety
	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)"
	err = db.QueryRow(query, dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	// Create database if it doesn't exist
	if !exists {
		// Terminate existing connections to the database (if any)
		// Note: This uses parameterized query for safety
		terminateQuery := `
			SELECT pg_terminate_backend(pg_stat_activity.pid)
			FROM pg_stat_activity
			WHERE pg_stat_activity.datname = $1
			AND pid <> pg_backend_pid()`
		_, _ = db.Exec(terminateQuery, dbName)

		// Create database
		// Note: Database name cannot be parameterized in CREATE DATABASE
		// So we validate it contains only safe characters (alphanumeric, underscore, hyphen)
		// and quote it properly using pg_catalog.quote_ident
		var quotedDbName string
		err = db.QueryRow("SELECT pg_catalog.quote_ident($1)", dbName).Scan(&quotedDbName)
		if err != nil {
			return fmt.Errorf("failed to quote database name: %w", err)
		}

		createQuery := fmt.Sprintf("CREATE DATABASE %s", quotedDbName)
		_, err = db.Exec(createQuery)
		if err != nil {
			return fmt.Errorf("failed to create database: %w", err)
		}

		return nil
	}

	return nil
}
