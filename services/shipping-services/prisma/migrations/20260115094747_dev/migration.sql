-- CreateEnum
CREATE TYPE "Province" AS ENUM ('PAPUA_BARAT', 'PAPUA_BARAT_DAYA', 'PAPUA_SELATAN', 'PAPUA', 'MALUKU', 'MALUKU_UTARA');

-- CreateEnum
CREATE TYPE "ShippingStatus" AS ENUM ('REQUEST_GUDANG', 'PROSES_KIRIM', 'SELESAI');

-- CreateTable
CREATE TABLE "address" (
    "id" SERIAL NOT NULL,
    "province" "Province" NOT NULL,
    "cluster" VARCHAR(50),
    "address_shipping" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_master" (
    "id" SERIAL NOT NULL,
    "problem_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_spare_part" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "address_id" INTEGER NOT NULL,
    "sparepart_note" TEXT,
    "problem_id" INTEGER NOT NULL,
    "ticket_number" VARCHAR(50),
    "ticket_image" TEXT,
    "status" "ShippingStatus" NOT NULL,
    "resi_number" VARCHAR(100),
    "resi_image" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_spare_part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retur_spare_part" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "shipper" VARCHAR(50) NOT NULL,
    "source_spare_part" VARCHAR(100) NOT NULL,
    "list_spare_part" JSONB,
    "image" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retur_spare_part_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_address_province" ON "address"("province");

-- CreateIndex
CREATE INDEX "idx_address_cluster" ON "address"("cluster");

-- CreateIndex
CREATE INDEX "idx_problem_master_problem_name" ON "problem_master"("problem_name");

-- CreateIndex
CREATE INDEX "idx_sla_bakti_date" ON "shipping_spare_part"("date");

-- CreateIndex
CREATE INDEX "idx_sla_bakti_site_id" ON "shipping_spare_part"("site_id");

-- CreateIndex
CREATE INDEX "idx_sla_bakti_problem_id" ON "shipping_spare_part"("problem_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_spare_part_site_id_date_key" ON "shipping_spare_part"("site_id", "date");

-- CreateIndex
CREATE INDEX "idx_retur_spare_part_date" ON "retur_spare_part"("date");

-- CreateIndex
CREATE INDEX "idx_retur_spare_part_shipper" ON "retur_spare_part"("shipper");

-- AddForeignKey
ALTER TABLE "shipping_spare_part" ADD CONSTRAINT "shipping_spare_part_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_spare_part" ADD CONSTRAINT "shipping_spare_part_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problem_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
