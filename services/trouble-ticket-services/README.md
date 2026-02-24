# Trouble Ticket Service

Service untuk mengelola data trouble ticket menggunakan **Golang** dengan arsitektur modern untuk performa dan concurrency tinggi.

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Language | Go 1.24+ |
| Framework | Gin (HTTP web framework) |
| Database | PostgreSQL 12+ |
| Driver | pgx/v5 (connection pooling) |
| Query | sqlc (type-safe SQL to Go) |
| Migration | golang-migrate |
| Logging | Zap (Uber's structured logger) |
| Hot Reload | Air |

## Prerequisites

- Go 1.24+
- PostgreSQL 12+
- `sqlc` CLI — `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`
- `golang-migrate` CLI — `go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest`

## Konfigurasi

Salin dan sesuaikan file `.env`:

```env
NODE_ENV=development
PORT=3006
HOST=0.0.0.0
LOG_LEVEL=info

# PostgreSQL connection string
TROUBLE_TICKET_DATABASE_URL=postgresql://postgres:password@localhost:5432/trouble_ticket_db?sslmode=disable

# External services
SITES_SERVICE_URL=http://localhost:3001
SLA_SERVICE_URL=http://localhost:3002
```

## Setup & Menjalankan

### 1. Install dependencies & tools

```bash
make setup
# Atau manual:
go mod download
go mod tidy
```

### 2. Generate sqlc code

```bash
make generate
# Atau: sqlc generate
```

### 3. Jalankan migrasi database

```bash
make migrate
# Atau: go run cmd/server/main.go migrate
```

> **Catatan:** Pastikan command dijalankan dari root folder service (tempat `go.mod` berada). Database akan dibuat otomatis jika belum ada.

### 4. Seed data default

```bash
make seed
# Atau: go run cmd/server/main.go seed
```

Data yang di-seed:
- **Type Ticket:** TT-Down, TT-Warning
- **Problem Master:** 17 masalah default (SNMP Down, Low Batt, SCC Problem, dst.)
- **PIC:** Sundaya, APT, VSAT

### 5. Jalankan server

```bash
# Development (tanpa hot reload)
make run
# Atau: go run cmd/server/main.go

# Development (dengan hot reload - butuh air)
make dev
# Atau: air

# Production build
make build
./trouble-ticket-services
```

Server berjalan di `http://localhost:3006`

## Perintah Makefile

| Command | Keterangan |
|---------|------------|
| `make setup` | Install tools + deps + generate sqlc |
| `make run` | Jalankan server |
| `make dev` | Jalankan dengan hot reload (air) |
| `make build` | Build binary |
| `make migrate` | Jalankan semua migrasi |
| `make migrate-down` | Rollback migrasi terakhir |
| `make seed` | Seed data default |
| `make generate` | Generate ulang sqlc code |
| `make clean` | Hapus binary dan folder tmp |

## Struktur Project

```
trouble-ticket-services/
├── cmd/server/
│   └── main.go                     # Entry point
├── internal/
│   ├── config/
│   │   └── config.go               # Konfigurasi env
│   ├── database/
│   │   ├── db.go                   # Connection pool pgx/v5
│   │   ├── create_db.go            # Auto-create database
│   │   ├── migrate.go              # golang-migrate
│   │   ├── migrations/
│   │   │   ├── 000001_initial_schema.up.sql
│   │   │   └── 000001_initial_schema.down.sql
│   │   ├── queries/                # SQL queries untuk sqlc
│   │   │   ├── type_ticket.sql
│   │   │   ├── problem_master.sql
│   │   │   ├── pic.sql
│   │   │   ├── trouble_ticket.sql
│   │   │   ├── trouble_ticket_problem.sql
│   │   │   └── trouble_ticket_progress.sql
│   │   └── sqlc/                   # Generated code (jangan diedit manual)
│   ├── handlers/
│   │   ├── type_ticket_handler.go
│   │   ├── problem_master_handler.go
│   │   ├── pic_handler.go
│   │   └── trouble_ticket_handler.go
│   ├── models/
│   │   ├── models.go               # Enum types
│   │   └── seed.go                 # Database seeder
│   ├── routes/
│   │   └── routes.go               # Route definitions
│   ├── services/
│   │   └── external.go             # HTTP client sites & sla services
│   └── utils/
│       ├── logger.go               # Zap logger
│       ├── response.go             # Response helpers
│       └── time.go                 # Time utilities
├── go.mod
├── go.sum
├── sqlc.yaml                       # sqlc configuration
├── Makefile
├── .env                            # Konfigurasi (jangan di-commit)
└── .air.toml                       # Hot reload config
```

## Database Schema

### Tabel

| Tabel | Keterangan |
|-------|------------|
| `type_ticket` | Master tipe tiket (TT-Down, TT-Warning) |
| `problem_master` | Master masalah yang sering terjadi |
| `pic` | Person In Charge (Sundaya, APT, VSAT) |
| `trouble_ticket` | Data utama trouble ticket |
| `trouble_ticket_problem` | Junction table ticket ↔ problem (many-to-many) |
| `trouble_ticket_progress` | History update progress tiket |

### Enum

```sql
ticket_status: 'progress' | 'closed' | 'pending'
```

## API Endpoints

Base URL: `http://localhost:3006`

### Health Check

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/health` | Status service |

### Type Ticket

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/v1/type-ticket` | List semua type ticket |
| GET | `/api/v1/type-ticket/:id` | Detail type ticket |
| POST | `/api/v1/type-ticket` | Buat type ticket baru |
| PUT | `/api/v1/type-ticket/:id` | Update type ticket |
| DELETE | `/api/v1/type-ticket/:id` | Hapus type ticket |

### Problem Master

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/v1/problem-master` | List semua problem master |
| GET | `/api/v1/problem-master/:id` | Detail problem master |
| POST | `/api/v1/problem-master` | Buat problem master baru |
| PUT | `/api/v1/problem-master/:id` | Update problem master |
| DELETE | `/api/v1/problem-master/:id` | Hapus problem master |

### PIC

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/v1/pic` | List semua PIC |
| GET | `/api/v1/pic/:id` | Detail PIC |
| POST | `/api/v1/pic` | Buat PIC baru |
| PUT | `/api/v1/pic/:id` | Update PIC |
| DELETE | `/api/v1/pic/:id` | Hapus PIC |

### Trouble Ticket

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/v1/trouble-ticket` | Buat trouble ticket baru |
| GET | `/api/v1/trouble-ticket` | List semua trouble ticket |
| GET | `/api/v1/trouble-ticket/refresh` | Refresh data SLA dari sla-services |
| GET | `/api/v1/trouble-ticket/progress/:ticketNumber` | Detail tiket + history progress |
| PUT | `/api/v1/trouble-ticket/progress/:ticketNumber` | Tambah update progress |
| PUT | `/api/v1/trouble-ticket/:ticketNumber` | Tutup trouble ticket |

## Format Request & Response

### Response Sukses

```json
{
  "status": "success",
  "message": "deskripsi pesan sukses",
  "data": {}
}
```

### Response Error

```json
{
  "status": "error",
  "message": "deskripsi pesan error"
}
```

## Contoh Request

### POST /api/v1/trouble-ticket

```json
{
  "ticketType": 1,
  "dateDown": "2025-01-15",
  "siteId": "SITE001",
  "problemId": [1, 2],
  "picId": 1,
  "planCM": "Rencana perbaikan: ganti modem VSAT",
  "action": "Pengecekan awal, ditemukan modem VSAT mati"
}
```

### PUT /api/v1/trouble-ticket/progress/:ticketNumber

```json
{
  "date": "2025-01-16",
  "action": "Teknisi sudah tiba di lokasi, sedang melakukan pengecekan"
}
```

### PUT /api/v1/trouble-ticket/:ticketNumber (Close)

```json
{
  "status": "closed",
  "date": "2025-01-20",
  "action": "Modem VSAT berhasil diganti, site sudah kembali normal"
}
```

### GET /api/v1/trouble-ticket?status=progress&ticketType=1

Query params (opsional):
- `status` — `progress` | `closed` | `pending`
- `ticketType` — `1` (TT-Down) | `2` (TT-Warning)

## External Services

Service ini bergantung pada dua service eksternal:

| Service | URL | Data yang diambil |
|---------|-----|-------------------|
| sites-services | `http://localhost:3001` | siteName, province, batteryVersion, contactPerson |
| sla-services | `http://localhost:3002` | slaAverage per bulan |

- SLA average diambil saat **membuat tiket** (untuk bulan berjalan) dan bisa di-refresh via endpoint `/refresh`
- Data site diambil **real-time** saat mengakses list tiket

## Menambah Migrasi Baru

```bash
make migrate-create
# Masukkan nama migrasi, contoh: add_closed_at_to_trouble_ticket
```

Akan membuat dua file baru:
- `internal/database/migrations/000002_add_closed_at_to_trouble_ticket.up.sql`
- `internal/database/migrations/000002_add_closed_at_to_trouble_ticket.down.sql`

Edit kedua file, lalu jalankan `make migrate`.

## Menambah Query Baru (sqlc)

1. Tambah query SQL di file yang sesuai di `internal/database/queries/`
2. Jalankan `make generate` untuk regenerate Go code
3. Gunakan method baru di handler

## Postman Collection

Dokumentasi API tersedia di Postman Collection:
`JSPRO BAKTI API Collection.postman_collection.json`

Variable Postman: `{{TROUBLE_TICKET_URL}}` = `http://localhost:3006`
