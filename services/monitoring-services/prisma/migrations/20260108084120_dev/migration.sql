-- CreateTable
CREATE TABLE "site_downtime" (
    "id" SERIAL NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "site_name" VARCHAR(255),
    "down_since" TIMESTAMPTZ NOT NULL,
    "down_seconds" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_downtime_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_downtime_site_id_key" ON "site_downtime"("site_id");

-- CreateIndex
CREATE INDEX "idx_site_downtime_site_id" ON "site_downtime"("site_id");

-- CreateIndex
CREATE INDEX "idx_site_downtime_down_since" ON "site_downtime"("down_since");
