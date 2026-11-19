import { PrismaClient } from "@prisma/client";

// A free serverless database (e.g. Neon) sleeps when idle and takes a moment
// to wake on the first query, so allow a longer connect timeout than Prisma's
// 5 seconds unless the connection string already sets one.
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "connect_timeout=20";
}

// Reuse one client across hot reloads in development so connections don't pile up.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
