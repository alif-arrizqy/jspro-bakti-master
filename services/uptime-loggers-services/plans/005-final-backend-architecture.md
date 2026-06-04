# Final Draft: Arsitektur Backend Uptime & Loggers Monitoring

Dokumen ini memetakan kebutuhan **backend** untuk dasbor **Uptime & Loggers** pada `ecc-master-dash`. Implementasi sebagai **satu** microservice `uptime-loggers-services` di monorepo `jspro-bakti-master`.

**Status:** spesifikasi final — implementasi kode mengikuti dokumen ini.

---

## 0. Keputusan arsitektur (fix)

| Topik | Keputusan |
|-------|-----------|
| Nama service | `uptime-loggers-services` — **bukan** `monitoring-services` (itu NMS site up/down), **bukan** `connectivity-probe-services` |
| Database | Satu `data_loggers_db` + TimescaleDB — **bukan** multi DB APT1/APT2/TA5 |
| Uptime % | Continuous aggregate Timescale — **tanpa** loop raw rows di Node |
| Pulling logs | Redis Streams `logger:stream:{siteId}` (`loggers-apt`, `loggers-talis`) |
| Battery voltage | `battery_data_loggers.pack_voltage` (mV) → API `batteryVoltageV` (Volt) |
| Ping latency | Modul internal (file + cron job), TCP/ICMP ke IP site — **bukan** SNMP OID |
| Probe | Job async + cache Redis — **bukan** ping sinkron di `GET /uptime/sites` |
| Master data site | Merge ~81 site dari `sites-services` (site tanpa log tetap tampil) |
| Grafana | `grafanaUrl` per site; trend chart hanya di Grafana |
| Frontend | `VITE_UPTIME_LOGGERS_URL` terpisah dari `VITE_MONITORING_SERVICES_URL` |

### Dua sinyal independen (kartu site)

- **Logger hidup/mati:** `lastUpdate` — realtime online jika update dalam **2 jam**.
- **Jaringan:** `pingLatencyMs` + `connectivityReachable` — dari probe job (bukan dari tabel logger).

---

## 1. Kebutuhan endpoint frontend

UI `ecc-master-dash` punya dua tab. Semua endpoint memakai prefix `/api/v1/monitoring/...` dan response envelope:

```json
{ "success": true, "data": {}, "pagination": {}, "meta": {} }
```

Juga: `GET /health`, Swagger `/docs`.

### A. Tab Site Uptime

Grid ~81 site + summary cards.

#### `GET /api/v1/monitoring/uptime/summary`

| Query | Keterangan |
|-------|------------|
| `date` | `YYYY-MM-DD`, default hari ini |

**Response `data`:**

```typescript
{
  totalSites: number;
  avgUptime: number;
  mode: 'realtime' | 'historical';
  // mode realtime (date = today)
  onlineCount?: number;   // lastUpdate dalam 2 jam
  offlineCount?: number;
  // mode historical
  healthyCount?: number;  // uptimePercentage === 100
  warningCount?: number;  // (70, 100)
  criticalCount?: number; // <= 70
}
```

#### `GET /api/v1/monitoring/uptime/sites`

| Query | Keterangan |
|-------|------------|
| `date` | `YYYY-MM-DD`, default today |
| `batteryType` | `all` \| `jspro` \| `talis5` |
| `search` | opsional — filter siteId/siteName |
| `uptimeHealth` | opsional — `100` \| `95` \| `70` (selaras filter UI) |

**Response `data`:** array site:

```typescript
{
  siteId: string;
  siteName: string;
  batteryType: 'jspro' | 'talis5';
  lastUpdate: string | null;           // ISO
  uptimePercentage: number;
  uptimeDuration: string | null;       // format "Xh Ym", dihitung backend
  status: 'online' | 'offline' | 'healthy' | 'warning' | 'critical';
  batteryVoltageV: number | null;      // pack_voltage (mV) / 1000
  pingLatencyMs: number | null;
  connectivityReachable: boolean;
  connectivityProbedAt: string | null; // ISO
  grafanaUrl: string | null;
}
```

**Aturan `status`:**

