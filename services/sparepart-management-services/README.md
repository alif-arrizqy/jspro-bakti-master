# Sparepart Management Services (Go)

Service untuk mengelola inventory sparepart dan tools alker menggunakan Golang dengan arsitektur modern untuk performa dan concurrency tinggi.

## Tech Stack

- **Framework**: Gin (HTTP web framework)
- **Database Layer**: `database/sql` + `pgx/v5` (connection pooling)
- **Query Generation**: sqlc (type-safe SQL to Go code generation)
- **Migrations**: golang-migrate (versioned migrations)
- **Database**: PostgreSQL
- **Logging**: Zap (Uber's structured logger)
- **File Upload**: Gin multipart form

## Prerequisites

- Go 1.24+ 
- PostgreSQL 12+
- PowerShell (Windows)

## Setup

### 1. Install Tools

Install required tools untuk development:

```powershell
# Install golang-migrate
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Install sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Install air (optional, untuk hot reload)
go install github.com/cosmtrek/air@latest

# Pastikan Go bin ada di PATH
$env:PATH += ";$env:USERPROFILE\go\bin"

# Verifikasi instalasi
migrate -version
sqlc version
```

### 2. Install Dependencies

```powershell
go mod download
go mod tidy
```

### 3. Setup Environment Variables

```powershell
# Copy env.example ke .env
Copy-Item env.example .env

# Edit .env dengan database URL Anda
notepad .env
```

Isi `.env` dengan:
```
SPAREPART_DATABASE_URL=postgresql://user:password@localhost:5432/sparepart_db?sslmode=disable
```

**Catatan:** Ganti `user`, `password`, dan `sparepart_db` dengan credentials PostgreSQL Anda.

### 4. Generate sqlc Code

Generate type-safe Go code dari SQL queries:

```powershell
sqlc generate
```

Ini akan generate code di `internal/database/sqlc/`

### 5. Run Database Migrations

```powershell
go run cmd/server/main.go migrate
```

Migration files ada di `internal/database/migrations/`

### 6. Seed Database (Optional)

```powershell
go run cmd/server/main.go seed
```

### 7. Start Development Server

```powershell
# Normal mode
go run cmd/server/main.go

# Atau dengan hot reload (jika air terinstall)
air
```

## Project Structure

```
.
├── cmd/
│   └── server/
│       └── main.go                    # Application entry point
├── internal/
│   ├── config/                        # Configuration
│   ├── database/
│   │   ├── migrations/                # SQL migration files (golang-migrate)
│   │   │   ├── 000001_initial_schema.up.sql
│   │   │   └── 000001_initial_schema.down.sql
│   │   ├── queries/                   # SQL query files (sqlc)
│   │   │   ├── location.sql
│   │   │   ├── sparepart_master.sql
│   │   │   ├── contact_person.sql
│   │   │   ├── sparepart_stock.sql
│   │   │   └── tools_alker.sql
│   │   ├── sqlc/                      # Generated code (gitignored)
│   │   ├── db.go                      # Database connection pool
│   │   ├── migrate.go                 # Migration helpers
│   │   └── create_db.go               # Database creation
│   ├── handlers/                      # HTTP handlers (controllers)
│   ├── routes/                        # Route definitions
│   └── utils/                         # Utilities (logger, response, file upload)
├── sqlc.yaml                          # sqlc configuration
├── go.mod
├── go.sum
├── Makefile                           # Optional (untuk Linux/Mac)
└── .env.example
```

## Available Commands

### Development

```powershell
# Run server
go run cmd/server/main.go

# Run with hot reload (jika air terinstall)
air

# Build binary
go build -o sparepart-management-services.exe cmd/server/main.go
```

### Database

```powershell
# Run migrations
go run cmd/server/main.go migrate

# Rollback last migration
go run cmd/server/main.go migrate-down

# Seed database
go run cmd/server/main.go seed
```

### Code Generation

```powershell
# Generate sqlc code from SQL queries
sqlc generate
```

### Create New Migration

```powershell
# Create migration dengan nama
migrate create -ext sql -dir internal/database/migrations -seq migration_name

# Contoh:
migrate create -ext sql -dir internal/database/migrations -seq add_user_table
```

### Migration Files

- `*_up.sql`: Migration forward (apply changes)
- `*_down.sql`: Migration backward (rollback changes)

### Run Migrations

```powershell
# Apply all pending migrations
go run cmd/server/main.go migrate

# Rollback last migration
go run cmd/server/main.go migrate-down
```

## SQL Query Development (sqlc)

### Workflow

1. **Write SQL queries** di `internal/database/queries/*.sql`
2. **Generate Go code**: `sqlc generate`
3. **Use generated code** di handlers

### Example Query

```sql
-- name: GetLocation :one
SELECT * FROM location
WHERE id = $1 LIMIT 1;
```

After `sqlc generate`, use in Go:

```go
import "sparepart-management-services/internal/database/sqlc"

location, err := queries.GetLocation(ctx, id)
```

### Query Annotations

- `:one` - Returns single row
- `:many` - Returns multiple rows
- `:exec` - Executes without returning rows
- `:execrows` - Executes and returns affected rows count

## API Endpoints

- Health: `GET /health`
- API Base: `/api/v1/sparepart`

**Dokumentasi API:** Lihat Postman Collection di `JSPRO BAKTI API Collection.postman_collection.json`

## Performance & Concurrency

### Connection Pooling

Database connection pool dikonfigurasi untuk performa tinggi:
- Max connections: 25
- Min connections: 5
- Connection lifetime: 30 minutes
- Idle timeout: 5 minutes

### Best Practices

1. **Use context** untuk semua database operations
2. **Batch operations** menggunakan goroutines untuk operasi paralel
3. **Connection pooling** sudah dikonfigurasi otomatis
4. **Prepared statements** via sqlc untuk performa optimal

## Development Workflow

1. **Schema Changes**: 
   - Create migration: `migrate create -ext sql -dir internal/database/migrations -seq migration_name`
   - Write SQL in `*_up.sql` and `*_down.sql`
   - Run: `go run cmd/server/main.go migrate`

2. **Query Changes**:
   - Edit SQL in `internal/database/queries/*.sql`
   - Generate: `sqlc generate`
   - Update handlers to use generated code

3. **Code Changes**:
   - Edit handlers, routes, etc.
   - Test: `go run cmd/server/main.go` atau `air` (hot reload)

## Testing

### Quick Test Commands

```powershell
# 1. Setup environment
Copy-Item env.example .env
# Edit .env dengan database URL

# 2. Install dependencies
go mod tidy

# 3. Generate sqlc code
sqlc generate

# 4. Run migrations
go run cmd/server/main.go migrate

# 5. Seed database (optional)
go run cmd/server/main.go seed

# 6. Run server
go run cmd/server/main.go

# 7. Test health endpoint
Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET
```

### Testing Endpoints

```powershell
# Health check
Invoke-WebRequest -Uri "http://localhost:8080/health" -Method GET

# List locations
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sparepart/location?page=1&limit=10" -Method GET

# List sparepart stocks dengan filter
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sparepart/stock?region=maluku&page=1&limit=10" -Method GET

# Export PDF
Invoke-WebRequest -Uri "http://localhost:8080/api/v1/sparepart/stock/export/pdf?region=MALUKU" -Method GET -OutFile "export.pdf"
```

## Troubleshooting

### Migration Errors

```powershell
# Check migration version
go run cmd/server/main.go migrate-version

# Force version (if needed, hati-hati!)
# migrate -path internal/database/migrations -database "postgresql://..." force VERSION
```

### sqlc Generation Errors

- Pastikan SQL syntax valid
- Check `sqlc.yaml` configuration
- Verify query annotations (`:one`, `:many`, `:exec`)

### Connection Pool Issues

- Check database connection string di `.env`
- Verify PostgreSQL is running: `Get-Service -Name postgresql*`
- Check connection pool stats in logs

### Tools Not Found

Jika `migrate` atau `sqlc` tidak ditemukan:

```powershell
# Pastikan Go bin ada di PATH
$env:PATH += ";$env:USERPROFILE\go\bin"

# Reinstall tools
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Verifikasi
migrate -version
sqlc version
```

## Production Deployment

1. **Build binary**: `go build -o sparepart-management-services.exe cmd/server/main.go`
2. **Run migrations**: `go run cmd/server/main.go migrate`
3. **Start server**: `.\sparepart-management-services.exe`

## Documentation

- **README.md** - Overview dan setup dasar (file ini)
- **Makefile** - Optional, untuk Linux/Mac users yang menggunakan `make`

## License

Internal project - JSPRO BAKTI
