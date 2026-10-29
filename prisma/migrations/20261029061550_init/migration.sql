-- CreateEnum
CREATE TYPE "Role" AS ENUM ('AE', 'PLANNER', 'OPERATION', 'MANAGER');

-- CreateEnum
CREATE TYPE "Building" AS ENUM ('Ripples Studio', 'Witree');

-- CreateEnum
CREATE TYPE "RoomSize" AS ENUM ('Large', 'Small');

-- CreateEnum
CREATE TYPE "McStatus" AS ENUM ('Full-Time', 'Exclusive', 'Freelance', 'Trainee');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('per_slot', 'per_hour');

-- CreateEnum
CREATE TYPE "ProducerPosition" AS ENUM ('Producer Team Lead', 'Senior Producer', 'Producer', 'Jr. Producer');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('empty', 'waiting', 'confirmed', 'conflict', 'completed');

-- CreateEnum
CREATE TYPE "LateReason" AS ENUM ('normal', 'late', 'technical');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'locked');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "building" "Building" NOT NULL,
    "floor" INTEGER NOT NULL,
    "room_no" TEXT NOT NULL,
    "size" "RoomSize" NOT NULL,
    "brand_assignment" TEXT NOT NULL DEFAULT '',
    "short_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcs" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" "McStatus" NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "rate" INTEGER NOT NULL,

    CONSTRAINT "mcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" "ProducerPosition" NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "brand_name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_windows" (
    "id" TEXT NOT NULL,
    "target_month" TEXT NOT NULL,
    "open_from" DATE NOT NULL,
    "open_to" DATE NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_windows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "room_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "campaign" TEXT NOT NULL DEFAULT '',
    "requirement" TEXT NOT NULL DEFAULT '',
    "ae_id" TEXT NOT NULL,
    "mc_id" TEXT,
    "planner_id" TEXT,
    "producer_id" TEXT,
    "admin1_id" TEXT,
    "admin2_id" TEXT,
    "status" "SlotStatus" NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "slot_id" TEXT NOT NULL,
    "actual_start" INTEGER NOT NULL,
    "actual_end" INTEGER NOT NULL,
    "late_reason" "LateReason" NOT NULL DEFAULT 'normal',
    "note" TEXT NOT NULL DEFAULT '',
    "base_pay" INTEGER NOT NULL,
    "deduction" INTEGER NOT NULL,
    "ot_pay" INTEGER NOT NULL,
    "final_pay" INTEGER NOT NULL,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift_start" INTEGER NOT NULL,
    "shift_end" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserBrands" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserBrands_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mcs_nickname_key" ON "mcs"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "producers_name_key" ON "producers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_brand_name_platform_key" ON "brands"("brand_name", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "booking_windows_target_month_key" ON "booking_windows"("target_month");

-- CreateIndex
CREATE INDEX "slots_date_room_id_idx" ON "slots"("date", "room_id");

-- CreateIndex
CREATE INDEX "slots_date_mc_id_idx" ON "slots"("date", "mc_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_slot_id_key" ON "payments"("slot_id");

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- CreateIndex
CREATE INDEX "_UserBrands_B_index" ON "_UserBrands"("B");

-- AddForeignKey
ALTER TABLE "booking_windows" ADD CONSTRAINT "booking_windows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_ae_id_fkey" FOREIGN KEY ("ae_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "mcs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_admin1_id_fkey" FOREIGN KEY ("admin1_id") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_admin2_id_fkey" FOREIGN KEY ("admin2_id") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBrands" ADD CONSTRAINT "_UserBrands_A_fkey" FOREIGN KEY ("A") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBrands" ADD CONSTRAINT "_UserBrands_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