- **Realtime** (`date` = today): `online` jika `lastUpdate` < 2 jam, else `offline`.
- **Historical**: `healthy` (100%), `warning` ((70, 100)), `critical` (≤ 70).

**Opsional (dev):** `POST /api/v1/monitoring/uptime/probe/run` — trigger manual connectivity job.

### B. Tab Pulling Logs Status

#### `GET /api/v1/monitoring/pulling-logs/summary`

| Query | `date` |
| Response | `totalLogs`, `successCount`, `failedCount`, `successRate` |

#### `GET /api/v1/monitoring/pulling-logs`

| Query | `date`, `batteryType`, `result` (`success`\|`failed`), `search`, `page`, `limit` |
| Response | array log + `pagination` `{ page, limit, total, totalPages }` |

**Log item:**

```typescript
{
  id: string;              // Redis stream entry id
  timestamp: string;
  siteId: string;
  siteName: string;
  batteryType: 'jspro' | 'talis5';
  result: 'success' | 'failed';
  errorMessage?: string;
}
```

---

## 2. TimescaleDB & agregasi uptime

Data logger sangat besar. **Dilarang** agregasi uptime dengan loop JS di raw table.

### A. Setup

1. **Hypertable** pada `battery_data.battery_data_loggers` dan `scc_data.scc_data_loggers` (kolom `timestamp`).
2. **Continuous aggregates** — SQL manual di `prisma/migrations/sql/` (jangan `prisma db push` untuk hypertable/CAGG).
3. **Refresh policy** Timescale + dokumentasi di README service.

### B. `battery_daily_summary`

```sql
CREATE MATERIALIZED VIEW battery_daily_summary
WITH (timescaledb.continuous) AS
SELECT
    site_id,
    time_bucket('1 day'::interval, timestamp) AS day,
    MAX(timestamp) AS last_update,
    COUNT(*) AS total_logs_received,
    last(pack_voltage, timestamp) AS last_pack_voltage_mv
FROM battery_data.battery_data_loggers
GROUP BY site_id, day;
```

Buat analog `scc_daily_summary` jika uptime per site menggabungkan sumber SCC.

### C. Rumus `uptimePercentage`

- Env `EXPECTED_LOGS_PER_DAY` (default **240**, selaras interval pulling ~6 menit).
- `uptimePercentage = min(100, round(total_logs_received / EXPECTED_LOGS_PER_DAY * 100))`.

Query historis (ringan):

```typescript
const rows = await prisma.$queryRaw`
  SELECT site_id, last_update, total_logs_received, last_pack_voltage_mv
  FROM battery_daily_summary
  WHERE day = ${targetDate}::date
`;
```

### D. Voltage realtime (hari ini)

Nilai terakhir per `site_id` via index `idx_battery_site_timestamp` (`DISTINCT ON` / query latest) atau CAGG bucket pendek — hindari full table scan.

`batteryVoltageV = last_pack_voltage_mv != null ? round(last_pack_voltage_mv / 1000, 1) : null`

---

## 3. Postgres, Redis, sites-services

### Prisma (`data_loggers_db`)

- Schema adapt dari `data-processing/prisma/data-loggers/schema.prisma`.
- Materialized view **tidak** dimodelkan di `schema.prisma`; akses via `$queryRaw` saja.

### Redis (ioredis)

| Key / pola |用途 |
|------------|-----|
| `logger:stream:{siteId}` | Pulling logs (XRANGE / XREVRANGE) |
| `logger:sites` | Set site id (fallback scan `logger:stream:*`) |
| `connectivity:latest:{siteId}` | Snapshot probe: `latencyMs`, `reachable`, `probedAt`, `targetIp`, `probeMethod` |

Pulling logs hari ini dari Redis; tidak wajib query Postgres untuk tab logs.

### sites-services

- `SITES_SERVICES_URL` — daftar master site + `ip_snmp`, `ip_gw_gs` (detail site).
- Cache TTL configurable.
- **Merge:** semua site master left-join uptime DB + Redis probe; site tanpa log → `uptimePercentage` 0, `lastUpdate` null, status offline/critical sesuai mode.

