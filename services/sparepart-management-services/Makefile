.PHONY: run build migrate migrate-down seed generate clean dev install-deps install-tools

# Install required tools (golang-migrate, sqlc)
install-tools:
	@echo "Installing golang-migrate..."
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@echo "Installing sqlc..."
	@go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
	@echo "Tools installed successfully!"

# Install dependencies
install-deps:
	go mod download
	go mod tidy

# Run development server
run:
	go run cmd/server/main.go

# Run with hot reload
dev:
	air

# Build binary
build:
	go build -o sparepart-management-services cmd/server/main.go

# Run database migrations
migrate:
	go run cmd/server/main.go migrate

# Rollback last migration
migrate-down:
	go run cmd/server/main.go migrate-down

# Seed database
seed:
	go run cmd/server/main.go seed

# Generate sqlc code from SQL queries
generate:
	sqlc generate

# Create new migration file
migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir internal/database/migrations -seq $${name}

# Clean build artifacts
clean:
	rm -f sparepart-management-services
	rm -rf tmp

# Setup project (install tools, deps, generate code)
setup: install-tools install-deps generate
	@echo "Setup complete! Run 'make migrate' to setup database."

