-- CreateEnum
CREATE TYPE "StatusSites" AS ENUM ('terestrial', 'non_terestrial');

-- CreateEnum
CREATE TYPE "SccType" AS ENUM ('scc_srne', 'scc_epever');

-- CreateEnum
CREATE TYPE "BatteryVersion" AS ENUM ('talis5', 'mix', 'jspro');

-- CreateEnum
CREATE TYPE "EhubVersion" AS ENUM ('new', 'old');

-- CreateEnum
CREATE TYPE "Panel2Type" AS ENUM ('new', 'old');

-- CreateTable
CREATE TABLE "site_info" (
    "id" SERIAL NOT NULL,
    "pr_code" VARCHAR(50),
    "site_id" VARCHAR(50) NOT NULL,
    "cluster_id" VARCHAR(50),
    "terminal_id" VARCHAR(50),
    "site_name" VARCHAR(100) NOT NULL,
    "ip_site" VARCHAR(50),
    "ip_snmp" VARCHAR(50),
    "ip_mini_pc" VARCHAR(50),
    "webapp_url" VARCHAR(255),
    "ehub_version" "EhubVersion",
    "panel2_type" "Panel2Type",
    "scc_type" "SccType",
    "battery_version" "BatteryVersion",
    "total_battery" INTEGER DEFAULT 0,
    "status_sites" "StatusSites" NOT NULL DEFAULT 'non_terestrial',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_info_detail" (
    "id" SERIAL NOT NULL,
    "site_info_id" INTEGER NOT NULL,
    "village" VARCHAR(100),
    "subdistrict" VARCHAR(100),
    "regency" VARCHAR(100),
    "province" VARCHAR(100) NOT NULL,
    "longitude" DECIMAL(11,8),
    "latitude" DECIMAL(10,8),
    "ip_gateway_gs" VARCHAR(50),
    "ip_gateway_lc" VARCHAR(50),
    "subnet" VARCHAR(10),
    "battery_list" JSONB DEFAULT '[]',
    "cabinet_list" JSONB DEFAULT '[]',
    "build_year" VARCHAR(20),
    "project_phase" VARCHAR(100),
    "onair_date" DATE,
    "gs_sustain_date" DATE,
    "topo_sustain_date" DATE,
    "talis_installed" DATE,
    "provider_gs" VARCHAR(100),
    "beam_provider" VARCHAR(100),
    "cellular_operator" VARCHAR(50),
    "contact_person" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_info_detail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_info_pr_code_key" ON "site_info"("pr_code");

-- CreateIndex
CREATE UNIQUE INDEX "site_info_site_id_key" ON "site_info"("site_id");

-- CreateIndex
CREATE INDEX "idx_site_info_site_id" ON "site_info"("site_id");

-- CreateIndex
CREATE INDEX "idx_site_info_pr_code" ON "site_info"("pr_code");

-- CreateIndex
CREATE INDEX "idx_site_info_site_name" ON "site_info"("site_name");

-- CreateIndex
CREATE INDEX "idx_site_info_status" ON "site_info"("status_sites");

-- CreateIndex
CREATE INDEX "idx_site_info_scc_type" ON "site_info"("scc_type");

-- CreateIndex
CREATE INDEX "idx_site_info_battery_version" ON "site_info"("battery_version");

-- CreateIndex
CREATE INDEX "idx_site_info_ehub_version" ON "site_info"("ehub_version");

-- CreateIndex
CREATE INDEX "idx_site_info_is_active" ON "site_info"("is_active");

-- CreateIndex
CREATE INDEX "idx_site_info_site_status" ON "site_info"("site_id", "status_sites");

-- CreateIndex
CREATE INDEX "idx_site_info_status_active" ON "site_info"("status_sites", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "site_info_detail_site_info_id_key" ON "site_info_detail"("site_info_id");

-- CreateIndex
CREATE INDEX "idx_site_detail_province" ON "site_info_detail"("province");

-- CreateIndex
CREATE INDEX "idx_site_detail_regency" ON "site_info_detail"("regency");

-- CreateIndex
CREATE INDEX "idx_site_detail_subdistrict" ON "site_info_detail"("subdistrict");

-- CreateIndex
CREATE INDEX "idx_site_detail_build_year" ON "site_info_detail"("build_year");

-- CreateIndex
CREATE INDEX "idx_site_detail_project_phase" ON "site_info_detail"("project_phase");

-- CreateIndex
CREATE INDEX "idx_site_detail_provider_gs" ON "site_info_detail"("provider_gs");

-- CreateIndex
CREATE INDEX "idx_site_detail_beam_provider" ON "site_info_detail"("beam_provider");

-- CreateIndex
CREATE INDEX "idx_site_detail_cellular_operator" ON "site_info_detail"("cellular_operator");

-- CreateIndex
CREATE INDEX "idx_site_detail_onair_date" ON "site_info_detail"("onair_date");

-- CreateIndex
CREATE INDEX "idx_site_detail_location" ON "site_info_detail"("province", "regency");

-- AddForeignKey
ALTER TABLE "site_info_detail" ADD CONSTRAINT "site_info_detail_site_info_id_fkey" FOREIGN KEY ("site_info_id") REFERENCES "site_info"("id") ON DELETE CASCADE ON UPDATE CASCADE;
