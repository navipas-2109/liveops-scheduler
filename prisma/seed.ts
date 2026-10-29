// Loads master data and starter accounts. Safe to run more than once:
// rows that already exist are kept, nothing is duplicated.

import { PrismaClient, type McStatus, type ProducerPosition, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BRAND_PLATFORM_RAW, MCS_RAW, PRODUCERS_RAW, ROOMS_RAW } from "./master-data";

const prisma = new PrismaClient();

const MC_STATUS: Record<string, McStatus> = {
  "Full-Time": "FULL_TIME",
  Exclusive: "EXCLUSIVE",
  Freelance: "FREELANCE",
  Trainee: "TRAINEE",
};

// Default pay: Full-Time and Exclusive per slot, Freelance and Trainee per hour.
const MC_PAY: Record<McStatus, { rateType: "PER_SLOT" | "PER_HOUR"; rate: number }> = {
  FULL_TIME: { rateType: "PER_SLOT", rate: 0 },
  EXCLUSIVE: { rateType: "PER_SLOT", rate: 8000 },
  FREELANCE: { rateType: "PER_HOUR", rate: 4000 },
  TRAINEE: { rateType: "PER_HOUR", rate: 2000 },
};

const POSITION: Record<string, ProducerPosition> = {
  "Producer Team Lead": "TEAM_LEAD",
  "Producer Lead": "TEAM_LEAD",
  "Senior Producer": "SENIOR",
  Producer: "PRODUCER",
  "Jr. Producer": "JR_PRODUCER",
};

// Each table is filled with one batched insert; rows that already exist are
// left as they are (they may have been edited in the app since).
async function seedRooms() {
  await prisma.room.createMany({
    data: ROOMS_RAW.map((r, i) => ({
      id: "R" + String(i + 1).padStart(2, "0"),
      building: r.building === "Witree" ? ("WITREE" as const) : ("RIPPLES_STUDIO" as const),
      floor: r.floor,
      roomNo: r.roomNo,
      size: r.size === "Large" ? ("LARGE" as const) : ("SMALL" as const),
      brandAssignment: r.brand,
      shortName: r.roomNo + (r.brand ? ` (${r.brand})` : ""),
      sortOrder: i + 1,
    })),
    skipDuplicates: true,
  });
}

async function seedMcs() {
  await prisma.mc.createMany({
    data: MCS_RAW.map((m) => {
      const status = MC_STATUS[m.status];
      return { nickname: m.nickname, fullName: m.fullName, status, ...MC_PAY[status] };
    }),
    skipDuplicates: true,
  });
}

async function seedProducers() {
  await prisma.producer.createMany({
    data: PRODUCERS_RAW.map((p) => ({ name: p.name, position: POSITION[p.position] })),
    skipDuplicates: true,
  });
}

async function seedBrands() {
  await prisma.brand.createMany({
    data: BRAND_PLATFORM_RAW.map((b) => ({ brandName: b.brand, platform: b.platform })),
    skipDuplicates: true,
  });
}

// One starter account per role, plus the three demo AEs from the prototype,
// each owning a third of the brands. Replace with real staff before go-live.
async function seedUsers() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) throw new Error("Set SEED_USER_PASSWORD in .env before seeding");
  const passwordHash = await bcrypt.hash(password, 10);

  const brandNames = [...new Set(BRAND_PLATFORM_RAW.map((b) => b.brand))].sort();
  const aeBrandNames = [brandNames.slice(0, 16), brandNames.slice(16, 32), brandNames.slice(32)];

  const users: { email: string; name: string; role: Role; brands?: string[] }[] = [
    { email: "manager@liveops.local", name: "Manager", role: "MANAGER" },
    { email: "planner@liveops.local", name: "Planner", role: "PLANNER" },
    { email: "operation@liveops.local", name: "Operation", role: "OPERATION" },
    { email: "ae1@liveops.local", name: "สมชาย", role: "AE", brands: aeBrandNames[0] },
    { email: "ae2@liveops.local", name: "วิไล", role: "AE", brands: aeBrandNames[1] },
    { email: "ae3@liveops.local", name: "อรรถ", role: "AE", brands: aeBrandNames[2] },
  ];

  const existing = new Set(
    (await prisma.user.findMany({ where: { email: { in: users.map((u) => u.email) } }, select: { email: true } })).map(
      (u) => u.email,
    ),
  );
  const allBrands = await prisma.brand.findMany({ select: { id: true, brandName: true } });
  for (const u of users) {
    if (existing.has(u.email)) continue;
    const brands = allBrands.filter((b) => u.brands?.includes(b.brandName)).map((b) => ({ id: b.id }));
    await prisma.user.create({
      data: { email: u.email, name: u.name, role: u.role, passwordHash, brands: { connect: brands } },
    });
  }
}

async function main() {
  await seedRooms();
  await seedMcs();
  await seedProducers();
  await seedBrands();
  await seedUsers();

  const counts = {
    rooms: await prisma.room.count(),
    mcs: await prisma.mc.count(),
    producers: await prisma.producer.count(),
    brands: await prisma.brand.count(),
    users: await prisma.user.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
