-- CreateTable
CREATE TABLE "slot_locks" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "locked_by" TEXT NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_locks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "slot_locks_brand_id_month_key" ON "slot_locks"("brand_id", "month");

-- AddForeignKey
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_locks" ADD CONSTRAINT "slot_locks_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

