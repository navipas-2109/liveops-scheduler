-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MC';

-- AlterTable
ALTER TABLE "slots" ADD COLUMN     "mc_confirmed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mc_id" TEXT;

-- CreateTable
CREATE TABLE "shift_months" (
    "month" TEXT NOT NULL,
    "confirmed_by" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_months_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mc_id_key" ON "users"("mc_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mc_id_fkey" FOREIGN KEY ("mc_id") REFERENCES "mcs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_months" ADD CONSTRAINT "shift_months_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

