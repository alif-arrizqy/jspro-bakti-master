/*
  Warnings:

  - You are about to drop the column `cluster_id` on the `site_info` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('migrated', 'non_migrated');

-- AlterTable
ALTER TABLE "site_info" DROP COLUMN "cluster_id",
ADD COLUMN     "migration_status" "MigrationStatus" NOT NULL DEFAULT 'non_migrated';

-- CreateIndex
CREATE INDEX "idx_site_info_migration_status" ON "site_info"("migration_status");
