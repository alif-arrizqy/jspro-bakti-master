-- Fallback untuk TimescaleDB "apache" license (tanpa continuous aggregate).
-- Jalankan INI menggantikan langkah 5–7 di 001_timescale_setup.sql.
-- API & Grafana tetap membaca FROM battery_daily_summary.

CREATE TABLE IF NOT EXISTS battery_daily_summary (
    site_id                 VARCHAR(20)  NOT NULL,
    day                     DATE         NOT NULL,
    last_update             TIMESTAMPTZ  NOT NULL,
    total_logs_received     BIGINT       NOT NULL,
    last_pack_voltage_mv    INTEGER,
    PRIMARY KEY (site_id, day)
);

CREATE INDEX IF NOT EXISTS idx_battery_daily_summary_day
    ON battery_daily_summary (day DESC);

CREATE OR REPLACE FUNCTION refresh_battery_daily_summary(
    p_from DATE DEFAULT NULL,
    p_to   DATE DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO battery_daily_summary (
        site_id,
        day,
        last_update,
        total_logs_received,
        last_pack_voltage_mv
    )
    SELECT
        site_id,
        (timestamp AT TIME ZONE 'UTC')::date AS day,
        MAX(timestamp) AS last_update,
        COUNT(*)::bigint AS total_logs_received,
        (
            array_agg(pack_voltage ORDER BY timestamp DESC)
            FILTER (WHERE pack_voltage IS NOT NULL)
        )[1] AS last_pack_voltage_mv
    FROM battery_data.battery_data_loggers
    WHERE (p_from IS NULL OR timestamp >= p_from::timestamptz)
      AND (p_to IS NULL OR timestamp < (p_to + 1)::date::timestamptz)
    GROUP BY site_id, (timestamp AT TIME ZONE 'UTC')::date
    ON CONFLICT (site_id, day) DO UPDATE SET
        last_update = EXCLUDED.last_update,
        total_logs_received = EXCLUDED.total_logs_received,
        last_pack_voltage_mv = EXCLUDED.last_pack_voltage_mv;
END;
$$;

-- Backfill semua hari yang ada di hypertable
SELECT refresh_battery_daily_summary(NULL, NULL);
