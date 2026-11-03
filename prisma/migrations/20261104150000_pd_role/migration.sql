-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "producer_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_producer_id_key" ON "users"("producer_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

