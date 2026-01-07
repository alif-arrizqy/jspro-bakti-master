-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "mqtt_collector";

-- CreateEnum
CREATE TYPE "mqtt_collector"."message_status" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "mqtt_collector"."mqtt_messages" (
    "id" BIGSERIAL NOT NULL,
    "site_id" VARCHAR(20) NOT NULL,
    "data_type" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "message_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "status" "mqtt_collector"."message_status" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "mqtt_topic" VARCHAR(255),
    "host" VARCHAR(255),

    CONSTRAINT "mqtt_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_status_pending" ON "mqtt_collector"."mqtt_messages"("status", "received_at");

-- CreateIndex
CREATE INDEX "idx_status_failed" ON "mqtt_collector"."mqtt_messages"("status", "retry_count");

-- CreateIndex
CREATE INDEX "idx_site_id" ON "mqtt_collector"."mqtt_messages"("site_id");

-- CreateIndex
CREATE INDEX "idx_received_at" ON "mqtt_collector"."mqtt_messages"("received_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cleanup" ON "mqtt_collector"."mqtt_messages"("processed_at", "status");
