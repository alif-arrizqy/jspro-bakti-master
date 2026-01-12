-- CreateTable
CREATE TABLE "site_up" (
    "id" SERIAL NOT NULL,
    "site_id" VARCHAR(50) NOT NULL,
    "site_name" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_up_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_up_site_id_key" ON "site_up"("site_id");

-- CreateIndex
CREATE INDEX "idx_site_up_site_id" ON "site_up"("site_id");
