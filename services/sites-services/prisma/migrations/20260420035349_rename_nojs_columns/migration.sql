/*
  Warnings:

  - You are about to drop the column `no_js` on the `site_info` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "site_info" DROP COLUMN "no_js",
ADD COLUMN     "nojs" VARCHAR(10);
