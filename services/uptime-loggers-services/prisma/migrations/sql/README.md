# TimescaleDB — setup manual `data_loggers_db`

Jalankan script di folder ini lewat **psql** atau **DBeaver**, bukan `prisma db push`.

## Urutan

1. `001_timescale_setup.sql` — extension + hypertable **battery** (CAGG dikomentari)
2. **`002_battery_daily_summary_apache.sql`** — summary battery (lisensi **apache**)
3. **`003_scc_daily_summary_apache.sql`** — hypertable + summary **SCC** (jika tabel `scc_data_loggers` ada)
4. Atau uncomment CAGG di `001` jika pakai **Timescale Community Edition** (TSL, self-hosted)
5. Verifikasi di bawah

## Error: `not supported under the current "apache" license`

**Penyebab:** Continuous aggregate (`WITH (timescaledb.continuous)`) dan `add_continuous_aggregate_policy` hanya ada di **Timescale License** (Community/Enterprise). Build/extension **Apache-only** (Azure PG, banyak cloud, beberapa paket apt) hanya mendukung **hypertable** + `time_bucket`, bukan CAGG.

**Solusi A (disarankan di environment Anda):** Jalankan `002_battery_daily_summary_apache.sql`

- Membuat **tabel** `battery_daily_summary` (nama sama → API/Grafana tidak perlu diubah)
- Fungsi `refresh_battery_daily_summary(from, to)` untuk backfill/refresh

Refresh berkala (contoh pg_cron atau cron sistem, tiap jam):

```sql
SELECT refresh_battery_daily_summary(
    (CURRENT_DATE - INTERVAL '3 days')::date,
    CURRENT_DATE
);

SELECT refresh_scc_daily_summary(
    (CURRENT_DATE - INTERVAL '3 days')::date,
    CURRENT_DATE
);
```

**Solusi B:** Pasang TimescaleDB **Community Edition** (Docker/VM sendiri), bukan Apache-only dari cloud — lalu uncomment CAGG di `001`.

Cek lisensi:

```sql
SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';
-- Di sesi yang sama, coba create_hypertable sudah OK = hypertable didukung
```

## Error TS103: `cannot create a unique index without the column "timestamp"`

**Penyebab:** Tabel `battery_data.battery_data_loggers` punya **PRIMARY KEY hanya pada `id`** (dari Prisma `@id`). TimescaleDB mempartisi menurut `timestamp`; setiap constraint **UNIQUE** (termasuk PK) harus menyertakan kolom partisi.

**Perbaikan** (jalankan **sebelum** `create_hypertable`, sekali saja):

```sql
-- Cek constraint yang ada
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'battery_data.battery_data_loggers'::regclass;

-- Hapus PK lama (nama bisa beda; sesuaikan jika bukan battery_data_loggers_pkey)
ALTER TABLE battery_data.battery_data_loggers
  DROP CONSTRAINT IF EXISTS battery_data_loggers_pkey;

-- PK baru: wajib sertakan timestamp
ALTER TABLE battery_data.battery_data_loggers
  ADD PRIMARY KEY (timestamp, id);

-- Baru convert hypertable
SELECT create_hypertable(
    'battery_data.battery_data_loggers',
    'timestamp',
    if_not_exists => TRUE,
    migrate_data => TRUE
);
```

**Catatan Prisma:** Di DB, PK menjadi `(timestamp, id)`. Model Prisma masih `@id` pada `id` — insert/select biasanya tetap jalan. Hindari `findUnique`/`upsert` hanya by `id` jika DB tidak punya unique tunggal pada `id`. Untuk jangka panjang bisa sinkronkan schema ke `@@id([timestamp, id])`.

**SCC:** Jalankan `003_scc_daily_summary_apache.sql` (PK + hypertable + `scc_daily_summary`).

## Peringatan `character varying` (bukan error)

Pesan seperti *column type "character varying" used for "site_id" does not follow best practices* hanya **saran Timescale** (lebih disarankan `text` untuk kolom non-indeks). Boleh diabaikan; tidak menghalangi `create_hypertable`.

## `extension "timescaledb" already exists, skipping`

Normal jika extension sudah pernah dibuat.

## Verifikasi hypertable

```sql
SELECT hypertable_schema, hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name IN ('battery_data_loggers', 'scc_data_loggers');
```

## Summary kosong / perlu refresh ulang

**Apache fallback:**

```sql
SELECT refresh_battery_daily_summary(NULL, NULL);
SELECT refresh_scc_daily_summary(NULL, NULL);
```

**Continuous aggregate (TSL):**

```sql
CALL refresh_continuous_aggregate('battery_daily_summary', NULL, localtimestamp);
```

## Lokasi file terkait

| File | Fungsi |
|------|--------|
| `001_timescale_setup.sql` | Battery hypertable |
| `002_battery_daily_summary_apache.sql` | Summary battery (Apache) |
| `003_scc_daily_summary_apache.sql` | Hypertable + summary SCC (Apache) |
| `../data-loggers/schema.prisma` | Skema Prisma (bukan hypertable) |
| `../../plans/005-final-backend-architecture.md` | Arsitektur uptime API |
| `../../grafana/README.md` | Dashboard Grafana (butuh hypertable + data) |
