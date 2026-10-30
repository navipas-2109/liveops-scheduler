-- CreateEnum
CREATE TYPE "ShiftKind" AS ENUM ('live', 'office', 'off', 'leave');

-- AlterTable
ALTER TABLE "producers" ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "squad" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "code" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" "ShiftKind" NOT NULL DEFAULT 'live',
ALTER COLUMN "shift_start" DROP NOT NULL,
ALTER COLUMN "shift_end" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "producers_employee_id_key" ON "producers"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_producer_id_date_key" ON "shifts"("producer_id", "date");

