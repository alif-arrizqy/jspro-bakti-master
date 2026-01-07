-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "battery_data";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "scc_data";

-- CreateTable
CREATE TABLE "battery_data"."battery_data_loggers" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "pr_code" VARCHAR(20),
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "battery_type" VARCHAR(50),
    "slave_id" INTEGER,
    "pcb_code" VARCHAR(50),
    "sn1_code" VARCHAR(50),
    "port" VARCHAR(20),
    "counter" INTEGER,
    "pack_voltage" INTEGER,
    "pack_current" INTEGER,
    "remaining_capacity" INTEGER,
    "average_cell_temperature" INTEGER,
    "environment_temperature" INTEGER,
    "soc" INTEGER,
    "soh" INTEGER,
    "full_capacity" INTEGER,
    "cycle_count" INTEGER,
    "cell_voltage_id" BIGINT,
    "max_cell_voltage" INTEGER,
    "min_cell_voltage" INTEGER,
    "cell_difference" INTEGER,
    "max_cell_temperature" INTEGER,
    "min_cell_temperature" INTEGER,
    "fet_temperature" INTEGER,
    "ambient_temperature" INTEGER,
    "remaining_charging_time" INTEGER,
    "remaining_discharging_time" INTEGER,
    "cell_temperature1" INTEGER,
    "cell_temperature2" INTEGER,
    "cell_temperature3" INTEGER,
    "warning_flag" TEXT[],
    "protect_flag" TEXT[],
    "fault_flag" TEXT[],
    "error_messages" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "battery_data_loggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battery_data"."cell_battery_data" (
    "id" BIGSERIAL NOT NULL,
    "cell1" INTEGER,
    "cell2" INTEGER,
    "cell3" INTEGER,
    "cell4" INTEGER,
    "cell5" INTEGER,
    "cell6" INTEGER,
    "cell7" INTEGER,
    "cell8" INTEGER,
    "cell9" INTEGER,
    "cell10" INTEGER,
    "cell11" INTEGER,
    "cell12" INTEGER,
    "cell13" INTEGER,
    "cell14" INTEGER,
    "cell15" INTEGER,
    "cell16" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cell_battery_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scc_data"."scc_data_loggers" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "pr_code" VARCHAR(20),
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "battery_voltage" DOUBLE PRECISION,
    "cpu_temp" INTEGER,
    "load1" DOUBLE PRECISION,
    "load2" DOUBLE PRECISION,
    "load3" DOUBLE PRECISION,
    "pv1_current" DOUBLE PRECISION,
    "pv2_current" DOUBLE PRECISION,
    "pv3_current" DOUBLE PRECISION,
    "pv1_voltage" DOUBLE PRECISION,
    "pv2_voltage" DOUBLE PRECISION,
    "pv3_voltage" DOUBLE PRECISION,
    "edl1" DOUBLE PRECISION,
    "edl2" DOUBLE PRECISION,
    "edl3" DOUBLE PRECISION,
    "eh1" DOUBLE PRECISION,
    "eh2" DOUBLE PRECISION,
    "eh3" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scc_data_loggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_battery_site_timestamp" ON "battery_data"."battery_data_loggers"("site_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_battery_site_slave" ON "battery_data"."battery_data_loggers"("site_id", "slave_id");

-- CreateIndex
CREATE INDEX "idx_battery_timestamp" ON "battery_data"."battery_data_loggers"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_scc_site_timestamp" ON "scc_data"."scc_data_loggers"("site_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_scc_timestamp" ON "scc_data"."scc_data_loggers"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "battery_data"."battery_data_loggers" ADD CONSTRAINT "battery_data_loggers_cell_voltage_id_fkey" FOREIGN KEY ("cell_voltage_id") REFERENCES "battery_data"."cell_battery_data"("id") ON DELETE SET NULL ON UPDATE CASCADE;
