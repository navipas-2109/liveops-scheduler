-- Buildings become a list the team can edit. Existing rooms keep their building.
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "buildings_name_key" ON "buildings"("name");

INSERT INTO "buildings" ("id", "name", "code", "sort_order") VALUES
    ('bld_ripples_studio', 'Ripples Studio', 'RS', 1),
    ('bld_witree', 'Witree', 'WT', 2);

ALTER TABLE "rooms" ADD COLUMN "building_id" TEXT;
UPDATE "rooms" SET "building_id" = CASE "building"::text WHEN 'Witree' THEN 'bld_witree' ELSE 'bld_ripples_studio' END;
ALTER TABLE "rooms" ALTER COLUMN "building_id" SET NOT NULL;
ALTER TABLE "rooms" DROP COLUMN "building";
DROP TYPE "Building";

ALTER TABLE "rooms" ADD CONSTRAINT "rooms_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
