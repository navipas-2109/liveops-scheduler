-- CreateTable
CREATE TABLE "brand_plans" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "plan_minutes" INTEGER NOT NULL,
    "remark" TEXT NOT NULL DEFAULT '',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brand_plans_brand_id_month_key" ON "brand_plans"("brand_id", "month");

-- AddForeignKey
ALTER TABLE "brand_plans" ADD CONSTRAINT "brand_plans_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_plans" ADD CONSTRAINT "brand_plans_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

