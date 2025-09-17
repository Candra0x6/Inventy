-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'STAFF', 'BORROWER');

-- CreateEnum
CREATE TYPE "public"."ItemCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."ItemStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'BORROWED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."ReservationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."DamageType" AS ENUM ('PHYSICAL', 'FUNCTIONAL', 'COSMETIC', 'MISSING_PARTS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DamageSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'TOTAL_LOSS');

-- CreateEnum
CREATE TYPE "public"."DamageReportStatus" AS ENUM ('REPORTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "image" TEXT,
    "email_verified" TIMESTAMP(3),
    "password" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'BORROWER',
    "trust_score" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "condition" "public"."ItemCondition" NOT NULL DEFAULT 'EXCELLENT',
    "status" "public"."ItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "serial_number" TEXT,
    "qr_code" TEXT,
    "barcode" TEXT,
    "images" TEXT[],
    "value" DOUBLE PRECISION,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reservations" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "actual_start_date" TIMESTAMP(3),
    "actual_end_date" TIMESTAMP(3),
    "status" "public"."ReservationStatus" NOT NULL DEFAULT 'PENDING',
    "purpose" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "pickup_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "pickup_confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."returns" (
    "id" TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "return_date" TIMESTAMP(3) NOT NULL,
    "condition_on_return" "public"."ItemCondition" NOT NULL,
    "status" "public"."ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "damage_report" TEXT,
    "damage_images" TEXT[],
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "penalty_applied" BOOLEAN NOT NULL DEFAULT false,
    "penalty_reason" TEXT,
    "penalty_amount" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."damage_reports" (
    "id" TEXT NOT NULL,
    "return_id" TEXT NOT NULL,
    "damage_type" "public"."DamageType" NOT NULL,
    "severity" "public"."DamageSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "damage_images" TEXT[],
    "estimated_repair_cost" DOUBLE PRECISION,
    "is_repairable" BOOLEAN,
    "affects_usability" BOOLEAN NOT NULL,
    "reported_by_user_id" TEXT NOT NULL,
    "witness_details" TEXT,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."DamageReportStatus" NOT NULL DEFAULT 'REPORTED',
    "admin_notes" TEXT,
    "repair_cost" DOUBLE PRECISION,
    "penalty_amount" DOUBLE PRECISION,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "resolution_date" TIMESTAMP(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reputation_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "change" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "previous_score" DOUBLE PRECISION NOT NULL,
    "new_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reputation_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "user_id" TEXT,
    "changes" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "public"."accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "public"."sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "public"."verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "public"."verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_trust_score_idx" ON "public"."users"("trust_score");

-- CreateIndex
CREATE UNIQUE INDEX "items_serial_number_key" ON "public"."items"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "items_qr_code_key" ON "public"."items"("qr_code");

-- CreateIndex
CREATE UNIQUE INDEX "items_barcode_key" ON "public"."items"("barcode");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "public"."items"("status");

-- CreateIndex
CREATE INDEX "items_category_idx" ON "public"."items"("category");

-- CreateIndex
CREATE INDEX "items_condition_idx" ON "public"."items"("condition");

-- CreateIndex
CREATE INDEX "items_created_at_idx" ON "public"."items"("created_at");

-- CreateIndex
CREATE INDEX "reservations_item_id_idx" ON "public"."reservations"("item_id");

-- CreateIndex
CREATE INDEX "reservations_user_id_idx" ON "public"."reservations"("user_id");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "public"."reservations"("status");

-- CreateIndex
CREATE INDEX "reservations_start_date_idx" ON "public"."reservations"("start_date");

-- CreateIndex
CREATE INDEX "reservations_end_date_idx" ON "public"."reservations"("end_date");

-- CreateIndex
CREATE INDEX "reservations_created_at_idx" ON "public"."reservations"("created_at");

-- CreateIndex
CREATE INDEX "returns_reservation_id_idx" ON "public"."returns"("reservation_id");

-- CreateIndex
CREATE INDEX "returns_item_id_idx" ON "public"."returns"("item_id");

-- CreateIndex
CREATE INDEX "returns_user_id_idx" ON "public"."returns"("user_id");

-- CreateIndex
CREATE INDEX "returns_status_idx" ON "public"."returns"("status");

-- CreateIndex
CREATE INDEX "returns_return_date_idx" ON "public"."returns"("return_date");

-- CreateIndex
CREATE INDEX "damage_reports_return_id_idx" ON "public"."damage_reports"("return_id");

-- CreateIndex
CREATE INDEX "damage_reports_reported_by_user_id_idx" ON "public"."damage_reports"("reported_by_user_id");

-- CreateIndex
CREATE INDEX "damage_reports_status_idx" ON "public"."damage_reports"("status");

-- CreateIndex
CREATE INDEX "damage_reports_severity_idx" ON "public"."damage_reports"("severity");

-- CreateIndex
CREATE INDEX "damage_reports_damage_type_idx" ON "public"."damage_reports"("damage_type");

-- CreateIndex
CREATE INDEX "damage_reports_incident_date_idx" ON "public"."damage_reports"("incident_date");

-- CreateIndex
CREATE INDEX "damage_reports_created_at_idx" ON "public"."damage_reports"("created_at");

-- CreateIndex
CREATE INDEX "reputation_histories_user_id_idx" ON "public"."reputation_histories"("user_id");

-- CreateIndex
CREATE INDEX "reputation_histories_created_at_idx" ON "public"."reputation_histories"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_idx" ON "public"."audit_logs"("entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_entity_id_idx" ON "public"."audit_logs"("entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "public"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."items" ADD CONSTRAINT "items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."returns" ADD CONSTRAINT "returns_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."returns" ADD CONSTRAINT "returns_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."returns" ADD CONSTRAINT "returns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."damage_reports" ADD CONSTRAINT "damage_reports_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."damage_reports" ADD CONSTRAINT "damage_reports_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."damage_reports" ADD CONSTRAINT "damage_reports_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reputation_histories" ADD CONSTRAINT "reputation_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
