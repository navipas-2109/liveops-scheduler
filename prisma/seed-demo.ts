// Fills months with sample slots for trying the app out.
//   npm run db:seed-demo -- 2026-10 2026-11        (skips months that have slots)
//   npm run db:seed-demo -- 2026-11 --reset        (deletes the month's slots first)
// Without arguments it uses SEED_DEMO_MONTHS, e.g. "2026-10,2026-11", and
// SEED_DEMO_RESET=1 to reload those months. Trial databases only: a reset
// deletes every slot in the month, real ones included.

import { PrismaClient, type Prisma, type SlotStatus } from "@prisma/client";
import { deriveSlotStatus, findConflicts } from "../src/domain/slot-rules";

const prisma = new PrismaClient();

// Small deterministic random generator so every run gives the same data.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];

async function seedMonth(month: string, reset: boolean) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m - 1, days));

  if (!reset && (await prisma.slot.count({ where: { date: { gte: from, lte: to } } })) > 0) {
    console.log(`Demo data: ${month} already has slots, skipped`);
    return;
  }

  const manager = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER" } });
  const aes = await prisma.user.findMany({ where: { role: "AE" }, include: { brands: true } });
  const rooms = await prisma.room.findMany({ orderBy: { sortOrder: "asc" }, take: 14 });
  const mcs = await prisma.mc.findMany({ take: 30 });
  const producers = await prisma.producer.findMany({ take: 20 });

  // Window: open from 10 days before the month until the 5th of the month.
  const openFrom = new Date(Date.UTC(y, m - 1, 1 - 10));
  await prisma.bookingWindow.upsert({
    where: { targetMonth: month },
    create: {
      targetMonth: month,
      openFrom,
      openTo: new Date(Date.UTC(y, m - 1, 5)),
      note: "ลงได้เฉพาะช่วงนี้เท่านั้น",
      createdById: manager.id,
    },
    update: {},
  });

  // Build the whole month in memory, then write it in one transaction so a
  // month is either fully loaded or not at all.
  const starts = [8, 10, 12, 14, 16, 18, 20, 22].map((h) => h * 60);
  const slots: Prisma.SlotCreateManyInput[] = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(Date.UTC(y, m - 1, d));
    const day: (Prisma.SlotCreateManyInput & { id: string; startMinute: number; endMinute: number; roomId: string; mcId: string | null })[] = [];
    for (const room of rooms) {
      for (const start of starts) {
        if (rand() > 0.32) continue;
        const ae = pick(aes);
        const withMc = rand() < 0.6;
        day.push({
          id: `demo-${month}-${d}-${room.id}-${start}`,
          date,
          startMinute: start,
          endMinute: start + 120,
          roomId: room.id,
          brandId: pick(ae.brands).id,
          aeId: ae.id,
          requirement: pick(["Beauty", "Fashion", "Skincare", "Lifestyle", ""]),
          campaign: pick(["", "", "Flash Sale", "Brand Day"]),
          mcId: withMc ? pick(mcs).id : null,
          producerId: rand() < 0.7 ? pick(producers).id : null,
          admin1Id: rand() < 0.7 ? pick(producers).id : null,
        });
      }
    }
    const checks = day.map((s) => ({ ...s, date: month }));
    for (const s of day) {
      const status = deriveSlotStatus("waiting", s.mcId, findConflicts({ ...s, date: month }, checks));
      slots.push({ ...s, status: status.toUpperCase() as SlotStatus });
    }
  }
  await prisma.$transaction([
    prisma.slot.deleteMany({ where: { date: { gte: from, lte: to } } }),
    prisma.slot.createMany({ data: slots }),
  ]);
  const created = slots.length;
  console.log(`Demo data: ${created} slots in ${month}, booking window open from ${openFrom.toISOString().slice(0, 10)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset") || process.env.SEED_DEMO_RESET === "1";
  const fromArgs = args.filter((a) => /^\d{4}-\d{2}$/.test(a));
  const months = fromArgs.length
    ? fromArgs
    : (process.env.SEED_DEMO_MONTHS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (months.length === 0) {
    console.log("Demo data: no months given, nothing to do");
    return;
  }
  for (const month of months) await seedMonth(month, reset);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
