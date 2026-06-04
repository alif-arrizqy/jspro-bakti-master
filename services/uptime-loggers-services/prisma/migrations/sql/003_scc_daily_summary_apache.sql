-- SCC: hypertable (Apache license) + daily summary tanpa continuous aggregate.
-- Prasyarat: tabel scc_data.scc_data_loggers sudah ada.
-- Jalankan setelah 001 (battery). Lihat prisma/migrations/sql/README.md

-- 1. Fix PRIMARY KEY (TS103) + hypertable
ALTER TABLE scc_data.scc_data_loggers
    DROP CONSTRAINT IF EXISTS scc_data_loggers_pkey;

ALTER TABLE scc_data.scc_data_loggers
    ADD PRIMARY KEY (timestamp, id);

SELECT create_hypertable(
    'scc_data.scc_data_loggers',
    'timestamp',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 2. Tabel summary (public schema, sama pola battery_daily_summary)
CREATE TABLE IF NOT EXISTS scc_daily_summary (
    site_id                 VARCHAR(20)     NOT NULL,
    day                     DATE            NOT NULL,
    last_update             TIMESTAMPTZ     NOT NULL,
    total_logs_received     BIGINT          NOT NULL,
    last_battery_voltage    DOUBLE PRECISION,
    last_pv1_voltage        DOUBLE PRECISION,
    last_pv1_current        DOUBLE PRECISION,
    last_load1              DOUBLE PRECISION,
    PRIMARY KEY (site_id, day)
);

CREATE INDEX IF NOT EXISTS idx_scc_daily_summary_day
    ON scc_daily_summary (day DESC);

CREATE OR REPLACE FUNCTION refresh_scc_daily_summary(
    p_from DATE DEFAULT NULL,
    p_to   DATE DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO scc_daily_summary (
        site_id,
        day,
        last_update,
        total_logs_received,
        last_battery_voltage,
        last_pv1_voltage,
        last_pv1_current,
        last_load1
    )
    SELECT
        site_id,
        (timestamp AT TIME ZONE 'UTC')::date AS day,
        MAX(timestamp) AS last_update,
        COUNT(*)::bigint AS total_logs_received,
        (
            array_agg(battery_voltage ORDER BY timestamp DESC)
            FILTER (WHERE battery_voltage IS NOT NULL)
        )[1] AS last_battery_voltage,
        (
            array_agg(pv1_voltage ORDER BY timestamp DESC)
            FILTER (WHERE pv1_voltage IS NOT NULL)
        )[1] AS last_pv1_voltage,
        (
            array_agg(pv1_current ORDER BY timestamp DESC)
            FILTER (WHERE pv1_current IS NOT NULL)
        )[1] AS last_pv1_current,
        (
            array_agg(load1 ORDER BY timestamp DESC)
            FILTER (WHERE load1 IS NOT NULL)
        )[1] AS last_load1
    FROM scc_data.scc_data_loggers
    WHERE (p_from IS NULL OR timestamp >= p_from::timestamptz)
      AND (p_to IS NULL OR timestamp < (p_to + 1)::date::timestamptz)
    GROUP BY site_id, (timestamp AT TIME ZONE 'UTC')::date
    ON CONFLICT (site_id, day) DO UPDATE SET
        last_update = EXCLUDED.last_update,
        total_logs_received = EXCLUDED.total_logs_received,
        last_battery_voltage = EXCLUDED.last_battery_voltage,
        last_pv1_voltage = EXCLUDED.last_pv1_voltage,
        last_pv1_current = EXCLUDED.last_pv1_current,
        last_load1 = EXCLUDED.last_load1;
END;
$$;

-- Backfill
SELECT refresh_scc_daily_summary(NULL, NULL);
