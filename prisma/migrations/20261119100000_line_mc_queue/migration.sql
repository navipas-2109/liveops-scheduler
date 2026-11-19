-- CreateTable
CREATE TABLE "sheet_queues" (
    "key" TEXT NOT NULL,
    "mc_name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "bu" TEXT NOT NULL DEFAULT '',
    "sheet" TEXT NOT NULL DEFAULT '',
    "row" INTEGER NOT NULL DEFAULT 0,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheet_queues_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "mc_line_links" (
    "id" TEXT NOT NULL,
    "mc_name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "line_user_id" TEXT,
    "line_name" TEXT,
    "linked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mc_line_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_answers" (
    "key" TEXT NOT NULL,
    "mc_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_answers_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sheet_syncs" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "synced_at" TIMESTAMP(3) NOT NULL,
    "rows" INTEGER NOT NULL,
    "sheets" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "sheet_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sheet_queues_mc_name_date_idx" ON "sheet_queues"("mc_name", "date");

-- CreateIndex
CREATE UNIQUE INDEX "mc_line_links_mc_name_key" ON "mc_line_links"("mc_name");

-- CreateIndex
CREATE UNIQUE INDEX "mc_line_links_code_key" ON "mc_line_links"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mc_line_links_line_user_id_key" ON "mc_line_links"("line_user_id");

