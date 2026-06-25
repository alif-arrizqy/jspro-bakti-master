-- TimescaleDB Setup for uptime-loggers-services
-- Run manually via DBeaver / psql — NOT via prisma db push
-- Prerequisites: TimescaleDB extension enabled on data_loggers_db

-- 1. Enable TimescaleDB extension (if not already)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Fix PRIMARY KEY for Timescale (TS103)
-- Prisma creates PK on "id" only; hypertable requires "timestamp" in every UNIQUE/PK.
-- Run once. See prisma/migrations/sql/README.md
ALTER TABLE battery_data.battery_data_loggers
    DROP CONSTRAINT IF EXISTS battery_data_loggers_pkey;

ALTER TABLE battery_data.battery_data_loggers
    ADD PRIMARY KEY (timestamp, id);

-- 3. Convert battery_data_loggers to hypertable
-- CAUTION: Only run if table is NOT already a hypertable
SELECT create_hypertable(
    'battery_data.battery_data_loggers',
    'timestamp',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 4. SCC hypertable + summary → jalankan 003_scc_daily_summary_apache.sql
--    (hypertable, PK fix, tabel scc_daily_summary — Apache license)

-- 5–7. Continuous aggregate (Timescale License / Community Edition ONLY)
-- Jika error: "not supported under the current apache license"
--   → JANGAN jalankan blok ini. Gunakan 002_battery_daily_summary_apache.sql
--
-- CREATE MATERIALIZED VIEW IF NOT EXISTS battery_daily_summary
-- WITH (timescaledb.continuous) AS
-- SELECT
--     site_id,
--     time_bucket('1 day'::interval, timestamp) AS day,
--     MAX(timestamp) AS last_update,
--     COUNT(*) AS total_logs_received,
--     last(pack_voltage, timestamp) AS last_pack_voltage_mv
-- FROM battery_data.battery_data_loggers
-- GROUP BY site_id, time_bucket('1 day'::interval, timestamp)
-- WITH NO DATA;
--
-- SELECT add_continuous_aggregate_policy('battery_daily_summary',
--     start_offset => INTERVAL '3 days',
--     end_offset => INTERVAL '1 hour',
--     schedule_interval => INTERVAL '1 hour',
--     if_not_exists => TRUE
-- );
--
-- CALL refresh_continuous_aggregate('battery_daily_summary', NULL, localtimestamp);
