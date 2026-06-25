# Grafana — Site Analysis

Dashboard template untuk analisis trend data logger per site (`data_loggers_db` / TimescaleDB).

Integrasi dengan **ecc-master-dash**: klik kartu site → URL dari `uptime-loggers-services` (`GRAFANA_BASE_URL` + `?var-SiteID=...`).

## Isi folder

| Path | Keterangan |
|------|------------|
| `dashboards/site-analysis.json` | Dashboard siap import (UID: `site-analysis`, variable: `SiteID`) |
| `provisioning/datasources/data-loggers.postgres.example.yaml` | Contoh datasource PostgreSQL + TimescaleDB |
| `provisioning/dashboards/dashboards.yaml` | Provider file-based dashboards |

## Panel di dashboard

- Last update, SOC (latest), log count (range)
- Pack voltage (V) — `time_bucket` 5 menit, `pack_voltage` mV → /1000
- Pack current, SOC — time series
- Logs per hour
- Daily logs — dari `battery_daily_summary` (continuous aggregate)

## Prasyarat database

1. TimescaleDB + hypertable: jalankan [`prisma/migrations/sql/001_timescale_setup.sql`](../prisma/migrations/sql/001_timescale_setup.sql)
2. Data di `battery_data.battery_data_loggers`
3. User read-only untuk Grafana (contoh):

```sql
CREATE USER grafana_reader WITH PASSWORD 'your_password';
GRANT CONNECT ON DATABASE data_loggers_db TO grafana_reader;
GRANT USAGE ON SCHEMA battery_data, scc_data TO grafana_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA battery_data, scc_data TO grafana_reader;
```

## Opsi A: Import lewat UI (disarankan pertama kali)

1. Grafana → **Connections** → **Data sources** → **PostgreSQL**
   - Database: `data_loggers_db`
   - **TimescaleDB**: ON
   - User: `grafana_reader`
2. **Dashboards** → **Import** → upload `dashboards/site-analysis.json`
3. Pilih datasource PostgreSQL saat diminta
4. Salin URL dashboard (tanpa query), contoh:
   `http://grafana.sundaya.local/d/site-analysis/site-analysis`
5. Set di `uptime-loggers-services/.env`:

```env
GRAFANA_BASE_URL=http://grafana.sundaya.local/d/site-analysis/site-analysis
GRAFANA_SITE_VAR=SiteID
```

Restart service → klik kartu site di ecc-master-dash harus membuka Grafana dengan `SiteID` terisi.

## Opsi B: Provisioning di server

1. Copy `provisioning/datasources/data-loggers.postgres.example.yaml` → `/etc/grafana/provisioning/datasources/data-loggers.postgres.yaml` (isi host/user/password)
2. Copy `provisioning/dashboards/dashboards.yaml` → `/etc/grafana/provisioning/dashboards/`
3. Copy `dashboards/site-analysis.json` → `/etc/grafana/dashboards/uptime-loggers/` (sesuaikan path di `dashboards.yaml` jika perlu)
4. Restart Grafana

Datasource provisioning memakai **uid** `data-loggers-timescale` dan nama `DataLoggers-Timescale`. Setelah import manual, pastikan panel memakai datasource yang sama atau re-import JSON.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Grafik kosong | Pilih `SiteID` yang punya data; perluas time range |
| Variable SiteID kosong | Tabel `battery_data_loggers` belum berisi data |
| Panel daily logs kosong | Apache: `SELECT refresh_battery_daily_summary(NULL, NULL);` — TSL: `CALL refresh_continuous_aggregate(...)` |
| Link dari dash tidak buka Grafana | Cek `GRAFANA_BASE_URL` dan DNS/VPN ke `grafana.sundaya.local` |
| Query lambat | Perpendek range waktu; pastikan hypertable aktif |

## SCC / PV (tahap berikutnya)

Aktifkan hypertable `scc_data.scc_data_loggers` di SQL setup, lalu tambah panel dari schema `scc_data` (PV current/voltage, load).
