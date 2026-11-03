-- CreateTable
CREATE TABLE "pd_blocks" (
    "id" TEXT NOT NULL,
    "producer_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pd_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pd_blocks_date_idx" ON "pd_blocks"("date");

-- AddForeignKey
ALTER TABLE "pd_blocks" ADD CONSTRAINT "pd_blocks_producer_id_fkey" FOREIGN KEY ("producer_id") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pd_blocks" ADD CONSTRAINT "pd_blocks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