Mapping `batteryType`: normalisasi ke `jspro` | `talis5` (dari label legacy APT/Talis).

---

## 4. Grafana

- Tidak ada chart trend di `ecc-master-dash` untuk tegangan/arus.
- Backend set `grafanaUrl` per site dari env:
  - `GRAFANA_BASE_URL` — mis. `http://grafana.sundaya.local/d/site-analysis/`
  - `GRAFANA_SITE_VAR` — default `SiteID`
- Contoh: `{GRAFANA_BASE_URL}?var-{GRAFANA_SITE_VAR}={siteId}`
- FE: klik kartu site → `window.open(grafanaUrl)`.

Setup Grafana: data source PostgreSQL `data_loggers_db` dengan toggle TimescaleDB; variabel dashboard `$SiteID`.

---

## 5. Migrasi dari `monitoring-api` (legacy)

Lokasi: `pulling-loggers/monitoring-api/src`.

| Adapt (keep) | Buang (discard) |
|--------------|-----------------|
| `parseFields`, Redis `logger:stream:{siteId}`, `logger:sites` | Loop `collectRawRows` / `buildSiteRows` di JS |
| `getMasterSites` + cache | Express routing manual `server.ts` |
| Mapping battery JSPro / Talis5 | Tiga `PrismaClient` APT1/APT2/TA5 |
| Konsep slot/hari → `EXPECTED_LOGS_PER_DAY` | Debug `fetch` ingest di `server.ts` |

---

## 6. Struktur microservice

```text
jspro-bakti-master/services/uptime-loggers-services/
├── plans/005-final-backend-architecture.md
├── package.json
├── .env.example
├── prisma/data-loggers/
├── prisma/migrations/sql/          # Timescale: hypertable, CAGG
└── src/
    ├── app.ts
    ├── config/env.ts
    ├── routes/monitoring.routes.ts
    ├── controllers/
    │   ├── uptime.controller.ts
    │   └── pulling-logs.controller.ts
    ├── services/
    │   ├── timescale.service.ts
    │   ├── redis-queue.service.ts
    │   ├── sites-client.service.ts
    │   ├── connectivity-probe.service.ts
    │   └── connectivity-snapshot.service.ts
    ├── jobs/connectivity-probe.job.ts
    └── schemas/
```

### Arsitektur runtime

```mermaid
flowchart TB
  FE[ecc_master_dash]
  subgraph svc [uptime_loggers_services :8882]
    API[Fastify]
    Uptime[uptime_controller]
    Pull[pulling_logs_controller]
    TS[timescale_service]
    RedisLog[redis_queue_service]
    Sites[sites_client]
    Job[connectivity_probe_job]
    Probe[connectivity_probe_service]
    Snap[connectivity_snapshot_service]
  end
  PG[(data_loggers_db)]
  Redis[(Redis)]
  SitesAPI[sites_services]

  FE --> API
  API --> Uptime
  API --> Pull
  Uptime --> TS
  Uptime --> Sites
  Uptime --> Snap
  Pull --> RedisLog
  Job --> Probe
  Probe --> Sites
  Probe --> Snap
  Snap --> Redis
  RedisLog --> Redis
  TS --> PG
  Sites --> SitesAPI
```

---

## 7. Environment

```env
# Application
PORT=8882

DATABASE_URL=postgresql://postgres:password@localhost:5432/data_loggers_db
REDIS_URL=redis://127.0.0.1:6379

DEFAULT_LOG_LIMIT=50
MAX_QUERY_LIMIT=300
SUMMARY_SAMPLE_LIMIT_PER_SITE=50
DB_STATEMENT_TIMEOUT_MS=15000
EXPECTED_LOGS_PER_DAY=240

# Sites Services
SITES_SERVICES_URL=http://localhost:3001/api/v1/sites
SITES_SERVICES_TIMEOUT_MS=6000
SITES_SERVICES_CACHE_TTL_MS=120000

CORS_ORIGINS=http://localhost:8080,http://localhost:5173

# Grafana
GRAFANA_BASE_URL=http://grafana.sundaya.local/d/site-analysis/
GRAFANA_SITE_VAR=SiteID

# Connectivity probe (modul internal — bukan service terpisah)
CONNECTIVITY_PROBE_ENABLED=true
CONNECTIVITY_PROBE_INTERVAL_MS=180000
CONNECTIVITY_PROBE_TIMEOUT_MS=3000
CONNECTIVITY_PROBE_CONCURRENCY=10
CONNECTIVITY_PROBE_MODE=tcp
CONNECTIVITY_PROBE_TCP_PORT=161
CONNECTIVITY_CACHE_TTL_MS=300000
```

