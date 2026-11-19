import { connection } from "next/server";
import { prisma } from "@/infrastructure/prisma";

// Open /api/health to see whether the app can reach its database.
export async function GET() {
  await connection(); // check on every request, never at build time
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "up", ms: Date.now() - started });
  } catch {
    return Response.json({ ok: false, database: "unreachable", ms: Date.now() - started }, { status: 503 });
  }
}
