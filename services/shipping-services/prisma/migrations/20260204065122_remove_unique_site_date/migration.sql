-- DropIndex
DROP INDEX "shipping_spare_part_site_id_date_key";

-- CreateIndex
CREATE INDEX "idx_sla_bakti_site_date" ON "shipping_spare_part"("site_id", "date");