---

## 8. Tech stack

| Komponen | Versi / pilihan |
|----------|-----------------|
| Bahasa | TypeScript |
| HTTP | Fastify 5.6.2 |
| ORM | Prisma 7.1.0 |
| DB | PostgreSQL + TimescaleDB extension |
| Cache / streams | ioredis 5.8.2 |
| Validasi | Zod 4.1.13 |
| Scheduler probe | node-cron |

**Konvensi API:** `{ success, data, pagination?, meta? }`, CORS termasuk Vite dev `localhost:5173`.

---

## 9. Battery voltage (`batteryVoltageV`)

| Aspek | Detail |
|-------|--------|
| Kolom | `battery_data.battery_data_loggers.pack_voltage` — integer **mV** (contoh `5340` = 53,4 V) |
| API | `batteryVoltageV: number \| null` — `round(pack_voltage / 1000, 1)` |
| Historis | `last_pack_voltage_mv` dari `battery_daily_summary` untuk `date` |
| Realtime | Latest row per `site_id` (index `idx_battery_site_timestamp`) |
| Tanpa data | `null` (bukan `0`) |

---

## 10. Connectivity probe (`pingLatencyMs`, `reachable`)

Modul **internal** `uptime-loggers-services` — **bukan** microservice terpisah, **bukan** SNMP GET/WALK OID.

| Aspek | Detail |
|-------|--------|
| File | `connectivity-probe.service.ts`, `connectivity-snapshot.service.ts`, `jobs/connectivity-probe.job.ts` |
| Target IP | `ip_snmp` dari sites-services → fallback `ip_gw_gs` |
| Metode | Default **TCP connect** ke port `161`; alternatif **ICMP** via `CONNECTIVITY_PROBE_MODE=icmp` |
| Eksekusi | Cron interval `CONNECTIVITY_PROBE_INTERVAL_MS`; concurrency `CONNECTIVITY_PROBE_CONCURRENCY` |
| Storage | Redis `connectivity:latest:{siteId}` |
| API | Data di-merge ke `GET .../uptime/sites` saja — **tidak** wajib route `/connectivity/*` |
| Tanpa IP | `pingLatencyMs: null`, `connectivityReachable: false` |

Port 161 = cek **reachability** layanan SNMP, bukan membaca OID.

---

## 11. Integrasi frontend `ecc-master-dash`

1. Env `VITE_UPTIME_LOGGERS_URL` → `uptimeLoggersApiClient` (terpisah dari `monitoringApiClient`).
2. `features/monitoring/services/uptime-loggers.api.ts`.
3. Ganti dummy `uptimeDummyData.ts` di `SiteUptimeTab`, `PullingLogsTab`.
4. Mapping: `batteryVoltage` ← `batteryVoltageV`, `pingLatency` ← `pingLatencyMs`.
5. `PullingLogsTab`: DatePicker + pagination.
6. Klik kartu → buka `grafanaUrl`.

---

## 12. Out of scope MVP

- Microservice `connectivity-probe-services`
- SNMP OID / trap monitoring
- Chart trend di ecc-master-dash
- Deprecate legacy `monitoring-api` (setelah parity endpoint)
- Auth khusus service (ikuti API gateway / pola service lain)

---

## 13. Urutan implementasi

1. Scaffold `uptime-loggers-services` (Fastify, env, health, Swagger)
2. SQL Timescale (hypertable, CAGG, refresh policy)
3. Core services (Prisma, Timescale, Sites client, Redis pulling logs)
4. Modul connectivity probe (job + Redis snapshot)
5. Empat endpoint API + merge 81 sites
6. Wiring `ecc-master-dash`
