-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "sla";

-- CreateEnum
CREATE TYPE "sla"."PicType" AS ENUM ('VSAT', 'POWER', 'SNMP');

-- CreateTable
CREATE TABLE "sla"."sla_bakti" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "pr_code" VARCHAR(50),
    "sla" DOUBLE PRECISION,
    "power_uptime" DOUBLE PRECISION,
    "power_downtime" DOUBLE PRECISION,
    "status_sla" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_bakti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla"."sla_report" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "pr_code" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla"."sla_report_problem" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "pic" VARCHAR(50),
    "problem" VARCHAR(255),
    "notes" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_report_problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla"."history_gamas" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_gamas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla"."sla_reason" (
    "id" SERIAL NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_reason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla"."battery_version_reason" (
    "id" SERIAL NOT NULL,
    "battery_version" VARCHAR(50) NOT NULL,
    "reason_id" INTEGER NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battery_version_reason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_sla_bakti_date" ON "sla"."sla_bakti"("date");

-- CreateIndex
CREATE INDEX "idx_sla_bakti_site_id" ON "sla"."sla_bakti"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "sla_bakti_site_id_date_key" ON "sla"."sla_bakti"("site_id", "date");

-- CreateIndex
CREATE INDEX "idx_sla_report_site_id" ON "sla"."sla_report"("site_id");

-- CreateIndex
CREATE INDEX "idx_sla_report_date" ON "sla"."sla_report"("date");

-- CreateIndex
CREATE INDEX "idx_sla_report_pr_code" ON "sla"."sla_report"("pr_code");

-- CreateIndex
CREATE UNIQUE INDEX "sla_report_site_id_date_key" ON "sla"."sla_report"("site_id", "date");

-- CreateIndex
CREATE INDEX "idx_sla_report_problem_report_id" ON "sla"."sla_report_problem"("report_id");

-- CreateIndex
CREATE INDEX "idx_sla_report_problem_pic" ON "sla"."sla_report_problem"("pic");

-- CreateIndex
CREATE INDEX "idx_history_gamas_date" ON "sla"."history_gamas"("date");

-- CreateIndex
CREATE UNIQUE INDEX "sla_reason_reason_key" ON "sla"."sla_reason"("reason");

-- CreateIndex
CREATE INDEX "idx_battery_version_reason_battery" ON "sla"."battery_version_reason"("battery_version");

-- CreateIndex
CREATE INDEX "idx_battery_version_reason_reason" ON "sla"."battery_version_reason"("reason_id");

-- CreateIndex
CREATE INDEX "idx_battery_version_reason_battery_period" ON "sla"."battery_version_reason"("battery_version", "period");

-- CreateIndex
CREATE UNIQUE INDEX "battery_version_reason_battery_version_reason_id_period_key" ON "sla"."battery_version_reason"("battery_version", "reason_id", "period");

-- AddForeignKey
ALTER TABLE "sla"."sla_report_problem" ADD CONSTRAINT "sla_report_problem_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "sla"."sla_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla"."battery_version_reason" ADD CONSTRAINT "battery_version_reason_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "sla"."sla_reason"("id") ON DELETE CASCADE ON UPDATE CASCADE;
