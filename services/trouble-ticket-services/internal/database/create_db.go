package database

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"trouble-ticket-services/internal/config"

	_ "github.com/lib/pq"
)

func CreateDatabaseIfNotExists() error {
	dbURL := config.App.Database.URL

	re := regexp.MustCompile(`postgresql://[^/]+/([^?]+)`)
	matches := re.FindStringSubmatch(dbURL)
	if len(matches) < 2 {
		return fmt.Errorf("invalid database URL format")
	}

	dbName := matches[1]
	postgresURL := strings.Replace(dbURL, "/"+dbName, "/postgres", 1)

	if !strings.Contains(postgresURL, "sslmode=") {
		if strings.Contains(postgresURL, "?") {
			postgresURL += "&sslmode=disable"
		} else {
			postgresURL += "?sslmode=disable"
		}
	}

	db, err := sql.Open("postgres", postgresURL)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres database: %w", err)
	}
	defer db.Close()

	var exists bool
	query := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)"
	err = db.QueryRow(query, dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check database existence: %w", err)
	}

	if !exists {
		terminateQuery := `
			SELECT pg_terminate_backend(pg_stat_activity.pid)
			FROM pg_stat_activity
			WHERE pg_stat_activity.datname = $1
			AND pid <> pg_backend_pid()`
		_, _ = db.Exec(terminateQuery, dbName)

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
	}

	return nil
}
