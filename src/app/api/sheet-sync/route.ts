import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import type { RawSheetRow } from "@/domain/sheet-queue";
import { services } from "@/di/container";

// Called by the Apps Script in the team's Google Sheet, with the shared
// secret SHEET_SYNC_SECRET as a Bearer token.
//   POST { rows: [...] }  → replace the queues with the sheet's rows
//   GET                   → every queue with its MC answer, for the sheet

function authorized(req: Request): boolean {
  const secret = process.env.SHEET_SYNC_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v).slice(0, 300) : "");

export async function POST(req: Request) {
  await connection();
  if (!authorized(req)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: { rows?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) return Response.json({ ok: false, error: "rows must be an array" }, { status: 400 });
  const rows: RawSheetRow[] = body.rows.map((r: Record<string, unknown>) => ({
    sheet: text(r?.sheet),
    row: Number(r?.row) || 0,
    mc: text(r?.mc),
    brand: text(r?.brand),
    channel: text(r?.channel),
    date: text(r?.date),
    start: text(r?.start),
    end: text(r?.end),
    note: text(r?.note),
    bu: text(r?.bu),
  }));
  const result = await services.syncSheet(rows);
  if (!result.ok) return Response.json(result, { status: 422 });
  return Response.json({ ok: true, queues: result.value.queues, skipped: result.value.skipped.slice(0, 200) });
}

export async function GET(req: Request) {
  await connection();
  if (!authorized(req)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return Response.json({ ok: true, rows: await services.answersForSheet() });
}
