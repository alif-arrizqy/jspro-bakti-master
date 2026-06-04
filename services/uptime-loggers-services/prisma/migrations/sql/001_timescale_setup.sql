-- TimescaleDB Setup for uptime-loggers-services
-- Run manually via DBeaver / psql — NOT via prisma db push
-- Prerequisites: TimescaleDB extension enabled on data_loggers_db

-- 1. Enable TimescaleDB extension (if not already)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert battery_data_loggers to hypertable
-- CAUTION: Only run if table is NOT already a hypertable
SELECT create_hypertable(
    'battery_data.battery_data_loggers',
    'timestamp',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 3. Convert scc_data_loggers to hypertable (if table exists)
-- SELECT create_hypertable(
--     'scc_data.scc_data_loggers',
--     'timestamp',
--     if_not_exists => TRUE,
--     migrate_data => TRUE
-- );

-- 4. Create continuous aggregate: battery_daily_summary
CREATE MATERIALIZED VIEW IF NOT EXISTS battery_daily_summary
WITH (timescaledb.continuous) AS
SELECT
    site_id,
    time_bucket('1 day'::interval, timestamp) AS day,
    MAX(timestamp) AS last_update,
    COUNT(*) AS total_logs_received,
    last(pack_voltage, timestamp) AS last_pack_voltage_mv
FROM battery_data.battery_data_loggers
GROUP BY site_id, time_bucket('1 day'::interval, timestamp)
WITH NO DATA;

-- 5. Add refresh policy: refresh last 3 days every hour
SELECT add_continuous_aggregate_policy('battery_daily_summary',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- 6. Initial refresh to backfill data
CALL refresh_continuous_aggregate('battery_daily_summary', NULL, localtimestamp);
